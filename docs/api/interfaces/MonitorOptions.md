[@nifty-lil-tricks/monitoring](../README.md) / [Exports](../modules.md) / MonitorOptions

# Interface: MonitorOptions

## Table of contents

### Properties

- [allowedMethods](MonitorOptions.md#allowedmethods)
- [className](MonitorOptions.md#classname)
- [tracerName](MonitorOptions.md#tracername)

## Properties

### allowedMethods

• `Optional` **allowedMethods**: `RegExp` \| `string`[] \| (`method`: `string`) => `boolean`

List of methods, regex or function filter that determines which methods will be monitored.
By default, all non-private methods will be monitored.

#### Defined in

[src/decorators/monitor/monitor.ts:22](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/be65d70/src/decorators/monitor/monitor.ts#L22)

___

### className

• `Optional` **className**: `string`

Name of the class to be monitored. If not provided, the class name will be automatically inferred.

#### Defined in

[src/decorators/monitor/monitor.ts:13](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/be65d70/src/decorators/monitor/monitor.ts#L13)

___

### tracerName

• `Optional` **tracerName**: `string`

Name of the tracer to be used. If not provided, the default tracer will be used.

#### Defined in

[src/decorators/monitor/monitor.ts:17](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/be65d70/src/decorators/monitor/monitor.ts#L17)
