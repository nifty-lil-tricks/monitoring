[@nifty-lil-tricks/monitoring](../README.md) / [Exports](../modules.md) / MonitorOptions

# Interface: MonitorOptions

## Table of contents

### Properties

- [allowedMethods](MonitorOptions.md#allowedmethods)
- [className](MonitorOptions.md#classname)
- [spanKind](MonitorOptions.md#spankind)
- [tracerName](MonitorOptions.md#tracername)

## Properties

### allowedMethods

• `Optional` **allowedMethods**: `RegExp` \| `string`[] \| (`method`: `string`) => `boolean`

List of methods, regex or function filter that determines an allow-list for methods which will be monitored.
By default, all non-private methods will be monitored.

#### Defined in

[src/decorators/monitor/monitor.ts:28](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/e8564b2/src/decorators/monitor/monitor.ts#L28)

___

### className

• `Optional` **className**: `string`

Name of the class to be monitored. If not provided, the class name will be automatically inferred.

#### Defined in

[src/decorators/monitor/monitor.ts:19](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/e8564b2/src/decorators/monitor/monitor.ts#L19)

___

### spanKind

• `Optional` **spanKind**: `SpanKind`

The Span Kind to be used for the span. If not provided, the default span kind of `INTERNAL` will be used.

#### Defined in

[src/decorators/monitor/monitor.ts:32](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/e8564b2/src/decorators/monitor/monitor.ts#L32)

___

### tracerName

• `Optional` **tracerName**: `string`

Name of the tracer to be used. If not provided, the default tracer will be used.

#### Defined in

[src/decorators/monitor/monitor.ts:23](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/e8564b2/src/decorators/monitor/monitor.ts#L23)
