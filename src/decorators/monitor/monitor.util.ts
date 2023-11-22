// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
	Context,
	type Span,
	SpanKind,
	SpanOptions,
	SpanStatusCode,
	context,
	diag,
	trace,
} from "@opentelemetry/api";

function isPromise<Return>(p: Promise<Return> | Return): p is Promise<Return> {
	return (
		typeof p === "object" &&
		p !== null &&
		typeof (p as Promise<Return>).then === "function"
	);
}

export interface BuildReplacementMethodOptions {
	methodName: string;
	target: unknown;
	headMessage?: string;
}

export interface MonitorMethodOptions {
	methodName: string;
	className: string;
	tracerName?: string;
	spanKind?: SpanKind;
}

export interface MonitorMethodMetadata {
	methodName: string;
	className: string;
	spanKind: SpanKind;
}

// biome-ignore lint/suspicious/noExplicitAny: genuine function definition
export type GenericFunction = (...args: any[]) => any;

export interface MonitorMethodCallInputs<Method extends GenericFunction> {
	thisArg: ThisParameterType<Method>;
	args: Parameters<Method>;
}

export class MonitorMethod<Method extends GenericFunction> {
	#method: Method;
	#metadata: MonitorMethodMetadata;
	#tracer: string;

	constructor(options: MonitorMethodOptions, method: Method) {
		this.#method = method;
		this.#metadata = {
			methodName: options.methodName,
			className: options.className,
			spanKind: options.spanKind ?? SpanKind.INTERNAL,
		};
		this.#tracer = options.tracerName ?? "default";
	}

	#init(inputs: MonitorMethodCallInputs<Method>, activeContext: Context): Span {
		debug(`entering method '${this.#metadata.methodName}'.`);
		const spanOptions: SpanOptions = {
			kind: this.#metadata.spanKind,
		};
		const spanName = `${this.#metadata.className}.${this.#metadata.methodName}`;
		const span = trace
			.getTracer(this.#tracer)
			.startSpan(spanName, spanOptions, activeContext);
		span.setAttribute("monitoring.method", this.#metadata.methodName);
		span.setAttribute("monitoring.class", this.#metadata.className);
		return span;
	}

	#onResult(
		inputs: MonitorMethodCallInputs<Method>,
		span: Span,
		result: ReturnType<Method>,
	): void {
		debug(
			`method call successfully completed: '${this.#metadata.methodName}'.`,
		);
		span.setStatus({ code: SpanStatusCode.OK });
	}

	#onError(
		inputs: MonitorMethodCallInputs<Method>,
		span: Span,
		error: unknown,
	): void {
		debug(`an error occurred: '${this.#metadata.methodName}'.`);
		span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
	}

	#cleanup(inputs: MonitorMethodCallInputs<Method>, span: Span): void {
		debug(`exiting method '${this.#metadata.methodName}'.`);
		span.end();
	}

	#replacementMethod(): Method {
		const monitorThis: typeof this = this;
		function replacementMethod(
			this: ThisParameterType<Method>,
			...args: Parameters<Method>
		) {
			const inputs: MonitorMethodCallInputs<Method> = { thisArg: this, args };
			const activeContext = context.active();
			const parentSpan = trace.getActiveSpan();
			if (!parentSpan) {
				debug(
					`no parent span found, not monitoring '${monitorThis.#metadata.methodName}'.`,
				);
				return monitorThis.#method.call(this, ...args);
			}
			const span = monitorThis.#init(inputs, activeContext);
			const nestedContext = trace.setSpan(activeContext, span);

			let result: ReturnType<Method> | Promise<ReturnType<Method>> =
				undefined as unknown as ReturnType<Method>;
			try {
				result = context.with(
					nestedContext,
					monitorThis.#method,
					this,
					...args,
				);
				if (isPromise(result)) {
					return result
						.then((data) => {
							monitorThis.#onResult(inputs, span, data);
							return data;
						})
						.catch((error) => {
							monitorThis.#onError(inputs, span, error);
							throw error;
						})
						.finally(() => {
							monitorThis.#cleanup(inputs, span);
						});
				}

				monitorThis.#onResult(inputs, span, result);
				return result;
			} catch (error: unknown) {
				monitorThis.#onError(inputs, span, error);
				throw error;
				// There appears to be a weird bug in the coverage report, so adding this here for now
				/* c8 ignore start */
			} finally {
				/* c8 ignore stop */
				if (!isPromise(result)) {
					monitorThis.#cleanup(inputs, span);
				}
			}
		}
		return replacementMethod as Method;
	}

	public build(): Method {
		const replacementMethod = this.#replacementMethod();
		Object.defineProperty(replacementMethod, "name", {
			value: `${this.#metadata.methodName}WithSpan`,
			writable: false,
		});
		return replacementMethod;
	}
}

export function debug(message: string): void {
	diag.debug(`[NLT_MON] ${message}`);
}

export function shouldMonitorMethod(
	methodName: string,
	allowedMethods?: string[] | RegExp | ((method: string) => boolean),
): boolean {
	if (typeof allowedMethods === "undefined") {
		return true;
	}

	if (typeof allowedMethods === "function") {
		return allowedMethods(methodName);
	}

	if (Array.isArray(allowedMethods)) {
		return allowedMethods.includes(methodName);
	}

	return allowedMethods.test(methodName);
}
