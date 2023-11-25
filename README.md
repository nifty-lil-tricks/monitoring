![Nifty li'l tricks Logo](https://raw.githubusercontent.com/nifty-lil-tricks/assets/main/nifty-lil-tricks-logo.png)

# @nifty-lil-tricks/monitoring

[![Latest Version](https://img.shields.io/npm/v/@nifty-lil-tricks/monitoring?style=flat-square)](https://www.npmjs.com/package/@nifty-lil-tricks/monitoring)
[![GitHub License](https://img.shields.io/github/license/nifty-lil-tricks/monitoring?style=flat-square)](https://raw.githubusercontent.com/nifty-lil-tricks/monitoring/main/LICENSE)
[![Buy us a tree](https://img.shields.io/badge/Treeware-%F0%9F%8C%B3-lightgreen)](https://plant.treeware.earth/nifty-lil-tricks/monitoring)
[![codecov](https://codecov.io/gh/nifty-lil-tricks/monitoring/branch/main/graph/badge.svg)](https://codecov.io/gh/nifty-lil-tricks/monitoring)

**Note: This is an experimental package under active development. New releases
may include breaking changes.**

A selection of useful utilities (or nifty li'l tricks!) for all things
monitoring and [OpenTelemetry](https://opentelemetry.io/).

## Table of contents

- [Installation](#installation)
- [Features](#features)
- [API](#api)
- [Examples](#examples)
- [Support](#support)
- [Useful links](#useful-links)
- [License](#license)
- [Contributions](#contributions)

## Installation

**Note: this package works with TypeScript v5 or later**

```shell
npm install @nifty-lil-tricks/monitoring
```

### Experimental stage 2 decorators

If you are using experimental stage 2 decorators, you will need to set the
following in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Stage 3 decorators

No setup is required.

## Features

The following features are supported

- [Monitoring decorator](#monitoring-decorator) that wraps all methods of a
  class in an
  [OpenTelemetry Span](https://opentelemetry.io/docs/concepts/glossary/#span)
  automatically tracing every method on the class.

### Monitoring Decorator

- [@nifty-lil-tricks/monitoring](#nifty-lil-tricksmonitoring)
  - [Table of contents](#table-of-contents)
  - [Installation](#installation)
    - [Experimental stage 2 decorators](#experimental-stage-2-decorators)
    - [Stage 3 decorators](#stage-3-decorators)
  - [Features](#features)
    - [Monitoring Decorator](#monitoring-decorator)
      - [Monitoring Decorator Overview](#monitoring-decorator-overview)
        - [Exported span for method that passes](#exported-span-for-method-that-passes)
        - [Exported span for method that throws](#exported-span-for-method-that-throws)
      - [Pre-requisites](#pre-requisites)
      - [Wrap all methods of a class in a span](#wrap-all-methods-of-a-class-in-a-span)
      - [Filter allowed methods to monitor](#filter-allowed-methods-to-monitor)
        - [Filtering monitored methods by list of strings](#filtering-monitored-methods-by-list-of-strings)
        - [Filtering monitored methods by regex](#filtering-monitored-methods-by-regex)
        - [Filtering monitored methods by function](#filtering-monitored-methods-by-function)
      - [Override the default Span kind](#override-the-default-span-kind)
      - [Override the inferred class name](#override-the-inferred-class-name)
      - [Override the default tracer name](#override-the-default-tracer-name)
      - [Caveats](#caveats)
  - [API](#api)
  - [Examples](#examples)
    - [Basic example](#basic-example)
    - [Nestjs example](#nestjs-example)
  - [Support](#support)
  - [Useful links](#useful-links)
  - [License](#license)
  - [Contributions](#contributions)

#### Monitoring Decorator Overview

This decorator wraps all methods of a class in an
[OpenTelemetry Span](https://opentelemetry.io/docs/concepts/glossary/#span). If
a parent span cannot be retrieved from the context of the method call, it will
**not** be monitored.

The decorator will not affect any of the underlying functionality and it will
also handle any legitimate errors thrown from the underlying method as
appropriate.

##### Exported span for method that passes

A method of name `hello` on class `Service` that returns without error will
export the following span details by default:

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

##### Exported span for method that throws

A method of name `hello` on class `Service` that throws an error will export the
following span details by default:

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
- The monitored method is wrapped in the context of a parent span
- A global context manager is set up

See [example set up](#basic-example) for a quick guide to getting the above
setup.

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

#### Filter allowed methods to monitor

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

#### Override the default Span kind

By default, the monitor decorator sets the Span Kind to be `INTERNAL`. This
option allows one to override this.

```typescript
import { Monitor } from "@nifty-lil-tricks/monitoring";
import { promisify } from "node:util";

@Monitor({ spanKind: SpanKind.SERVER })
class Service {
  async hello(): Promise<void> {
    // Do work
    await promisify(setTimeout)(500);
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

The API docs can be found
[here](https://github.com/nifty-lil-tricks/monitoring/blob/main/docs/api/modules.md)

## Examples

Examples can be found
[here](https://github.com/nifty-lil-tricks/monitoring/blob/main/examples).

### Basic example

To run the `examples/basic.ts` example, run the following:

- Ensure [Docker](https://www.docker.com/) is running
- Start the Jaeger collector: `npm run start:collector`
- Run the example: `npm run example:basic`
- Navigate to the Jaeger UI: http://localhost:16686

![Example exported trace](https://github.com/nifty-lil-tricks/monitoring/raw/main/docs/img/example-basic-export.png)

### Nestjs example

To run the `examples/basic.ts` example, run the following:

- Ensure [Docker](https://www.docker.com/) is running
- Start the Jaeger collector: `npm run start:collector`
- Run the example: `npm run example:nestjs`
- Make a request to the app: `curl http://localhost:3000/`
- Navigate to the Jaeger UI: http://localhost:16686

![Example exported trace](https://github.com/nifty-lil-tricks/monitoring/raw/main/docs/img/example-nestjs-export.png)

## Support

| Platform Version | Supported          | Notes                                                     |
| ---------------- | ------------------ | --------------------------------------------------------- |
| Node.JS `v18`    | :white_check_mark: | TypeScript v5+ for typings                                |
| Node.JS `v20`    | :white_check_mark: | TypeScript v5+ for typings                                |
| Deno `v1`        | :x:                | Will be supported when OpenTelemetry is supported in Deno |
| Web Browsers     | :x:                | Coming soon                                               |

## Useful links

- For more information on OpenTelemetry, visit: https://opentelemetry.io/
- For more about OpenTelemetry JavaScript:
  https://github.com/open-telemetry/opentelemetry-js
- For help or feedback on this project, join us in
  [GitHub Discussions](https://github.com/nifty-lil-tricks/monitoring/discussions)

## License

Nifty li'l tricks packages are 100% free and open-source, under the
[MIT license](https://github.com/nifty-lil-tricks/monitoring/blob/main/LICENSE).

This package is [Treeware](https://treeware.earth). If you use it in production,
then we ask that you
[**buy the world a tree**](https://plant.treeware.earth/nifty-lil-tricks/monitoring)
to thank us for our work. By contributing to the Treeware forest you’ll be
creating employment for local families and restoring wildlife habitats.

## Contributions

[Contributions](https://github.com/nifty-lil-tricks/monitoring/blob/main/CONTRIBUTING.md),
issues and feature requests are very welcome. If you are using this package and
fixed a bug for yourself, please consider submitting a PR!

<p align="center">
  <a href="https://github.com/nifty-lil-tricks/monitoring/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=nifty-lil-tricks/monitoring&columns=8" />
  </a>
</p>
