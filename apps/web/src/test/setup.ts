import '@testing-library/jest-dom/vitest'

// Node 20.11+ / 22.4+ / 26 ship an experimental global `localStorage`
// accessor. Vitest's jsdom environment only copies window keys that are
// either not already present on globalThis or are in its own static
// allowlist, so Node's (non-functional without --localstorage-file) global
// silently wins over jsdom's real localStorage implementation. Force jsdom's
// implementation onto globalThis so tests can use localStorage normally.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window
if (jsdomWindow?.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdomWindow.localStorage,
    configurable: true,
    writable: true,
  })
}
