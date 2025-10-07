declare global {
  interface ProcessPolyfill {
    env: Record<string, string>;
  }

  // eslint-disable-next-line no-var
  var process: ProcessPolyfill | undefined;
}

if (typeof globalThis.process === "undefined") {
  globalThis.process = { env: {} } as ProcessPolyfill;
} else if (typeof globalThis.process.env !== "object" || globalThis.process.env === null) {
  globalThis.process.env = {};
}

export {};
