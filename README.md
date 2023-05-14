# @nifty-lil-tricks/monitoring

**UNRELEASED**

[![Latest Version](https://img.shields.io/npm/v/@nifty-lil-tricks/monitoring?style=flat-square)](https://www.npmjs.com/package/@nifty-lil-tricks/monitoring)
[![GitHub License](https://img.shields.io/github/license/jonnydgreen/nifty-lil-tricks-monitoring?style=flat-square)](https://raw.githubusercontent.com/jonnydgreen/nifty-lil-tricks-monitoring/main/LICENSE)
[![Buy us a tree](https://img.shields.io/badge/Treeware-%F0%9F%8C%B3-lightgreen)](https://plant.treeware.earth/jonnydgreen/nifty-lil-tricks)

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

#### Pre-requisites

Ensure
[OpenTelemetry tracing is set-up](https://github.com/open-telemetry/opentelemetry-js/tree/main/api#trace-your-application).
See example
[setup](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/main/examples/basic.ts).

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

## Examples

Examples can be found
[here](https://github.com/jonnydgreen/nifty-lil-tricks-monitoring/blob/main/examples/basic.ts).

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
