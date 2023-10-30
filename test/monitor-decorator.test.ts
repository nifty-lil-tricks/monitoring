// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { SpanKind, SpanStatusCode, context, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { ExportResultCode, type ExportResult } from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";
import {
	BasicTracerProvider,
	ReadableSpan,
	SimpleSpanProcessor,
	type SpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import * as t from "tap";
import { Monitor } from "../src";
import { withCtx } from "./utils";

@Monitor()
class Service {
	root(): void {
		this.method();
	}

	method(): void {}

	#privateMethod(): void {}

	callPrivateMethod(): void {
		this.#privateMethod();
	}

	async rootAsync(): Promise<void> {
		return this.methodAsync();
	}

	async methodAsync(): Promise<void> {
		return Promise.resolve();
	}

	error(): never {
		throw new Error("error");
	}

	rootError(): never {
		this.error();
	}

	async asyncError(): Promise<never> {
		throw new Error("asyncError");
	}

	async rootAsyncError(): Promise<never> {
		return this.asyncError();
	}
}

t.test("Monitor", (t) => {
	let mockExporter: SpanExporter;
	let service: Service;
	let recordedSpans: ReadableSpan[];
	const serviceClassName = "Service";
	let provider: BasicTracerProvider;

	class MockExporter {
		export(
			spans: ReadableSpan[],
			resultCallback: (result: ExportResult) => void,
		) {
			const result: ExportResult = {
				code: ExportResultCode.SUCCESS,
			};
			recordedSpans.push(...spans);
			resultCallback(result);
		}
		async shutdown(): Promise<void> {}
	}

	t.before(() => {
		provider = new BasicTracerProvider({
			resource: new Resource({
				[SemanticResourceAttributes.SERVICE_NAME]: "basic-example",
			}),
		});
		mockExporter = new MockExporter();
		context.setGlobalContextManager(new AsyncLocalStorageContextManager());
		provider.addSpanProcessor(new SimpleSpanProcessor(mockExporter));
		provider.register();
	});

	t.teardown(async () => {
		await provider.shutdown();
	});

	t.beforeEach(() => {
		recordedSpans = [];
		service = new Service();
	});

	t.test("should wrap a method", async (t) => {
		// Act
		const parentSpan = await withCtx(() => service.method());
		parentSpan.end();
		const [recordedSpan, recordedParentSpan] = recordedSpans;

		// Assert
		t.equal(recordedSpans.length, 2);
		t.equal(recordedSpan.name, "Service.method");
		t.equal(recordedSpan.kind, SpanKind.INTERNAL);
		t.strictSame(recordedSpan.status, { code: SpanStatusCode.OK });
		t.same(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "method",
		});
		t.equal(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		t.equal(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	t.test("should wrap an async method", async (t) => {
		// Act
		const parentSpan = await withCtx(() => service.methodAsync());
		parentSpan.end();
		const [recordedSpan, recordedParentSpan] = recordedSpans;

		// Assert
		t.equal(recordedSpans.length, 2);
		t.equal(recordedSpan.name, "Service.methodAsync");
		t.strictSame(recordedSpan.status, { code: SpanStatusCode.OK });
		t.strictSame(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "methodAsync",
		});
		t.equal(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		t.equal(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	t.test("should wrap a nested method", async (t) => {
		// Act
		const parentSpan = await withCtx(() => service.root());
		parentSpan.end();
		const [nestedRecordedSpan, recordedSpan, recordedParentSpan] =
			recordedSpans;

		// Assert
		t.equal(recordedSpans.length, 3);
		// Nested span
		t.equal(nestedRecordedSpan.name, "Service.method");
		t.strictSame(nestedRecordedSpan.status, { code: SpanStatusCode.OK });
		t.strictSame(nestedRecordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "method",
		});
		t.equal(nestedRecordedSpan.parentSpanId, recordedSpan.spanContext().spanId);
		// Recorded span
		t.equal(recordedSpan.name, "Service.root");
		t.strictSame(recordedSpan.status, { code: SpanStatusCode.OK });
		t.strictSame(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "root",
		});
		t.equal(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		t.equal(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	t.test("should wrap a nested async method", async (t) => {
		// Act
		const parentSpan = await withCtx(() => service.rootAsync());
		parentSpan.end();
		const [nestedRecordedSpan, recordedSpan, recordedParentSpan] =
			recordedSpans;

		// Assert
		t.equal(recordedSpans.length, 3);
		// Nested span
		t.equal(nestedRecordedSpan.name, "Service.methodAsync");
		t.strictSame(nestedRecordedSpan.status, { code: SpanStatusCode.OK });
		t.strictSame(nestedRecordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "methodAsync",
		});
		t.equal(nestedRecordedSpan.parentSpanId, recordedSpan.spanContext().spanId);
		// Recorded span
		t.equal(recordedSpan.name, "Service.rootAsync");
		t.strictSame(recordedSpan.status, { code: SpanStatusCode.OK });
		t.strictSame(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "rootAsync",
		});
		t.equal(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		t.equal(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	t.test("should wrap multiple methods", async (t) => {
		// Arrange
		const tracer = trace.getTracer("defaults");
		const parentSpan = tracer.startSpan("basic-root");
		const ctx = trace.setSpan(context.active(), parentSpan);

		// Act
		await context.with(ctx, () => service.rootAsync());
		await context.with(ctx, () => service.method());
		parentSpan.end();
		const [
			nestedRecordedSpan,
			recordedSpan1,
			recordedSpan2,
			recordedParentSpan,
		] = recordedSpans;

		// Assert
		t.equal(recordedSpans.length, 4);
		// Nested span
		t.equal(nestedRecordedSpan.name, "Service.methodAsync");
		t.strictSame(nestedRecordedSpan.status, { code: SpanStatusCode.OK });
		t.strictSame(nestedRecordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "methodAsync",
		});
		t.equal(
			nestedRecordedSpan.parentSpanId,
			recordedSpan1.spanContext().spanId,
		);
		// Recorded span 1
		t.equal(recordedSpan1.name, "Service.rootAsync");
		t.strictSame(recordedSpan1.status, { code: SpanStatusCode.OK });
		t.strictSame(recordedSpan1.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "rootAsync",
		});
		// Recorded span 2
		t.equal(recordedSpan2.name, "Service.method");
		t.strictSame(recordedSpan2.status, { code: SpanStatusCode.OK });
		t.strictSame(recordedSpan2.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "method",
		});
		t.equal(recordedSpan2.parentSpanId, parentSpan.spanContext().spanId);
		t.equal(recordedSpan1.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		t.equal(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	t.test("should correctly handle errors", async (t) => {
		// Arrange
		const tracer = trace.getTracer("defaults");
		const parentSpan = tracer.startSpan("basic-root");

		// Act & Assert
		t.rejects(
			withCtx(() => service.error(), parentSpan),
			new Error("error"),
		);
		parentSpan.end();
		t.equal(recordedSpans.length, 2);
		const [recordedSpan, recordedParentSpan] = recordedSpans;
		// Recorded span
		t.equal(recordedSpan.name, "Service.error");
		t.strictSame(recordedSpan.status, {
			code: SpanStatusCode.ERROR,
			message: "Error: error",
		});
		t.strictSame(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "error",
		});
		t.equal(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		t.equal(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	t.test("should correctly handle nested errors", async (t) => {
		// Arrange
		const tracer = trace.getTracer("defaults");
		const parentSpan = tracer.startSpan("basic-root");

		// Act & Assert
		t.rejects(
			withCtx(() => service.rootError(), parentSpan),
			new Error("error"),
		);
		parentSpan.end();

		t.equal(recordedSpans.length, 3);
		const [nestedRecordedSpan, recordedSpan, recordedParentSpan] =
			recordedSpans;
		// Nested span
		t.equal(nestedRecordedSpan.name, "Service.error");
		t.strictSame(nestedRecordedSpan.status, {
			code: SpanStatusCode.ERROR,
			message: "Error: error",
		});
		t.strictSame(nestedRecordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "error",
		});
		t.equal(nestedRecordedSpan.parentSpanId, recordedSpan.spanContext().spanId);
		// Recorded span
		t.equal(recordedSpan.name, "Service.rootError");
		t.strictSame(recordedSpan.status, {
			code: SpanStatusCode.ERROR,
			message: "Error: error",
		});
		t.strictSame(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "rootError",
		});
		t.equal(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		t.equal(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	t.test("should correctly handle async errors", async (t) => {
		// Arrange
		const tracer = trace.getTracer("defaults");
		const parentSpan = tracer.startSpan("basic-root");

		// Act & Assert
		await t.rejects(
			withCtx(() => service.asyncError(), parentSpan),
			new Error("asyncError"),
		);
		parentSpan.end();
		t.equal(recordedSpans.length, 2);
		const [recordedSpan, recordedParentSpan] = recordedSpans;
		// Recorded span
		t.equal(recordedSpan.name, "Service.asyncError");
		t.strictSame(recordedSpan.status, {
			code: SpanStatusCode.ERROR,
			message: "Error: asyncError",
		});
		t.strictSame(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "asyncError",
		});
		t.equal(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		t.equal(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	t.test("should correctly handle nested async errors", async (t) => {
		// Arrange
		const tracer = trace.getTracer("defaults");
		const parentSpan = tracer.startSpan("basic-root");

		// Act & Assert
		await t.rejects(
			withCtx(() => service.rootAsyncError(), parentSpan),
			new Error("asyncError"),
		);
		parentSpan.end();
		t.equal(recordedSpans.length, 3);
		const [nestedRecordedSpan, recordedSpan, recordedParentSpan] =
			recordedSpans;
		// Nested span
		t.equal(nestedRecordedSpan.name, "Service.asyncError");
		t.strictSame(recordedSpan.status, {
			code: SpanStatusCode.ERROR,
			message: "Error: asyncError",
		});
		t.strictSame(nestedRecordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "asyncError",
		});
		t.equal(nestedRecordedSpan.parentSpanId, recordedSpan.spanContext().spanId);
		// Recorded span
		t.equal(recordedSpan.name, "Service.rootAsyncError");
		t.strictSame(recordedSpan.status, {
			code: SpanStatusCode.ERROR,
			message: "Error: asyncError",
		});
		t.strictSame(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "rootAsyncError",
		});
		t.equal(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		t.equal(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	t.test("should override the inferred class name if provided", async (t) => {
		// Act
		const serviceClassName = "ServiceOverride";
		@Monitor({ className: serviceClassName })
		class Service {
			method(): void {}
		}
		const service = new Service();
		const parentSpan = await withCtx(() => service.method());
		parentSpan.end();
		const [recordedSpan, recordedParentSpan] = recordedSpans;

		// Assert
		t.equal(recordedSpans.length, 2);
		t.equal(recordedSpan.name, `${serviceClassName}.method`);
		t.strictSame(recordedSpan.status, { code: SpanStatusCode.OK });
		t.strictSame(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "method",
		});
		t.equal(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		t.equal(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	t.test("should override the span kind if provided", async (t) => {
		// Act
		const spanKind = SpanKind.SERVER;
		@Monitor({ spanKind: SpanKind.SERVER })
		class Service {
			method(): void {}
		}
		const service = new Service();
		const parentSpan = await withCtx(() => service.method());
		parentSpan.end();
		const [recordedSpan, recordedParentSpan] = recordedSpans;

		// Assert
		t.equal(recordedSpans.length, 2);
		t.equal(recordedSpan.name, `${serviceClassName}.method`);
		t.equal(recordedSpan.kind, spanKind);
		t.strictSame(recordedSpan.status, { code: SpanStatusCode.OK });
		t.strictSame(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "method",
		});
		t.equal(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		t.equal(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	t.test("should override the default tracer if provided", async (t) => {
		// Act
		const tracerName = "another-tracer";
		@Monitor({ tracerName })
		class Service {
			method(): void {}
		}
		const tracer = trace.getTracer(tracerName);
		const parentSpan = tracer.startSpan("basic-root");
		const ctx = trace.setSpan(context.active(), parentSpan);
		const service = new Service();

		// Act
		await context.with(ctx, () => service.method());
		parentSpan.end();
		const [recordedSpan, recordedParentSpan] = recordedSpans;

		// Assert
		t.equal(recordedSpans.length, 2);
		t.equal(recordedSpan.name, "Service.method");
		t.strictSame(recordedSpan.status, { code: SpanStatusCode.OK });
		t.strictSame(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "method",
		});
		t.equal(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		t.equal(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	t.test("should not monitor if no parent spans are setup", async (t) => {
		// Act
		await service.rootAsync();

		// Assert
		t.equal(recordedSpans.length, 0);
	});

	t.test("should not wrap hash methods", async (t) => {
		// Act
		const parentSpan = await withCtx(() => service.callPrivateMethod());
		parentSpan.end();
		const [recordedSpan, recordedParentSpan] = recordedSpans;

		// Assert
		t.equal(recordedSpans.length, 2);
		t.equal(recordedSpan.name, "Service.callPrivateMethod");
		t.strictSame(recordedSpan.status, { code: SpanStatusCode.OK });
		t.same(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "callPrivateMethod",
		});
		t.equal(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		t.equal(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});
	[
		{
			test: "should filter methods to be monitored by names",
			allowedMethods: ["allowed", "allowedNested"],
		},
		{
			test: "should filter methods to be monitored by regex",
			allowedMethods: /^allowed.*$/,
		},
		{
			test: "should filter methods to be monitored by function",
			allowedMethods(method: string): boolean {
				return method.startsWith("allowed");
			},
		},
	].forEach(({ test, allowedMethods }) => {
		t.test(test, async (t) => {
			// Arrange
			@Monitor({ allowedMethods })
			class Service {
				notAllowed(): void {}

				allowedNested(): void {}

				allowed(): void {
					this.allowedNested();
					this.notAllowed();
				}
			}
			const service = new Service();

			// Act
			const parentSpan = await withCtx(() => service.allowed());
			parentSpan.end();
			const [
				recordedAllowedNestedSpan,
				recordedAllowedSpan,
				recordedParentSpan,
			] = recordedSpans;

			// Assert
			t.equal(recordedSpans.length, 3);
			t.equal(recordedAllowedNestedSpan.name, "Service.allowedNested");
			t.strictSame(recordedAllowedNestedSpan.status, {
				code: SpanStatusCode.OK,
			});
			t.same(recordedAllowedNestedSpan.attributes, {
				"monitoring.class": serviceClassName,
				"monitoring.method": "allowedNested",
			});
			t.equal(
				recordedAllowedNestedSpan.parentSpanId,
				recordedAllowedSpan.spanContext().spanId,
			);
			t.equal(recordedAllowedSpan.name, "Service.allowed");
			t.strictSame(recordedAllowedSpan.status, { code: SpanStatusCode.OK });
			t.same(recordedAllowedSpan.attributes, {
				"monitoring.class": serviceClassName,
				"monitoring.method": "allowed",
			});
			t.equal(
				recordedAllowedSpan.parentSpanId,
				parentSpan.spanContext().spanId,
			);
			t.equal(
				recordedParentSpan.spanContext().spanId,
				parentSpan.spanContext().spanId,
			);
		});
	});

	t.end();
});
