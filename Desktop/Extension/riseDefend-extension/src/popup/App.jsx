import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  LogOut, 
  EyeOff, 
  Dice5, 
  Pill, 
  Sun, 
  Moon, 
  Lock,
  Mail,
  User,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [enabled, setEnabled] = useState(true);
  const [categories, setCategories] = useState({
    PORNOGRAPHY: true,
    GAMBLING: true,
    DRUGS: true,
  });
  const [stats, setStats] = useState({ blockedCount: 0, lastBlockedReason: 'None' });
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [darkMode, setDarkMode] = useState(true);

  // Auth Form State
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  // 1. Initialize Theme & Extension State
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['protectionEnabled', 'enabled', 'categories', 'stats', 'darkMode'], (data) => {
        const isEnabled = data.protectionEnabled !== undefined ? data.protectionEnabled : (data.enabled !== undefined ? data.enabled : true);
        setEnabled(isEnabled);
        if (data.categories) setCategories(data.categories);
        if (data.stats) setStats(data.stats);
        if (data.darkMode !== undefined) setDarkMode(data.darkMode);
      });

      const listener = (changes, ns) => {
        if (ns === 'local') {
          if (changes.protectionEnabled !== undefined) setEnabled(changes.protectionEnabled.newValue);
          else if (changes.enabled !== undefined) setEnabled(changes.enabled.newValue);
          if (changes.categories) setCategories(changes.categories.newValue);
          if (changes.stats) setStats(changes.stats.newValue);
          if (changes.darkMode !== undefined) setDarkMode(changes.darkMode.newValue);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  // Theme Class Toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // 2. Strict Session Restoration on Load (Waits until storage & Supabase session hydrations complete)
  useEffect(() => {
    let isMounted = true;
    async function verifyAuth() {
      setIsCheckingAuth(true);
      try {
        const currentUser = await authService.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (err) {
        console.warn('Authentication check failed:', err);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsCheckingAuth(false);
      }
    }
    verifyAuth();
    return () => { isMounted = false; };
  }, []);

  const toggleTheme = () => {
    const nextTheme = !darkMode;
    setDarkMode(nextTheme);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ darkMode: nextTheme });
    }
  };

  const toggleMaster = () => {
    const nextState = !enabled;
    setEnabled(nextState);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ protectionEnabled: nextState, enabled: nextState });
    }
  };

  const toggleCategory = (key) => {
    const nextCategories = { ...categories, [key]: !categories[key] };
    setCategories(nextCategories);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ categories: nextCategories });
    }
  };

  // Email/Password Submit Handler
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    setAuthSuccess('');

    if (!email || !password) {
      setAuthError('Please provide both email and password.');
      setLoading(false);
      return;
    }

    try {
      if (authMode === 'signup') {
        const res = await authService.signUpWithEmail(email, password, username);
        if (res?.user) {
          if (res?.session) {
            setUser(res.user);
          } else {
            setAuthSuccess('Account created! Please check your email for confirmation or sign in.');
            setAuthMode('login');
          }
        }
      } else {
        const res = await authService.loginWithEmail(email, password);
        if (res?.user) {
          setUser(res.user);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Handler
  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError('');
    setAuthSuccess('');
    try {
      await authService.loginWithGoogle();
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      } else {
        setAuthError('Sign in succeeded but session could not be established.');
      }
    } catch (err) {
      console.error('Google login error:', err);
      setAuthError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. EXPLICIT INITIAL LOADING STATE
  if (isCheckingAuth) {
    return (
      <div className={`w-[420px] h-[600px] flex items-center justify-center p-6 ${darkMode ? 'dark bg-zinc-950 text-white' : 'bg-white text-zinc-900'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
            <Shield className="w-5 h-5 animate-pulse" />
          </div>
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-zinc-400">Loading RiseDefend...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="w-[420px] h-[600px] flex flex-col justify-between p-5 select-none overflow-hidden transition-colors duration-200 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white leading-none">
                RiseDefend
              </h1>
              <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                AI Protection
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
            </button>

            {user && (
              <button 
                onClick={handleLogout}
                disabled={loading}
                title="Sign Out"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* AUTH GATE: Show Login / Signup Screen if Not Authenticated */}
        {!user ? (
          <div className="flex-1 flex flex-col justify-center px-4 py-4 text-center overflow-y-auto">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-3 border border-orange-500/20">
              <Lock className="w-6 h-6" />
            </div>
            
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
              {authMode === 'login' ? 'Sign In to RiseDefend' : 'Create Account'}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
              {authMode === 'login' ? 'Enter your credentials to activate protection.' : 'Sign up to get started with RiseDefend.'}
            </p>

            {/* Login / Signup Tabs */}
            <div className="flex bg-zinc-200 dark:bg-zinc-900 p-1 rounded-lg mb-4 text-xs font-medium">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                className={`flex-1 py-1.5 rounded-md transition ${authMode === 'login' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm font-semibold' : 'text-zinc-500'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
                className={`flex-1 py-1.5 rounded-md transition ${authMode === 'signup' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm font-semibold' : 'text-zinc-500'}`}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div className="w-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs p-2.5 rounded-xl mb-3 text-left">
                <div className="text-[11px] leading-tight">{authError}</div>
              </div>
            )}

            {authSuccess && (
              <div className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs p-2.5 rounded-xl mb-3 text-left flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <div className="text-[11px] leading-tight">{authSuccess}</div>
              </div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-2.5 text-left mb-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:outline-none focus:border-orange-500 text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:outline-none focus:border-orange-500 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:outline-none focus:border-orange-500 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-1"
              >
                {loading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div></div>
              <div className="relative flex justify-center text-[10px] text-zinc-400 uppercase"><span className="bg-zinc-50 dark:bg-zinc-950 px-2">Or continue with</span></div>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Google OAuth
            </button>

          </div>
        ) : (
          /* DASHBOARD VIEW: Shown Only When Authenticated */
          <div className="flex-1 flex flex-col justify-between pt-4">
            
            {/* Main Status Hero Card */}
            <div className={`p-4 rounded-xl border transition-colors ${
              enabled 
                ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/30' 
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    enabled 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}>
                    {enabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-zinc-900 dark:text-white">
                      {enabled ? 'Protection Active' : 'Protection Paused'}
                    </h2>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      {enabled ? 'Local AI engine analyzing content' : 'Threat detection is turned off'}
                    </p>
                  </div>
                </div>

                {/* Master Switch */}
                <button 
                  onClick={toggleMaster}
                  className={`toggle-switch ${enabled ? 'on' : 'off'}`}
                  aria-label="Toggle Protection"
                >
                  <div className="toggle-switch-thumb" />
                </button>
              </div>
            </div>

            {/* Protected Categories List */}
            <div className="space-y-2 py-3">
              <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
                Category Filters
              </div>

              {/* Adult Content Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <EyeOff className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Adult Content</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Explicit & pornographic media</div>
                  </div>
                </div>
                <button 
                  onClick={() => toggleCategory('PORNOGRAPHY')}
                  disabled={!enabled}
                  className={`toggle-switch ${enabled && categories.PORNOGRAPHY ? 'on' : 'off'} disabled:opacity-30`}
                >
                  <div className="toggle-switch-thumb" />
                </button>
              </div>

              {/* Gambling Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <Dice5 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Gambling & Odds</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Casinos, sportsbooks, betting</div>
                  </div>
                </div>
                <button 
                  onClick={() => toggleCategory('GAMBLING')}
                  disabled={!enabled}
                  className={`toggle-switch ${enabled && categories.GAMBLING ? 'on' : 'off'} disabled:opacity-30`}
                >
                  <div className="toggle-switch-thumb" />
                </button>
              </div>

              {/* Narcotics Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <Pill className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Narcotics & Drugs</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Illicit substances & darknet sales</div>
                  </div>
                </div>
                <button 
                  onClick={() => toggleCategory('DRUGS')}
                  disabled={!enabled}
                  className={`toggle-switch ${enabled && categories.DRUGS ? 'on' : 'off'} disabled:opacity-30`}
                >
                  <div className="toggle-switch-thumb" />
                </button>
              </div>
            </div>

            {/* Bottom Statistics Section */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Blocked</span>
                <span className="text-lg font-black text-zinc-900 dark:text-white mt-1">
                  {stats.blockedCount || 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Last Action</span>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate mt-1">
                  {stats.lastBlockedReason && stats.lastBlockedReason !== 'None' ? stats.lastBlockedReason : 'Clean'}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* Footer User Info Bar */}
        {user && (
          <div className="pt-3 mt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-1.5 truncate max-w-[240px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                {user.user_metadata?.username || user.email}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">Authenticated</span>
          </div>
        )}

      </div>
    </div>
  );
}
