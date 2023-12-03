// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import {
	SpanKind,
	SpanStatusCode,
	context,
	trace,
} from "npm:@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "npm:@opentelemetry/context-async-hooks";
import { type ExportResult, ExportResultCode } from "npm:@opentelemetry/core";
import { Resource } from "npm:@opentelemetry/resources";
import {
	BasicTracerProvider,
	ReadableSpan,
	SimpleSpanProcessor,
	type SpanExporter,
} from "npm:@opentelemetry/sdk-trace-base";
import { SemanticResourceAttributes } from "npm:@opentelemetry/semantic-conventions";
import { Monitor } from "../mod.ts";
import {
	it,
	beforeEach,
	describe,
	beforeAll,
	afterAll,
} from "std/testing/bdd.ts";
import {
	assertEquals,
	assertRejects,
	assertObjectMatch,
} from "std/testing/asserts.ts";
import { withCtx } from "./utils.ts";

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

describe("Monitor", () => {
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

	beforeAll(() => {
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

	afterAll(async () => {
		await provider.shutdown();
	});

	beforeEach(() => {
		recordedSpans = [];
		service = new Service();
	});

	it("should wrap a method", async () => {
		// Act
		const parentSpan = await withCtx(() => service.method());
		parentSpan.end();
		const [recordedSpan, recordedParentSpan] = recordedSpans;

		// Assert
		assertEquals(recordedSpans.length, 2);
		assertEquals(recordedSpan.name, "Service.method");
		assertEquals(recordedSpan.kind, SpanKind.INTERNAL);
		assertObjectMatch(recordedSpan.status, { code: SpanStatusCode.OK });
		assertObjectMatch(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "method",
		});
		assertEquals(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		assertEquals(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	it("should wrap an async method", async () => {
		// Act
		const parentSpan = await withCtx(() => service.methodAsync());
		parentSpan.end();
		const [recordedSpan, recordedParentSpan] = recordedSpans;

		// Assert
		assertEquals(recordedSpans.length, 2);
		assertEquals(recordedSpan.name, "Service.methodAsync");
		assertObjectMatch(recordedSpan.status, { code: SpanStatusCode.OK });
		assertObjectMatch(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "methodAsync",
		});
		assertEquals(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		assertEquals(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	it("should wrap a nested method", async () => {
		// Act
		const parentSpan = await withCtx(() => service.root());
		parentSpan.end();
		const [nestedRecordedSpan, recordedSpan, recordedParentSpan] =
			recordedSpans;

		// Assert
		assertEquals(recordedSpans.length, 3);
		// Nested span
		assertEquals(nestedRecordedSpan.name, "Service.method");
		assertObjectMatch(nestedRecordedSpan.status, { code: SpanStatusCode.OK });
		assertObjectMatch(nestedRecordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "method",
		});
		assertEquals(
			nestedRecordedSpan.parentSpanId,
			recordedSpan.spanContext().spanId,
		);
		// Recorded span
		assertEquals(recordedSpan.name, "Service.root");
		assertObjectMatch(recordedSpan.status, { code: SpanStatusCode.OK });
		assertObjectMatch(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "root",
		});
		assertEquals(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		assertEquals(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	it("should wrap a nested async method", async () => {
		// Act
		const parentSpan = await withCtx(() => service.rootAsync());
		parentSpan.end();
		const [nestedRecordedSpan, recordedSpan, recordedParentSpan] =
			recordedSpans;

		// Assert
		assertEquals(recordedSpans.length, 3);
		// Nested span
		assertEquals(nestedRecordedSpan.name, "Service.methodAsync");
		assertObjectMatch(nestedRecordedSpan.status, { code: SpanStatusCode.OK });
		assertObjectMatch(nestedRecordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "methodAsync",
		});
		assertEquals(
			nestedRecordedSpan.parentSpanId,
			recordedSpan.spanContext().spanId,
		);
		// Recorded span
		assertEquals(recordedSpan.name, "Service.rootAsync");
		assertObjectMatch(recordedSpan.status, { code: SpanStatusCode.OK });
		assertObjectMatch(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "rootAsync",
		});
		assertEquals(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		assertEquals(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	it("should wrap multiple methods", async () => {
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
		assertEquals(recordedSpans.length, 4);
		// Nested span
		assertEquals(nestedRecordedSpan.name, "Service.methodAsync");
		assertObjectMatch(nestedRecordedSpan.status, { code: SpanStatusCode.OK });
		assertObjectMatch(nestedRecordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "methodAsync",
		});
		assertEquals(
			nestedRecordedSpan.parentSpanId,
			recordedSpan1.spanContext().spanId,
		);
		// Recorded span 1
		assertEquals(recordedSpan1.name, "Service.rootAsync");
		assertObjectMatch(recordedSpan1.status, { code: SpanStatusCode.OK });
		assertObjectMatch(recordedSpan1.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "rootAsync",
		});
		// Recorded span 2
		assertEquals(recordedSpan2.name, "Service.method");
		assertObjectMatch(recordedSpan2.status, { code: SpanStatusCode.OK });
		assertObjectMatch(recordedSpan2.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "method",
		});
		assertEquals(recordedSpan2.parentSpanId, parentSpan.spanContext().spanId);
		assertEquals(recordedSpan1.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		assertEquals(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	it("should correctly handle errors", async () => {
		// Arrange
		const tracer = trace.getTracer("defaults");
		const parentSpan = tracer.startSpan("basic-root");

		// Act & Assert
		assertRejects(
			() => withCtx(() => service.error(), parentSpan),
			Error,
			"error",
		);
		parentSpan.end();
		assertEquals(recordedSpans.length, 2);
		const [recordedSpan, recordedParentSpan] = recordedSpans;
		// Recorded span
		assertEquals(recordedSpan.name, "Service.error");
		assertObjectMatch(recordedSpan.status, {
			code: SpanStatusCode.ERROR,
			message: "Error: error",
		});
		assertObjectMatch(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "error",
		});
		assertEquals(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		assertEquals(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	it("should correctly handle nested errors", async () => {
		// Arrange
		const tracer = trace.getTracer("defaults");
		const parentSpan = tracer.startSpan("basic-root");

		// Act & Assert
		assertRejects(
			() => withCtx(() => service.rootError(), parentSpan),
			Error,
			"error",
		);
		parentSpan.end();

		assertEquals(recordedSpans.length, 3);
		const [nestedRecordedSpan, recordedSpan, recordedParentSpan] =
			recordedSpans;
		// Nested span
		assertEquals(nestedRecordedSpan.name, "Service.error");
		assertObjectMatch(nestedRecordedSpan.status, {
			code: SpanStatusCode.ERROR,
			message: "Error: error",
		});
		assertObjectMatch(nestedRecordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "error",
		});
		assertEquals(
			nestedRecordedSpan.parentSpanId,
			recordedSpan.spanContext().spanId,
		);
		// Recorded span
		assertEquals(recordedSpan.name, "Service.rootError");
		assertObjectMatch(recordedSpan.status, {
			code: SpanStatusCode.ERROR,
			message: "Error: error",
		});
		assertObjectMatch(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "rootError",
		});
		assertEquals(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		assertEquals(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	it("should correctly handle async errors", async () => {
		// Arrange
		const tracer = trace.getTracer("defaults");
		const parentSpan = tracer.startSpan("basic-root");

		// Act & Assert
		await assertRejects(
			() => withCtx(() => service.asyncError(), parentSpan),
			Error,
			"asyncError",
		);
		parentSpan.end();
		assertEquals(recordedSpans.length, 2);
		const [recordedSpan, recordedParentSpan] = recordedSpans;
		// Recorded span
		assertEquals(recordedSpan.name, "Service.asyncError");
		assertObjectMatch(recordedSpan.status, {
			code: SpanStatusCode.ERROR,
			message: "Error: asyncError",
		});
		assertObjectMatch(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "asyncError",
		});
		assertEquals(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		assertEquals(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	it("should correctly handle nested async errors", async () => {
		// Arrange
		const tracer = trace.getTracer("defaults");
		const parentSpan = tracer.startSpan("basic-root");

		// Act & Assert
		await assertRejects(
			() => withCtx(() => service.rootAsyncError(), parentSpan),
			Error,
			"asyncError",
		);
		parentSpan.end();
		assertEquals(recordedSpans.length, 3);
		const [nestedRecordedSpan, recordedSpan, recordedParentSpan] =
			recordedSpans;
		// Nested span
		assertEquals(nestedRecordedSpan.name, "Service.asyncError");
		assertObjectMatch(recordedSpan.status, {
			code: SpanStatusCode.ERROR,
			message: "Error: asyncError",
		});
		assertObjectMatch(nestedRecordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "asyncError",
		});
		assertEquals(
			nestedRecordedSpan.parentSpanId,
			recordedSpan.spanContext().spanId,
		);
		// Recorded span
		assertEquals(recordedSpan.name, "Service.rootAsyncError");
		assertObjectMatch(recordedSpan.status, {
			code: SpanStatusCode.ERROR,
			message: "Error: asyncError",
		});
		assertObjectMatch(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "rootAsyncError",
		});
		assertEquals(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		// Parent span
		assertEquals(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	it("should override the inferred class name if provided", async () => {
		// Act
		const serviceClassName = "ServiceOverride";
		@Monitor({ className: serviceClassName }) class Service {
			method(): void {}
		}
		const service = new Service();
		const parentSpan = await withCtx(() => service.method());
		parentSpan.end();
		const [recordedSpan, recordedParentSpan] = recordedSpans;

		// Assert
		assertEquals(recordedSpans.length, 2);
		assertEquals(recordedSpan.name, `${serviceClassName}.method`);
		assertObjectMatch(recordedSpan.status, { code: SpanStatusCode.OK });
		assertObjectMatch(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "method",
		});
		assertEquals(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		assertEquals(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	it("should override the span kind if provided", async () => {
		// Act
		const spanKind = SpanKind.SERVER;
		@Monitor({ spanKind: SpanKind.SERVER }) class Service {
			method(): void {}
		}
		const service = new Service();
		const parentSpan = await withCtx(() => service.method());
		parentSpan.end();
		const [recordedSpan, recordedParentSpan] = recordedSpans;

		// Assert
		assertEquals(recordedSpans.length, 2);
		assertEquals(recordedSpan.name, `${serviceClassName}.method`);
		assertEquals(recordedSpan.kind, spanKind);
		assertObjectMatch(recordedSpan.status, { code: SpanStatusCode.OK });
		assertObjectMatch(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "method",
		});
		assertEquals(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		assertEquals(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	it("should override the default tracer if provided", async () => {
		// Act
		const tracerName = "another-tracer";
		@Monitor({ tracerName }) class Service {
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
		assertEquals(recordedSpans.length, 2);
		assertEquals(recordedSpan.name, "Service.method");
		assertObjectMatch(recordedSpan.status, { code: SpanStatusCode.OK });
		assertObjectMatch(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "method",
		});
		assertEquals(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		assertEquals(
			recordedParentSpan.spanContext().spanId,
			parentSpan.spanContext().spanId,
		);
	});

	it("should not monitor if no parent spans are setup", async () => {
		// Act
		await service.rootAsync();

		// Assert
		assertEquals(recordedSpans.length, 0);
	});

	it("should not wrap hash methods", async () => {
		// Act
		const parentSpan = await withCtx(() => service.callPrivateMethod());
		parentSpan.end();
		const [recordedSpan, recordedParentSpan] = recordedSpans;

		// Assert
		assertEquals(recordedSpans.length, 2);
		assertEquals(recordedSpan.name, "Service.callPrivateMethod");
		assertObjectMatch(recordedSpan.status, { code: SpanStatusCode.OK });
		assertObjectMatch(recordedSpan.attributes, {
			"monitoring.class": serviceClassName,
			"monitoring.method": "callPrivateMethod",
		});
		assertEquals(recordedSpan.parentSpanId, parentSpan.spanContext().spanId);
		assertEquals(
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
		it(test, async () => {
			// Arrange
			@Monitor({ allowedMethods }) class Service {
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
			assertEquals(recordedSpans.length, 3);
			assertEquals(recordedAllowedNestedSpan.name, "Service.allowedNested");
			assertObjectMatch(recordedAllowedNestedSpan.status, {
				code: SpanStatusCode.OK,
			});
			assertObjectMatch(recordedAllowedNestedSpan.attributes, {
				"monitoring.class": serviceClassName,
				"monitoring.method": "allowedNested",
			});
			assertEquals(
				recordedAllowedNestedSpan.parentSpanId,
				recordedAllowedSpan.spanContext().spanId,
			);
			assertEquals(recordedAllowedSpan.name, "Service.allowed");
			assertObjectMatch(recordedAllowedSpan.status, {
				code: SpanStatusCode.OK,
			});
			assertObjectMatch(recordedAllowedSpan.attributes, {
				"monitoring.class": serviceClassName,
				"monitoring.method": "allowed",
			});
			assertEquals(
				recordedAllowedSpan.parentSpanId,
				parentSpan.spanContext().spanId,
			);
			assertEquals(
				recordedParentSpan.spanContext().spanId,
				parentSpan.spanContext().spanId,
			);
		});
	});
});
