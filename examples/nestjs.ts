// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { NestInstrumentation } from "@opentelemetry/instrumentation-nestjs-core";
import { Resource } from "@opentelemetry/resources";
import * as opentelemetry from "@opentelemetry/sdk-node";
import {
	ConsoleSpanExporter,
	SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

// Setting the default Global logger to use the Console
// And optionally change the logging level (Defaults to INFO)
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const otlpExporter = new OTLPTraceExporter();

const sdk = new opentelemetry.NodeSDK({
	resource: new Resource({
		[SemanticResourceAttributes.SERVICE_NAME]: "nestjs-example",
	}),
	spanProcessor: new SimpleSpanProcessor(otlpExporter),
	instrumentations: [new NestInstrumentation()],
});

sdk.start();

import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Monitor } from "../src";

@Monitor()
@Injectable()
export class AppService {
	getHello(): string {
		return "Hello World!";
	}
}

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get()
	getHello(): string {
		return this.appService.getHello();
	}
}

@Module({
	imports: [],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	await app.listen(3000);
}

bootstrap();
