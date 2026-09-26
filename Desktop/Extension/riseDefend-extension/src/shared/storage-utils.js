/**
 * StorageUtils
 *
 * Thin wrappers around chrome.storage.local for use in the background
 * service worker and content scripts.
 *
 * Every method wraps the chrome.storage call in a try/catch so that
 * "Extension context invalidated" (thrown when the extension is reloaded
 * while a content script is still running) becomes a graceful fallback
 * rather than an unhandled promise rejection:
 *
 *  • get()  — resolves with {} on error (callers treat missing keys as defaults)
 *  • set()  — resolves silently on error (write is best-effort in content scripts)
 */
export const StorageUtils = {
  async get(keys) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(keys, (result) => {
          // runtime.lastError can be set inside the callback even when no
          // exception was thrown (e.g. quota exceeded, context gone).
          if (chrome.runtime?.lastError) {
            console.warn('[RiseDefend StorageUtils] get lastError:', chrome.runtime.lastError.message);
            resolve({});
          } else {
            resolve(result);
          }
        });
      } catch (e) {
        // Thrown synchronously when extension context is invalidated.
        if (e?.message?.includes('Extension context invalidated')) {
          console.warn('[RiseDefend StorageUtils] Extension context invalidated on get — returning {}');
        } else {
          console.warn('[RiseDefend StorageUtils] Unexpected get error:', e);
        }
        resolve({});
      }
    });
  },

  async set(items) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set(items, () => {
          if (chrome.runtime?.lastError) {
            console.warn('[RiseDefend StorageUtils] set lastError:', chrome.runtime.lastError.message);
          }
          resolve();
        });
      } catch (e) {
        // Thrown synchronously when extension context is invalidated.
        // The write is lost — this is acceptable in a content-script context
        // where the extension is being reloaded anyway.
        if (e?.message?.includes('Extension context invalidated')) {
          console.warn('[RiseDefend StorageUtils] Extension context invalidated on set — write skipped');
        } else {
          console.warn('[RiseDefend StorageUtils] Unexpected set error:', e);
        }
        resolve(); // Always resolve so callers don't hang
      }
    });
  }
};
