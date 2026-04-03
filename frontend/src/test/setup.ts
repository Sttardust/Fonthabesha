import '@testing-library/jest-dom';

// Silence "Error: Not implemented: navigation" from jsdom
const noop = () => {};
Object.defineProperty(window, 'scrollTo', { value: noop, writable: true });

// Stub FontFace API (not available in jsdom)
if (!('FontFace' in globalThis)) {
  class MockFontFace {
    family: string;
    constructor(family: string) { this.family = family; }
    load() { return Promise.resolve(this); }
  }
  Object.defineProperty(globalThis, 'FontFace', { value: MockFontFace });
  Object.defineProperty(document, 'fonts', {
    value: {
      add: noop,
      check: () => false,
      has: () => false,
    },
  });
}

// Stub IntersectionObserver
globalThis.IntersectionObserver = class {
  observe   = noop;
  unobserve = noop;
  disconnect = noop;
  constructor(_cb: unknown, _opts?: unknown) {}
} as unknown as typeof IntersectionObserver;

// Stub crypto.subtle.digest (used by useUpload SHA-256)
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      subtle: {
        digest: async (_alg: string, _buf: ArrayBuffer) =>
          new Uint8Array(32).buffer,
      },
    },
    writable: true,
  });
}
