// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { promisify } from "node:util";
import {
	DiagConsoleLogger,
	DiagLogLevel,
	context,
	diag,
	trace,
} from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { Resource } from "@opentelemetry/resources";
import {
	BasicTracerProvider,
	ConsoleSpanExporter,
	SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { Monitor } from "../src";

// Setting the default Global logger to use the Console
// And optionally change the logging level (Defaults to INFO)
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const consoleExporter = new ConsoleSpanExporter();
const exporter = new OTLPTraceExporter();
const provider = new BasicTracerProvider({
	resource: new Resource({
		[SemanticResourceAttributes.SERVICE_NAME]: "basic-example",
	}),
});
context.setGlobalContextManager(new AsyncLocalStorageContextManager());
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.addSpanProcessor(new SimpleSpanProcessor(consoleExporter));
provider.register();

@Monitor()
class Service {
	hello(): void {}

	async helloAsync(): Promise<void> {
		await promisify(setTimeout)(500);
		await this.nestedAsync();
		await promisify(setTimeout)(500);
	}

	async nestedAsync(): Promise<void> {
		await promisify(setTimeout)(1000);
	}
}

const a = new Service();
const tracer = trace.getTracer("example-basic-tracer-node");
const parentSpan = tracer.startSpan("basic-root");
const ctx = trace.setSpan(context.active(), parentSpan);
context.with(ctx, () => a.helloAsync()).finally(() => parentSpan.end());
