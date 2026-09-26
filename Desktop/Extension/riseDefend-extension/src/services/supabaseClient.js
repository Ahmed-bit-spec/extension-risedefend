import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://izdwxqiuztywtcdrberr.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6ZHd4cWl1enR5d3RjZHJiZXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NDQzMDAsImV4cCI6MjA5NzUyMDMwMH0.BTtDBW-jJVRUMuhV4TB33gIjuPXV7n5Q63gj4RtuEnY';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;

export async function hydrateStorageCache() {
  return Promise.resolve();
}

/**
 * Async Chrome Storage Adapter for Supabase Auth in MV3 Extensions.
 * Supabase Auth JS natively awaits getItem(), setItem(), and removeItem().
 * Using async chrome.storage.local operations guarantees that persisted sessions
 * are reliably retrieved on popup launch before auth initialization finishes.
 */
const chromeStorageAdapter = {
  getItem: async (key) => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime?.lastError) {
            console.warn('[SupabaseClient] Storage getItem error:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(result?.[key] ?? null);
          }
        });
      });
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: async (key, value) => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime?.lastError) {
            console.warn('[SupabaseClient] Storage setItem error:', chrome.runtime.lastError);
          }
          resolve();
        });
      });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: async (key) => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([key], () => {
          if (chrome.runtime?.lastError) {
            console.warn('[SupabaseClient] Storage removeItem error:', chrome.runtime.lastError);
          }
          resolve();
        });
      });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
