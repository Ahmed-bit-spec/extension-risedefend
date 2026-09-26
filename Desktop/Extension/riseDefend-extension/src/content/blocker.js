import { MESSAGE_TYPES } from '../shared/constants.js';

export const ContentBlocker = {
  block(analysisResult) {
    if (window._rdAlreadyBlocked) return;
    window._rdAlreadyBlocked = true;

    // --- SECURITY HARDENING (Anti-bypass) ---
    try {
      if (document.body) {
        document.body.innerHTML = '';
        document.body.style.backgroundColor = '#0f172a';
        document.body.style.display = 'none';
      }
    } catch (e) {}

    try {
      try {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.CONTENT_BLOCKED,
          category: analysisResult.category,
          reason: analysisResult.reason,
          confidence: analysisResult.confidence || 1.0,
          url: window.location.href,
          domain: window.location.hostname
        }, (response) => {
          // Consumes chrome.runtime.lastError to prevent uncaught lastError messages
          if (typeof chrome !== 'undefined' && chrome.runtime?.lastError) {
            // Consumed safely
          }
        });
      } catch (e) {}

      const blockUrl = new URL(chrome.runtime.getURL('blocked.html'));
      blockUrl.searchParams.set('domain', window.location.hostname);
      blockUrl.searchParams.set('category', analysisResult.category);
      blockUrl.searchParams.set('reason', analysisResult.reason || '');
      blockUrl.searchParams.set('confidence', Math.round(analysisResult.confidence || 100));
      blockUrl.searchParams.set('riskScore', (analysisResult.riskScore || 0).toFixed(2));

      const termsToShow = (analysisResult.matchedTerms && analysisResult.matchedTerms.length > 0)
        ? analysisResult.matchedTerms
        : (analysisResult.signals || []);

      console.log('[RISEDEFEND BLOCKER] Block requested');
      console.log(`[RISEDEFEND BLOCKER] Category: ${analysisResult.category}`);
      console.log(`[RISEDEFEND BLOCKER] Signals: ${termsToShow.join(', ')}`);
      console.log('[RISEDEFEND BLOCKER] Opening blocked.html');

      blockUrl.searchParams.set('signals', JSON.stringify(termsToShow));

      window.location.replace(blockUrl.toString());

    } catch (contextError) {
      if (contextError?.message?.includes('Extension context invalidated')) {
        console.warn(
          '[RiseDefend] Extension context invalidated during block — ' +
          'extension was reloaded. Redirect skipped.'
        );
      } else {
        throw contextError;
      }
    }
  }
};
