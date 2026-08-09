import '@testing-library/jest-dom/vitest'

// Node 20.11+ / 22.4+ / 26 ship an experimental global `localStorage`
// accessor. Vitest's jsdom environment only copies window keys that are
// either not already present on globalThis or are in its own static
// allowlist, so Node's (non-functional without --localstorage-file) global
// silently wins over jsdom's real localStorage implementation. Force jsdom's
// implementation onto globalThis so tests can use localStorage normally.
//
// NOTE: `globalThis.window` is NOT a usable alternative here. In this
// Vitest/jsdom setup (verified against vitest@4.1.10 / Node 26),
// `globalThis.window === globalThis` — it's a self-referential alias, not a
// distinct object carrying jsdom's real localStorage — so reading
// `globalThis.window.localStorage` is identical to reading the broken
// `globalThis.localStorage` this workaround exists to bypass. The
// `globalThis.jsdom.window` object below is a genuinely separate object
// whose `localStorage` is jsdom's real, functional implementation. This is
// an internal Vitest field (undocumented), so this workaround should be
// re-verified on any Vitest version bump.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window
if (jsdomWindow?.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdomWindow.localStorage,
    configurable: true,
    writable: true,
  })
}
