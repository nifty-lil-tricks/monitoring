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

[src/decorators/monitor/monitor.ts:25](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/354c6e2/src/decorators/monitor/monitor.ts#L25)

___

### className

• `Optional` **className**: `string`

Name of the class to be monitored. If not provided, the class name will be automatically inferred.

#### Defined in

[src/decorators/monitor/monitor.ts:16](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/354c6e2/src/decorators/monitor/monitor.ts#L16)

___

### spanKind

• `Optional` **spanKind**: `SpanKind`

The Span Kind to be used for the span. If not provided, the default span kind of `INTERNAL` will be used.

#### Defined in

[src/decorators/monitor/monitor.ts:29](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/354c6e2/src/decorators/monitor/monitor.ts#L29)

___

### tracerName

• `Optional` **tracerName**: `string`

Name of the tracer to be used. If not provided, the default tracer will be used.

#### Defined in

[src/decorators/monitor/monitor.ts:20](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/354c6e2/src/decorators/monitor/monitor.ts#L20)
