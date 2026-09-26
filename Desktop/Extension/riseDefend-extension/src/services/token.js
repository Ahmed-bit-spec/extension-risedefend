const TOKEN_KEY = 'supabase.auth.token';
const SESSION_KEY = 'supabase.auth.session';

export const isValidSession = (session) => {
  if (!session || !session.access_token) return false;
  if (session.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    // Give 30s buffer for token expiration
    if (session.expires_at <= now + 30) {
      return false;
    }
  }
  return true;
};

export const setSession = async (session) => {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      await chrome.storage.local.set({ 
        [SESSION_KEY]: session,
        [TOKEN_KEY]: session?.access_token || null
      });
    } catch (e) {
      console.warn("Failed to set session in chrome local storage", e);
    }
  }
};

export const getSession = async () => {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([SESSION_KEY], (result) => {
          if (chrome.runtime?.lastError) {
            console.warn("chrome.storage get error:", chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(result?.[SESSION_KEY] || null);
          }
        });
      } catch (e) {
        console.warn("Exception getting session from chrome storage", e);
        resolve(null);
      }
    });
  }
  return null;
};

export const clearSession = async () => {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.remove([SESSION_KEY, TOKEN_KEY], () => {
          resolve();
        });
      } catch (e) {
        console.warn("Exception clearing session", e);
        resolve();
      }
    });
  }
};

