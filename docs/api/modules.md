[@nifty-lil-tricks/monitoring](README.md) / Exports

# @nifty-lil-tricks/monitoring

## Table of contents

### Interfaces

- [MonitorOptions](interfaces/MonitorOptions.md)

### Type Aliases

- [Constructor](modules.md#constructor)
- [MonitorDecorator](modules.md#monitordecorator)
- [Target](modules.md#target)

### Functions

- [Monitor](modules.md#monitor)

## Type Aliases

### Constructor

Ƭ **Constructor**: (...`args`: `unknown`[]) => `unknown`

#### Type declaration

• (`...args`)

##### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `unknown`[] |

#### Defined in

[src/decorators/monitor/monitor.ts:5](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/be65d70/src/decorators/monitor/monitor.ts#L5)

___

### MonitorDecorator

Ƭ **MonitorDecorator**: `DecoratorContext`

#### Defined in

[src/decorators/monitor/monitor.ts:3](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/be65d70/src/decorators/monitor/monitor.ts#L3)

___

### Target

Ƭ **Target**: `Record`<`string`, `unknown`\>

#### Defined in

[src/decorators/monitor/monitor.ts:7](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/be65d70/src/decorators/monitor/monitor.ts#L7)

## Functions

### Monitor

▸ **Monitor**(`options?`): (`target`: `Function`, `_context`: `ClassDecoratorContext`<(...`args`: `any`) => `any`\>) => `void`

Decorator to monitor a class method.
By default, it monitors all methods of the class provided
they are in the context of a span. Nested calls will use the newly
context for the method in question.
It will **not** monitor methods if they not called in the
context of a span.

**`Examples`**

```typescript
\@Monitor()
class Service {
  // This method will be monitored
  hello(): void {}
}
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`MonitorOptions`](interfaces/MonitorOptions.md) |

#### Returns

`fn`

▸ (`target`, `_context`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `target` | `Function` |
| `_context` | `ClassDecoratorContext`<(...`args`: `any`) => `any`\> |

##### Returns

`void`

#### Defined in

[src/decorators/monitor/monitor.ts:42](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/be65d70/src/decorators/monitor/monitor.ts#L42)
