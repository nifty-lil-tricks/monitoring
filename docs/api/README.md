@nifty-lil-tricks/monitoring / [Exports](modules.md)

# @nifty-lil-tricks/monitoring

[![Latest Version](https://img.shields.io/npm/v/@nifty-lil-tricks/monitoring?style=flat-square)](https://www.npmjs.com/package/@nifty-lil-tricks/monitoring)
[![GitHub License](https://img.shields.io/github/license/jonnydgreen/nifty-lil-tricks-monitoring?style=flat-square)](https://raw.githubusercontent.com/jonnydgreen/nifty-lil-tricks-monitoring/main/LICENSE)
[![Buy us a tree](https://img.shields.io/badge/Treeware-%F0%9F%8C%B3-lightgreen)](https://plant.treeware.earth/jonnydgreen/nifty-lil-tricks-monitoring)

A selection of useful utilities for all things monitoring and
[OpenTelemetry](https://opentelemetry.io/).

## Installation

**`@opentelemetry/api` package is a peer-dependency, and it should be installed
separately.**

```shell
npm install @nifty-lil-tricks/monitoring @opentelemetry/api
```

## Features

- [Monitoring decorator](#monitoring-decorator) that wraps all methods of a
  class in an
  [OpenTelemetry Span](https://opentelemetry.io/docs/concepts/glossary/#span).

**Official docs coming soon!**

### Monitoring Decorator

This decorator wraps all methods of a class in an
[OpenTelemetry Span](https://opentelemetry.io/docs/concepts/glossary/#span). If
a parent span cannot be retrieved from the context of the method call, it will
**not** be monitored.

The decorator will not affect any of the underlying functionality and it will
handle any legitimate errors thrown from the underlying method as appropriate.

#### Exported span for method that passes

A method of name `hello` on class `Service` that returns without error will
export the following span details:

```json
{
  "id": "b98126c289c5c9dc",
  "name": "Service.hello",
  "traceId": "a7b41739082880c506d62152de2e13a1",
  "parentId": "f64d1571cd4a88dd",
  "kind": 0,
  "attributes": {
    "monitoring.method": "hello",
    "monitoring.class": "Service"
  },
  "status": { "code": 1 },
  "timestamp": 1684136794317000,
  "duration": 2010408,
  "events": [],
  "links": []
}
```

#### Exported span for method that throws

A method of name `hello` on class `Service` that throws an error will export the
following span details:

```json
{
  "id": "7c5f84a384af9a63",
  "name": "Service.hello",
  "traceId": "931ba33b4ab375ade4f26c7ac93df4ce",
  "parentId": "0182507d0f5f0a85",
  "kind": 0,
  "attributes": {
    "monitoring.method": "hello",
    "monitoring.class": "Service"
  },
  "status": { "code": 2, "message": "Error: something bad happened" },
  "timestamp": 1684136986170000,
  "duration": 502605,
  "events": [],
  "links": []
}
```

#### Pre-requisites

Ensure
[OpenTelemetry tracing is set-up](https://github.com/open-telemetry/opentelemetry-js/tree/main/api#trace-your-application)
by ensuring:

- The provider is registered
- The monitored method is wrapped in a parent span
- A global context manager is set up

See
[example set up](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/main/examples/basic.ts)
for a quick guide to the above.

#### Wrap all methods of a class in a span

```typescript
import { Monitor } from "@nifty-lil-tricks/monitoring";
import { promisify } from "node:util";

@Monitor()
class Service {
  async hello(): Promise<void> {
    // Do work
    await promisify(setTimeout)(500);

    // Do nested work
    await this.nested();
  }

  async nested(): Promise<void> {
    // Do work
    await promisify(setTimeout)(1000);
  }
}
```

#### Override the inferred class name

By default, the monitor decorator infers the class name from the class. This
option allows one to override this behaviour. A use-case for this would be when
one has multiple classes of the same name defined.

```typescript
import { Monitor } from "@nifty-lil-tricks/monitoring";
import { promisify } from "node:util";

@Monitor({ className: "OtherService" })
class Service {
  async hello(): Promise<void> {
    // Do work
    await promisify(setTimeout)(500);
  }
}
```

#### Override the default tracer name

By default, the monitor decorator uses the default tracer to record spans. This
option allows one to override this behaviour.

```typescript
import { Monitor } from "@nifty-lil-tricks/monitoring";
import { promisify } from "node:util";

@Monitor({ tracerName: "some-other-tracer" })
class Service {
  async hello(): Promise<void> {
    // Do work
    await promisify(setTimeout)(500);
  }
}
```

#### Filter methods to monitor

By default, the monitor decorator monitors all
non-[private]((https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields))
methods. One can provide an `allowedMethods` option to filter the methods that
are monitored. This filter can be provided in several types:

- `string[]`
- `RegExp`
- `(methodName: string) => boolean`

##### Filtering monitored methods by list of strings

```typescript
import { Monitor } from "@nifty-lil-tricks/monitoring";
import { promisify } from "node:util";

@Monitor({ allowedMethods: ["allowed1", "allowed2"] })
class Service {
  // Not monitored
  notAllowed(): void {}

  // Monitored
  allowed1(): void {}

  // Monitored
  allowed2(): void {}
}
```

##### Filtering monitored methods by regex

```typescript
import { Monitor } from "@nifty-lil-tricks/monitoring";
import { promisify } from "node:util";

@Monitor({ allowedMethods: /^allowed.+/ })
class Service {
  // Not monitored
  notAllowed(): void {}

  // Monitored
  allowed1(): void {}

  // Monitored
  allowed2(): void {}
}
```

##### Filtering monitored methods by function

```typescript
import { Monitor } from "@nifty-lil-tricks/monitoring";
import { promisify } from "node:util";

@Monitor({ allowedMethods: (method) => method.startsWith("allowed") })
class Service {
  // Not monitored
  notAllowed(): void {}

  // Monitored
  allowed1(): void {}

  // Monitored
  allowed2(): void {}
}
```

#### Caveats

Private methods
[as defined here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields)
are not monitoring by this decorator.

```typescript
import { Monitor } from "@nifty-lil-tricks/monitoring";
import { promisify } from "node:util";

@Monitor({ tracerName: "some-other-tracer" })
class Service {
  // Monitored
  async hello(): Promise<void> {
    // Not monitored
    await this.#privateMethod(())
  }

  async #privateMethod(): Promise<void> {
    // Do work
    await promisify(setTimeout)(500);
  }
}
```

## API

The API docs can be found [here](./docs/api/modules.md)

## Examples

Examples can be found
[here](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/main/examples/basic.ts).

To run the `examples/basic.ts` example, run the following:

- Ensure [Docker](https://www.docker.com/) is running
- Start the Jaeger collector: `npm run start:collector`
- Run the example: `npm run example:basic`

![Example exported trace](./docs/img/example-basic-export.png)

## Useful links

- For more information on OpenTelemetry, visit: https://opentelemetry.io/
- For more about OpenTelemetry JavaScript:
  https://github.com/open-telemetry/opentelemetry-js
- For help or feedback on this project, join us in
  [GitHub Discussions](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/discussions)

## License

Nifty lil tricks packages are 100% free and open-source, under the
[MIT license](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/main/LICENSE).

This package is [Treeware](https://treeware.earth). If you use it in production,
then we ask that you
[**buy the world a tree**](https://plant.treeware.earth/jonnydgreen/nifty-lil-tricks-monitoring)
to thank us for our work. By contributing to the Treeware forest you’ll be
creating employment for local families and restoring wildlife habitats.

## Contributions

[Contributions](https://github.com/jonnydgreen/nifty-lil-tricks/blob/main/CONTRIBUTING.md),
issues and feature requests are very welcome. If you are using this package and
fixed a bug for yourself, please consider submitting a PR!

<p align="center">
  <a href="https://github.com/jonnydgreen/nifty-lil-tricks/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=jonnydgreen/nifty-lil-tricks&columns=8" />
  </a>
</p>
