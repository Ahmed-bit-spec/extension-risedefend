import { StorageUtils } from '../shared/storage-utils.js';
import { Logger } from '../shared/logger.js';
import { MESSAGE_TYPES } from '../shared/constants.js';
import { logService } from '../services/logService.js';
import { hydrateStorageCache } from '../services/supabaseClient.js';

chrome.runtime.onInstalled.addListener(async () => {
  Logger.info('RiseDefend Extension Installed');
  await hydrateStorageCache();
  
  // Set default initial state if not present
  const data = await StorageUtils.get(['enabled', 'categories', 'stats']);
  if (data.enabled === undefined) {
    await StorageUtils.set({ enabled: true });
  }
  if (!data.categories) {
    await StorageUtils.set({
      categories: {
        PORNOGRAPHY: true,
        GAMBLING: true,
        DRUGS: true
      }
    });
  }
  if (!data.stats) {
    await StorageUtils.set({
      stats: { blockedCount: 0, lastBlockedReason: 'None' }
    });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await hydrateStorageCache();
});

// Accept content script keepalive connections so Chrome does not immediately close the port on injection
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'content-keepalive') {
    console.log('[RiseDefend BG] Content script keepalive port connected');
    port.onDisconnect.addListener(() => {
      console.log('[RiseDefend BG] Content script keepalive port disconnected');
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === MESSAGE_TYPES.CONTENT_BLOCKED) {
    console.log('[RiseDefend BG] Content blocked event received:', request.domain, request.category);
    
    hydrateStorageCache().then(async () => {
      // 1. Update local stats in chrome.storage.local
      try {
        const data = await StorageUtils.get(['stats']);
        const stats = data.stats || { blockedCount: 0, lastBlockedReason: 'None' };
        stats.blockedCount = (Number(stats.blockedCount) || 0) + 1;
        stats.lastBlockedReason = request.reason || request.category;
        await StorageUtils.set({ stats });
      } catch (e) {
        console.error('[RiseDefend BG] Failed updating local stats:', e);
      }

      // 2. Direct database logging (if user is authenticated)
      try {
        await logService.logBlock({
          url: request.url,
          domain: request.domain,
          category: request.category,
          reason: request.reason,
          confidence: request.confidence || 1.0
        });
      } catch (e) {
        console.warn('[RiseDefend BG] Exception logging to database:', e);
      }

      sendResponse({ success: true });
    });
    return true; 
  }
});

