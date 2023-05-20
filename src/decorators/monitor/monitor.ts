import { MonitorMethod, shouldMonitorMethod } from './monitor.util'

export type MonitorDecorator = DecoratorContext

export type Constructor = new (...args: unknown[]) => unknown

export type Target = Record<string, unknown>

export interface MonitorOptions {
  /**
   * Name of the class to be monitored. If not provided, the class name will be automatically inferred.
   */
  className?: string
  /**
   * Name of the tracer to be used. If not provided, the default tracer will be used.
   */
  tracerName?: string
  /**
   * List of methods, regex or function filter that determines which methods will be monitored.
   * By default, all non-private methods will be monitored.
   */
  allowedMethods?: string[] | RegExp | ((method: string) => boolean)
}

/**
 * Decorator to monitor a class method.
 * By default, it monitors all methods of the class provided
 * they are in the context of a span. Nested calls will use the newly
 * context for the method in question.
 * It will **not** monitor methods if they not called in the
 * context of a span.
 *
 * @examples
 * ```typescript
 * \@Monitor()
 * class Service {
 *   // This method will be monitored
 *   hello(): void {}
 * }
 * ```
 */
export function Monitor(options?: MonitorOptions) {
  return function actualDecorator(target: Function, _context: ClassDecoratorContext): void {
    for (const propertyName of Object.getOwnPropertyNames(target.prototype)) {
      const descriptor = Object.getOwnPropertyDescriptor(target.prototype, propertyName)
      if (propertyName !== 'constructor' && descriptor && shouldMonitorMethod(propertyName, options?.allowedMethods)) {
        const monitorMethod = new MonitorMethod(
          {
            methodName: propertyName,
            className: options?.className ?? target.name,
            tracerName: options?.tracerName
          },
          descriptor.value
        )
        descriptor.value = monitorMethod.build()
        Object.defineProperty(target.prototype, propertyName, descriptor)
      }
    }
  }
}
