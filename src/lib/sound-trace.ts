/**
 * Reports each played sound's name to `globalThis.__chuaSounds` when a test
 * has put an array there (browser checks read it). Costs nothing otherwise.
 */
export function trace(name: string) {
  const log = (globalThis as { __chuaSounds?: string[] }).__chuaSounds;
  if (Array.isArray(log)) log.push(name);
}
