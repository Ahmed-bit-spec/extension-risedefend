import { supabase } from './supabaseClient';

export const authService = {
  /**
   * Email / Password Login
   */
  async loginWithEmail(email, password) {
    console.log('[RISEDEFEND AUTH] Signing in with email/password...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data?.user) {
      await this.ensureUserRecord(data.user);
    }
    return data;
  },

  /**
   * Email / Password Sign Up
   */
  async signUpWithEmail(email, password, username) {
    console.log('[RISEDEFEND AUTH] Creating new user account...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
    if (error) throw error;
    if (data?.user) {
      await this.ensureUserRecord(data.user);
    }
    return data;
  },

  /**
   * Google OAuth login via Chrome Identity WebAuthFlow & Supabase
   */
  async loginWithGoogle() {
    if (typeof chrome === 'undefined' || !chrome.identity) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
      return data;
    }

    const redirectUrl = chrome.identity.getRedirectURL();
    console.log('[RISEDEFEND AUTH] Extension Redirect URL for Google Cloud Console:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      if (error.message?.includes('provider is not enabled') || error.msg?.includes('provider is not enabled') || error.error_code === 'validation_failed') {
        throw new Error('Google Auth is disabled in Supabase. Please use Email/Password sign in below.');
      }
      throw error;
    }

    if (data?.url) {
      const authUrl = data.url;
      console.log('[RISEDEFEND AUTH] Launching WebAuthFlow with URL:', authUrl);

      let responseUrl = null;
      try {
        responseUrl = await new Promise((resolve, reject) => {
          chrome.identity.launchWebAuthFlow(
            {
              url: authUrl,
              interactive: true,
            },
            (callbackUrl) => {
              if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message || 'Authorization page could not be loaded.'));
              }
              if (!callbackUrl) {
                return reject(new Error('No response URL received from Google Authentication.'));
              }
              resolve(callbackUrl);
            }
          );
        });
      } catch (flowErr) {
        console.warn('[RISEDEFEND AUTH] launchWebAuthFlow failed:', flowErr.message);
        throw new Error('Google Sign-In failed. Please use Email/Password sign in.');
      }

      let code = null;
      let accessToken = null;
      let refreshToken = null;

      try {
        const urlObj = new URL(responseUrl);
        code = urlObj.searchParams.get('code');
        accessToken = urlObj.searchParams.get('access_token');
        refreshToken = urlObj.searchParams.get('refresh_token');

        if (urlObj.hash) {
          const hashParams = new URLSearchParams(urlObj.hash.substring(1));
          if (!code) code = hashParams.get('code');
          if (!accessToken) accessToken = hashParams.get('access_token');
          if (!refreshToken) refreshToken = hashParams.get('refresh_token');
        }
      } catch (parseErr) {
        console.warn('[RISEDEFEND AUTH] Error parsing callback URL:', parseErr);
      }

      let sessionData = null;

      if (code) {
        const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        sessionData = exchanged;
      } else if (accessToken) {
        const { data: setRes, error: setErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        if (setErr) throw setErr;
        sessionData = setRes;
      }

      if (!sessionData?.session) {
        const { data: currentSuba } = await supabase.auth.getSession();
        if (currentSuba?.session) {
          sessionData = currentSuba;
        }
      }

      if (sessionData?.session) {
        await this.ensureUserRecord(sessionData.session.user);
        console.log('[RISEDEFEND AUTH] Google Session established successfully.');
        return sessionData;
      }
    }
    throw new Error('Failed to retrieve authentication tokens from Google.');
  },

  /**
   * Log Out — Signs out from Supabase and clears persistent storage via chromeStorageAdapter
   */
  async logout() {
    console.log('[RISEDEFEND AUTH] Logging out from Supabase...');
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[RISEDEFEND AUTH] Logout error:', error);
    }
  },

  /**
   * Get Currently Authenticated User from Persistent Supabase Session
   */
  async getCurrentUser() {
    try {
      // getSession() triggers async chromeStorageAdapter retrieval
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      
      if (sessionErr) {
        console.warn('[RISEDEFEND AUTH] Error getting session:', sessionErr.message);
        return null;
      }

      if (!session || !session.access_token) {
        console.log('[RISEDEFEND AUTH] No persisted Supabase session found.');
        return null;
      }

      // Check token expiration (with 30s buffer)
      if (session.expires_at) {
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (session.expires_at <= nowSeconds + 30) {
          console.log('[RISEDEFEND AUTH] Session expired. Attempting token refresh...');
          const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
          if (refreshErr || !refreshed?.session) {
            console.warn('[RISEDEFEND AUTH] Token refresh failed:', refreshErr?.message);
            return null;
          }
          return refreshed.session.user;
        }
      }

      console.log('[RISEDEFEND AUTH] Session verified | User:', session.user.email);
      return session.user;
    } catch (err) {
      console.warn('[RISEDEFEND AUTH] Exception in getCurrentUser:', err?.message || err);
      return null;
    }
  },

  /**
   * Ensures public.users record exists for user metadata
   */
  async ensureUserRecord(user) {
    if (!user) return;
    try {
      const displayName =
        user.user_metadata?.username ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'User';

      const { data, error } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        return; // Optional schema gracefully ignored
      }

      if (!data) {
        await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            display_name: displayName,
          });
      }
    } catch (err) {
      console.warn('[RISEDEFEND AUTH] Exception in ensureUserRecord:', err);
    }
  }
};
