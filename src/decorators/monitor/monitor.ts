// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { SpanKind } from "@opentelemetry/api";
import { MonitorMethod, shouldMonitorMethod } from "./monitor.util";

export type MonitorDecorator = DecoratorContext;

export type Constructor = new (...args: unknown[]) => unknown;

export type Target = Record<string, unknown>;

export interface MonitorOptions {
	/**
	 * Name of the class to be monitored. If not provided, the class name will be automatically inferred.
	 */
	className?: string;
	/**
	 * Name of the tracer to be used. If not provided, the default tracer will be used.
	 */
	tracerName?: string;
	/**
	 * List of methods, regex or function filter that determines an allow-list for methods which will be monitored.
	 * By default, all non-private methods will be monitored.
	 */
	allowedMethods?: string[] | RegExp | ((method: string) => boolean);
	/**
	 * The Span Kind to be used for the span. If not provided, the default span kind of `INTERNAL` will be used.
	 */
	spanKind?: SpanKind;
}

/**
 * Decorator to monitor a class method.
 * By default, it monitors all methods of the class provided
 * they are in the context of a span. Nested calls will use the newly
 * context for the method in question.
 * It will **not** monitor methods if they not called in the
 * context of a span.
 *
 * @examples
 * ```typescript
 * \@Monitor()
 * class Service {
 *   // This method will be monitored
 *   hello(): void {}
 * }
 * ```
 */
export function Monitor(options?: MonitorOptions) {
	function actualDecorator(
		target: Function,
		context: ClassDecoratorContext,
	): void;
	function actualDecorator<TFunction extends Function>(
		target: TFunction,
	): TFunction | void;
	function actualDecorator<TFunction extends Function>(
		target: TFunction,
		_context?: ClassDecoratorContext,
	): TFunction | void {
		for (const propertyName of Object.getOwnPropertyNames(target.prototype)) {
			const descriptor = Object.getOwnPropertyDescriptor(
				target.prototype,
				propertyName,
			);
			if (
				propertyName !== "constructor" &&
				descriptor &&
				shouldMonitorMethod(propertyName, options?.allowedMethods)
			) {
				const monitorMethod = new MonitorMethod(
					{
						methodName: propertyName,
						className: options?.className ?? target.name,
						tracerName: options?.tracerName,
						spanKind: options?.spanKind,
					},
					descriptor.value,
				);
				descriptor.value = monitorMethod.build();
				Object.defineProperty(target.prototype, propertyName, descriptor);
			}
		}
	}
	return actualDecorator;
}
