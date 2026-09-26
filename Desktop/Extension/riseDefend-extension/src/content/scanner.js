import { AIAnalyzer } from './ai/ai-analyzer.js';
import { AdaptiveScoring } from './ai/adaptive-scoring.js';
import { DOMExtractor } from './extractor.js';
import { ContentBlocker } from './blocker.js';

/**
 * isContextValid()
 *
 * Cheapest synchronous probe for whether the extension context is still
 * alive. chrome.runtime.id is only readable in a valid context — accessing
 * it throws (or returns undefined) after the extension has been reloaded.
 */
function isContextValid() {
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

/**
 * safeLog()
 * Only emits the warn if the message contains the expected invalidation text.
 * Re-throws unexpected errors so they remain visible.
 */
function handleScanError(err, label) {
  if (err?.message?.includes('Extension context invalidated')) {
    console.warn(`[RiseDefend ${label}] Extension context invalidated — aborting.`);
  } else {
    // Preserve visibility of genuine bugs.
    console.error(`[RiseDefend ${label}] Unexpected error:`, err);
  }
}

function isExcludedDomain() {
  try {
    const href = (window.location.href || '').toLowerCase();
    const hostname = (window.location.hostname || '').toLowerCase();
    const pathname = (window.location.pathname || '').toLowerCase();

    if (href.includes('blocked.html') || href.startsWith('chrome-extension://')) {
      return true;
    }
    // Exclude Next.js auth app routes specifically so the auth dashboard isn't scanned
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && (pathname.startsWith('/dashboard') || pathname.startsWith('/login') || pathname.startsWith('/auth'))) {
      return true;
    }
    if (hostname === 'supabase.com' || hostname.endsWith('.supabase.com') || hostname.endsWith('.supabase.co')) {
      return true;
    }
  } catch (e) {}
  return false;
}

export const Scanner = {
  _isScanning: false,
  _scanTimeout: null,
  _hasRunInitial: false,

  teardown() {
    if (this._scanTimeout) {
      clearTimeout(this._scanTimeout);
      this._scanTimeout = null;
    }
    this._isScanning = false;
  },

  scan() {
    if (window._rdAlreadyBlocked) return;
    if (isExcludedDomain()) return;
    if (!isContextValid()) return;

    if (!this._hasRunInitial) {
      this._hasRunInitial = true;
      // ── FIX #1 ─────────────────────────────────────────────────────────
      // _runAtomicLock() is async. Calling it without .catch() means any
      // rejection it produces (including "Extension context invalidated")
      // becomes an *unhandled* promise rejection. Adding .catch() here
      // converts it into a handled, logged warning.
      this._runAtomicLock().catch(err => handleScanError(err, 'Scanner/initial'));
      return;
    }

    if (this._scanTimeout) {
      clearTimeout(this._scanTimeout);
    }

    this._scanTimeout = setTimeout(() => {
      // ── FIX #1 (same fix, debounce path) ───────────────────────────────
      this._runAtomicLock().catch(err => handleScanError(err, 'Scanner/debounce'));
    }, 500);
  },

  async _runAtomicLock() {
    if (!isContextValid()) return;
    if (this._isScanning || window._rdAlreadyBlocked) return;
    this._isScanning = true;

    try {
      await this._performScan();
    } catch (err) {
      // ── FIX #2 ─────────────────────────────────────────────────────────
      // Previously this was try/finally with NO catch. Any rejection from
      // _performScan() would propagate upward and become an unhandled
      // rejection at the scan() call site (which also lacked .catch()).
      // Now errors are caught here first, before the .catch() at the call
      // site acts as a last-resort backstop.
      handleScanError(err, 'Scanner/_runAtomicLock');
    } finally {
      this._isScanning = false;
    }
  },

  async _performScan() {
    // ── Read settings from chrome.storage ─────────────────────────────────
    const data = await new Promise(resolve => {
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['protectionEnabled', 'enabled', 'categories'], (result) => {
            if (chrome.runtime?.lastError) {
              console.warn('[RiseDefend Scanner] storage.get lastError:', chrome.runtime.lastError.message);
              resolve({ protectionEnabled: true, enabled: true, categories: { PORNOGRAPHY: true, GAMBLING: true, DRUGS: true } });
            } else {
              const isEnabled = result.protectionEnabled !== undefined ? result.protectionEnabled : (result.enabled !== undefined ? result.enabled : true);
              resolve({ protectionEnabled: isEnabled, enabled: isEnabled, categories: result.categories });
            }
          });
        } else {
          resolve({ protectionEnabled: true, enabled: true, categories: { PORNOGRAPHY: true, GAMBLING: true, DRUGS: true } });
        }
      } catch (e) {
        if (e?.message?.includes('Extension context invalidated')) {
          console.warn('[RiseDefend Scanner] Extension context invalidated reading storage — skipping scan.');
        } else {
          console.warn('[RiseDefend Scanner] Unexpected storage error:', e);
        }
        resolve({ protectionEnabled: true, enabled: true, categories: { PORNOGRAPHY: true, GAMBLING: true, DRUGS: true } });
      }
    });

    if (data.protectionEnabled === false || data.enabled === false) {
      console.log('[RISEDEFEND SCANNER] Protection is OFF — scan aborted');
      return;
    }
    if (window._rdAlreadyBlocked) return;

    // Final context check before heavier analysis + potential block.
    if (!isContextValid()) return;

    console.log('[RISEDEFEND SCANNER] Scan started');

    const hostname = window.location.hostname;
    const profile = await AdaptiveScoring.getDomainProfile(hostname);
    const pageText = DOMExtractor.extractText(50000);

    console.log(`[RISEDEFEND SCANNER] Text length: ${pageText.length}`);
    console.log('[RISEDEFEND SCANNER] Fast scan completed');
    console.log('[RISEDEFEND SCANNER] Detailed analysis started');

    const result = AIAnalyzer.analyzeText(pageText, {
      hostname: hostname,
      title: document.title,
      referrer: document.referrer,
      pathname: window.location.pathname,
      search: window.location.search,
      riskMultiplier: profile.riskMultiplier,
      categories: data.categories || { PORNOGRAPHY: true, GAMBLING: true, DRUGS: true }
    });

    if (result.block) {
      console.log(`[RISEDEFEND SCANNER] Decision: BLOCK | Category: ${result.category}`);
    } else {
      console.log('[RISEDEFEND SCANNER] Decision: SAFE');
    }

    const isSuspicious = result.block || result.riskScore >= 2.0;

    AdaptiveScoring.updateDomainProfile(hostname, isSuspicious, result.riskScore, 2.4)
      .catch(err => handleScanError(err, 'Scanner/updateDomainProfile'));

    if (result.block && !window._rdAlreadyBlocked) {
      ContentBlocker.block(result);
    }
  }
};
