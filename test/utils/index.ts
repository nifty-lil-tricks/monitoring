// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { type Span, context, trace } from "@opentelemetry/api";

export async function withCtx(
	fn: () => void,
	parentSpanOverride?: Span,
): Promise<Span> {
	const tracer = trace.getTracer("default");
	const parentSpan = parentSpanOverride ?? tracer.startSpan("basic-root");
	const ctx = trace.setSpan(context.active(), parentSpan);
	await context.with(ctx, () => fn());
	return parentSpan;
}
