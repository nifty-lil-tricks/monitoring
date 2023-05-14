/**
 * - globalThis (New standard)
 * - self (Will return the current window instance for supported browsers)
 * - window (fallback for older browser implementations)
 * - global (NodeJS implementation)
 * - <object> (When all else fails)
 */

/** only globals that common to node and browsers are allowed */
// eslint-disable-next-line node/no-unsupported-features/es-builtins, no-undef
export const _globalThis: typeof globalThis =
	typeof globalThis === "object"
		? globalThis
		: typeof self === "object"
		? self
		: typeof window === "object"
		? window
		: typeof global === "object"
		? global
		: ({} as typeof globalThis);
