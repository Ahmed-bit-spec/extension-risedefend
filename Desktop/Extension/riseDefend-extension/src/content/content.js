import { Scanner } from './scanner.js';

/**
 * Content Script Entry Point & Lifecycle Management
 *
 * In Chrome MV3, background service workers go to sleep after ~30s of inactivity.
 * When the service worker sleeps, ports connected via chrome.runtime.connect() disconnect.
 * When pages are navigated or entered into Back/Forward Cache (bfcache), ports also disconnect.
 *
 * IMPORTANT: A port disconnection when chrome.runtime.id IS STILL VALID means the service worker
 * simply went idle or page entered bfcache — the extension context is alive and protection MUST REMAIN ACTIVE.
 *
 * Consuming chrome.runtime.lastError prevents Chrome from logging "Unchecked runtime.lastError"
 * when pages are moved into back/forward cache.
 */

let observer = null;
let isAlive = true;

function isContextValid() {
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  } catch (e) {
    return false;
  }
}

function setupKeepalive() {
  if (!isContextValid()) {
    isAlive = false;
    return;
  }

  try {
    const port = chrome.runtime.connect({ name: 'content-keepalive' });

    port.onDisconnect.addListener(() => {
      // Consume lastError to prevent uncaught runtime.lastError on BFCache / idle disconnect
      if (typeof chrome !== 'undefined' && chrome.runtime?.lastError) {
        // Consumed safely
      }

      // Check if context is TRULY invalidated (extension reloaded/disabled/uninstalled)
      if (!isContextValid()) {
        isAlive = false;

        if (observer) {
          observer.disconnect();
          observer = null;
        }

        Scanner.teardown();

        console.warn(
          '[RiseDefend] Extension context disconnected — content script torn down.' +
          ' Reload the page to re-activate protection.'
        );
      } else {
        // Service worker simply went idle or tab entered BFCache (normal MV3 lifecycle).
        // Protection remains fully active.
        console.log('[RiseDefend CONTENT] Service worker idle — protection remains active.');
      }
    });
  } catch (e) {
    if (!isContextValid()) {
      isAlive = false;
    }
  }
}

setupKeepalive();

// ── Main Observer / Scan Loop ─────────────────────────────────────────

function observeApp() {
  if (!isAlive || !isContextValid()) return;

  // Fire initial scan
  Scanner.scan();

  if (document.body) {
    observer = new MutationObserver(() => {
      if (!isAlive || !isContextValid()) {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        return;
      }
      Scanner.scan();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }
}

try {
  if (isContextValid() && chrome?.storage?.local) {
    chrome.storage.local.get(['protectionEnabled', 'enabled'], (res) => {
      if (chrome.runtime?.lastError) {
        // Consumed
        return;
      }
      const isEnabled = res?.protectionEnabled !== undefined ? res.protectionEnabled : (res?.enabled !== undefined ? res.enabled : true);
      console.log(`[RISEDEFEND CONTENT] Content script loaded | Hostname: ${window.location.hostname} | Protection enabled: ${isEnabled}`);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes.protectionEnabled || changes.enabled || changes.categories)) {
        if (isContextValid()) {
          console.log('[RISEDEFEND CONTENT] Settings updated dynamically — re-scanning page');
          Scanner.scan();
        }
      }
    });
  }
} catch (e) {}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeApp);
} else {
  observeApp();
}
