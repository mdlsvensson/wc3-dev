// mdx-m3-viewer ships CommonJS; Vite and Deno expose its exports with different nesting.

/** Unwraps `default` until `accept` matches (a class by default). */
export function cjsDefault<T>(module: unknown, accept: (value: unknown) => boolean = (value) => typeof value === 'function'): T {
  let current: unknown = module;
  for (let depth = 0; depth < 3 && current != null; depth++) {
    if (accept(current)) return current as T;
    current = (current as { default?: unknown }).default;
  }
  throw new Error('Unexpected module shape.');
}

export const isHandler = (value: unknown): boolean => typeof (value as { isValidSource?: unknown } | null)?.isValidSource === 'function';

/** A named CommonJS export, looked up on the module and its `default` wrappers. */
export function cjsNamed<T>(module: unknown, name: string): T {
  let current: unknown = module;
  for (let depth = 0; depth < 3 && current != null; depth++) {
    const value = (current as Record<string, unknown>)[name];
    if (value !== undefined) return value as T;
    current = (current as { default?: unknown }).default;
  }
  throw new Error(`The module does not export ${name}.`);
}
