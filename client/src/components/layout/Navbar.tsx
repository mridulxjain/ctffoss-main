import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Flag,
  Trophy,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Check,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, getLoginUrl } from '../../lib/api';
import type { Role, CompetitionConfigDTO } from '@fossctf/shared';
import { SparkLoader } from '../common/SparkLoader';
import { RoleBadge } from '../common/RoleBadge';

interface DevPersonaGroup {
  group: string;
  personas: Array<{ role: Role; username: string; email: string; label: string }>;
}

const DEV_PERSONA_GROUPS: DevPersonaGroup[] = [
  {
    group: 'Byte Bandits',
    personas: [
      { role: 'USER', username: 'byte_bandit_1', email: 'byte1@example.test', label: 'Byte Bandit 1' },
      { role: 'USER', username: 'byte_bandit_2', email: 'byte2@example.test', label: 'Byte Bandit 2' },
      { role: 'USER', username: 'byte_bandit_3', email: 'byte3@example.test', label: 'Byte Bandit 3' },
      { role: 'USER', username: 'byte_bandit_4', email: 'byte4@example.test', label: 'Byte Bandit 4' },
    ],
  },
  {
    group: 'Segfault Society',
    personas: [
      { role: 'USER', username: 'segfault_1', email: 'segfault1@example.test', label: 'Segfault 1' },
      { role: 'USER', username: 'segfault_2', email: 'segfault2@example.test', label: 'Segfault 2' },
      { role: 'USER', username: 'segfault_3', email: 'segfault3@example.test', label: 'Segfault 3' },
      { role: 'USER', username: 'segfault_4', email: 'segfault4@example.test', label: 'Segfault 4' },
    ],
  },
  {
    group: 'Kernel Panic',
    personas: [
      { role: 'USER', username: 'kernel_panic_1', email: 'kernel1@example.test', label: 'Kernel Panic 1' },
      { role: 'USER', username: 'kernel_panic_2', email: 'kernel2@example.test', label: 'Kernel Panic 2' },
      { role: 'USER', username: 'kernel_panic_3', email: 'kernel3@example.test', label: 'Kernel Panic 3' },
      { role: 'USER', username: 'kernel_panic_4', email: 'kernel4@example.test', label: 'Kernel Panic 4' },
    ],
  },
  {
    group: 'Ctrl Alt Elite',
    personas: [
      { role: 'USER', username: 'ctrl_alt_1', email: 'ctrl1@example.test', label: 'Ctrl Alt 1' },
      { role: 'USER', username: 'ctrl_alt_2', email: 'ctrl2@example.test', label: 'Ctrl Alt 2' },
      { role: 'USER', username: 'ctrl_alt_3', email: 'ctrl3@example.test', label: 'Ctrl Alt 3' },
      { role: 'USER', username: 'ctrl_alt_4', email: 'ctrl4@example.test', label: 'Ctrl Alt 4' },
    ],
  },
  {
    group: 'Platform Admin',
    personas: [
      { role: 'ADMIN', username: 'mridulxjain', email: 'krishnajain2604@gmail.com', label: 'mridulxjain (Admin)' },
      { role: 'ADMIN', username: 'foss_admin', email: 'admin@fossclub.tech', label: 'Platform Admin (foss_admin)' },
    ],
  },
  {
    group: 'Unassigned (Solo)',
    personas: [
      { role: 'USER', username: 'charlie_solo', email: 'charlie@university.edu', label: 'Charlie (No Team)' },
    ],
  },
];

export const Navbar: React.FC = () => {
  const { user, team, isLoading, loginDev, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [devDropdownOpen, setDevDropdownOpen] = useState(false);
  const [, setCompConfig] = useState<CompetitionConfigDTO | null>(null);

  // Authentication submission guard & state
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const authenticatingRef = useRef(false);
  const switchingPersonaRef = useRef(false);

  // Admin privileges check (supporting OIDC role extraction, DB role, or mridulxjain)
  const isAdminUser =
    user?.role === 'ADMIN' ||
    user?.clubRole === 'admin' ||
    user?.username?.toLowerCase() === 'mridulxjain';

  // Navigation items with custom pastel colors for neobrutalist active states
  const navItems = [
    {
      label: 'Loventia',
      path: '/challenges',
      icon: Flag,
      activeClasses: 'bg-blue-950/40 text-blue-200 border-2 border-blue-400 shadow-[2px_2px_0px_#60a5fa]',
      activeIconClasses: 'text-blue-300 fill-blue-400/60',
      mobileActiveClass: 'bg-blue-950/50 text-blue-200 border border-blue-400/50',
    },
    {
      label: 'Leaderboard',
      path: '/competition/leaderboard',
      icon: Trophy,
      activeClasses: 'bg-amber-950/30 text-amber-100 border-2 border-amber-200 shadow-[2px_2px_0px_#fde68a]',
      activeIconClasses: 'text-amber-200 fill-amber-300/70',
      mobileActiveClass: 'bg-amber-950/40 text-amber-100 border border-amber-300/50',
    },
    {
      label: 'Squad',
      path: '/team',
      icon: Users,
      activeClasses: 'bg-pink-950/30 text-pink-200 border-2 border-pink-400 shadow-[2px_2px_0px_#f472b6]',
      activeIconClasses: 'text-pink-300 fill-pink-400/60',
      mobileActiveClass: 'bg-pink-950/40 text-pink-200 border border-pink-400/50',
    },
    ...(isAdminUser
      ? [
          {
            label: 'Admin',
            path: '/admin/challenges',
            icon: Shield,
            activeClasses: 'bg-cyan-950/40 text-cyan-200 border-2 border-cyan-400 shadow-[2px_2px_0px_#22d3ee]',
            activeIconClasses: 'text-cyan-300 fill-cyan-400/60',
            mobileActiveClass: 'bg-cyan-950/40 text-cyan-200 border border-cyan-400/50',
          },
        ]
      : []),
  ];

  useEffect(() => {
    api.get('/competition').then(setCompConfig).catch(() => null);
    const interval = setInterval(() => {
      api.get('/competition').then(setCompConfig).catch(() => null);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check for OIDC error redirects in URL query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errCode = params.get('auth_error');
    if (errCode) {
      let friendlyMsg = 'Authentication could not be completed. Please try again.';
      if (errCode === 'INVALID_TRANSACTION') {
        friendlyMsg = 'Authentication session expired. Please sign in again.';
      } else if (errCode === 'INVALID_STATE') {
        friendlyMsg = 'Security validation failed. Please try signing in again.';
      } else if (errCode === 'OIDC_CALLBACK_ERROR' || errCode === 'access_denied') {
        friendlyMsg = 'Sign-in was cancelled or declined by the identity provider.';
      } else if (errCode === 'ACCOUNT_CONFLICT_UNLINKED') {
        friendlyMsg = 'An account with this email already exists under a different identity.';
      }
      setAuthError(friendlyMsg);

      // Clean the query parameter from URL without page reload
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete('auth_error');
      const cleanSearch = nextParams.toString();
      const cleanPath = `${location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}`;
      window.history.replaceState({}, '', cleanPath);
    }
  }, [location.search, location.pathname]);

  // Robust Sign-In submission handler with synchronous guard
  const handleSignIn = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Synchronous guard against rapid clicks or repeated Enter presses
    if (authenticatingRef.current) return;
    authenticatingRef.current = true;
    setIsAuthenticating(true);
    setAuthError(null);

    // Timeout safety guard (resets if network drops or redirection stalls)
    const safetyTimeout = setTimeout(() => {
      if (authenticatingRef.current) {
        authenticatingRef.current = false;
        setIsAuthenticating(false);
        setAuthError('Sign-in request timed out. Please try again.');
      }
    }, 12000);

    try {
      // Request OIDC login initialization with JSON accept header to safely obtain redirect URL
      const res = await api.get<{ authorizationUrl?: string }>('/auth/login', {
        headers: { Accept: 'application/json' },
      });

      clearTimeout(safetyTimeout);

      if (res?.authorizationUrl) {
        window.location.assign(res.authorizationUrl);
      } else {
        window.location.assign(getLoginUrl());
      }
    } catch (err: any) {
      clearTimeout(safetyTimeout);
      authenticatingRef.current = false;
      setIsAuthenticating(false);
      setAuthError(err?.message || 'Failed to initiate sign-in. Please try again.');
    }
  };

  // Keyboard handler to prevent repeated Enter key submissions
  const handleSignInKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSignIn(e);
    }
  };

  const handlePersonaSelect = async (persona: { role: Role; username: string; email: string }) => {
    if (switchingPersonaRef.current) return;
    switchingPersonaRef.current = true;
    try {
      await loginDev(persona.role, persona.username, persona.email);
      setDevDropdownOpen(false);
      if (persona.role !== 'ADMIN' && location.pathname.startsWith('/admin')) {
        navigate('/challenges', { replace: true });
      }
    } catch (err: any) {
      console.error('Failed to switch dev persona:', err);
    } finally {
      switchingPersonaRef.current = false;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          {/* Left: Brand + Desktop Nav */}
          <div className="flex items-center gap-6 lg:gap-8 min-w-0">
            {/* Logo / Brand with Favicon Pixel Art Logo */}
            <Link
              to="/challenges"
              className="flex items-center gap-2.5 sm:gap-3 group shrink-0"
              aria-label="FOSS CTF Home"
            >
              <img
                src="/ctf_foss_pixel_brutalist_favicon_256.png"
                alt="FOSS CTF Logo"
                className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-[2px_2px_0px_#000] group-hover:scale-105 group-active:translate-y-0.5 transition-all select-none"
              />
              <span className="font-mono font-bold text-base tracking-tight text-zinc-100 group-hover:text-emerald-400 transition-colors uppercase">
                UFC<span className="text-emerald-400 font-mono text-xs sm:text-sm ml-0.5">_CTF</span>
              </span>
            </Link>

            {/* Desktop Navigation Links (Neobrutalist Pastel Cyber Tabs) */}
            <nav className="hidden md:flex items-center gap-2" aria-label="Main Navigation">
              {navItems.map((item) => {
                const isActive =
                  item.path === '/challenges'
                    ? location.pathname === '/' || location.pathname === '/challenges'
                    : location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all whitespace-nowrap ${
                      isActive
                        ? item.activeClasses
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 transition-colors ${
                        isActive ? item.activeIconClasses : 'text-zinc-500'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Controls & User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {/* Dev Persona Switcher (Development Only) */}
            {import.meta.env.DEV && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDevDropdownOpen(!devDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-mono font-bold text-zinc-300 hover:text-zinc-100 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all select-none"
                  title="Switch local dev account"
                  aria-expanded={devDropdownOpen}
                  aria-haspopup="true"
                >
                  <span className="w-1.5 h-1.5 bg-emerald-400 animate-pulse motion-reduce:animate-none" />
                  <span className="truncate max-w-[90px] sm:max-w-[120px]">
                    {user ? user.username : 'DEV AUTH'}
                  </span>
                  <span className="text-[9px] px-1 py-0.2 font-mono font-black bg-amber-400 text-black border border-black shadow-[1px_1px_0px_#000]">
                    DEV
                  </span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>

                {devDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setDevDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border-2 border-black py-1.5 shadow-[4px_4px_0px_#000] z-40 text-xs max-h-[380px] overflow-y-auto">
                      <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 border-b border-zinc-800 flex items-center justify-between">
                        <span>Dev Test Personas</span>
                        <span className="text-amber-400 font-medium">16 Accounts</span>
                      </div>
                      {DEV_PERSONA_GROUPS.map((grp) => (
                        <div key={grp.group} className="border-b border-zinc-800/50 last:border-0 pb-1">
                          <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                            {grp.group}
                          </div>
                          {grp.personas.map((p) => {
                            const isSelected = user?.username === p.username;
                            return (
                              <button
                                key={p.username}
                                type="button"
                                onClick={() => handlePersonaSelect(p)}
                                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800/70 transition-colors ${isSelected ? 'text-emerald-400 font-medium bg-emerald-500/10' : 'text-zinc-300'
                                  }`}
                              >
                                <div className="truncate">
                                  <span className="block truncate text-xs">{p.label}</span>
                                  <span className="block truncate font-mono text-[10px] text-zinc-500">{p.email}</span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400 ml-2" />}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Team Identity badge */}
            {team && (
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 bg-zinc-900 border-2 border-black shadow-[2px_2px_0px_#000] text-xs text-zinc-300 font-mono font-bold uppercase">
                <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[120px] text-zinc-200">{team.name}</span>
              </div>
            )}

            {/* User Profile / Logout OR Sign-In Button (Neobrutalism) */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-zinc-900 border-2 border-black shadow-[2px_2px_0px_#000]">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="w-5 h-5 rounded-none border border-emerald-400 object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-5 h-5 bg-emerald-400 border border-black flex items-center justify-center font-mono text-[10px] font-black text-black">
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="font-mono text-xs text-zinc-100 font-bold max-w-[100px] sm:max-w-[130px] truncate uppercase tracking-wider">
                    {user.username}
                  </span>
                  <RoleBadge user={user} tooltipPlacement="bottom-right" />
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  title="Sign out"
                  aria-label="Sign out"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 hover:bg-rose-500 text-zinc-300 hover:text-black border-2 border-black font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                >
                  <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">LOGOUT</span>
                </button>
              </div>
            ) : isLoading ? (
              /* Verification Skeleton with Spark Loader */
              <div
                className="flex items-center gap-2.5 px-3 py-1.5 bg-zinc-900 border-2 border-black shadow-[2px_2px_0px_#000] font-mono text-xs font-bold text-zinc-300 uppercase select-none"
                aria-label="Verifying authentication session"
              >
                <SparkLoader sparkClassName="text-emerald-400" />
                <span>SYNCING...</span>
              </div>
            ) : (
              /* Neobrutalist Sign In Button with Spark Loader */
              <button
                type="button"
                onClick={handleSignIn}
                onKeyDown={handleSignInKeyDown}
                disabled={isAuthenticating}
                aria-busy={isAuthenticating}
                aria-label={isAuthenticating ? 'Authenticating sign in request' : 'Sign In'}
                className="relative inline-flex items-center justify-center gap-2 h-9 px-4 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 disabled:bg-amber-400 text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000] font-mono font-black text-xs sm:text-sm uppercase tracking-wider transition-all select-none disabled:cursor-wait"
              >
                {isAuthenticating ? (
                  <span className="flex items-center gap-2">
                    <SparkLoader sparkClassName="text-black" />
                    <span>AUTHENTICATING...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span>SIGN IN</span>
                    <span className="font-black">&gt;</span>
                  </span>
                )}
              </button>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 bg-zinc-900 border-2 border-black shadow-[2px_2px_0px_#000] text-zinc-300 hover:text-white"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800/80 bg-zinc-950 px-4 py-3 space-y-2">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.path === '/challenges'
                    ? location.pathname === '/' || location.pathname === '/challenges'
                    : location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-mono font-medium transition-colors ${
                      isActive
                        ? item.mobileActiveClass
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? item.activeIconClasses : 'text-zinc-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {team && (
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono text-zinc-400 px-3 py-1">
                <span className="text-[10px] uppercase text-zinc-500">Squad:</span>
                <span className="text-zinc-200 font-semibold">{team.name}</span>
              </div>
            )}

            {user && (
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono text-zinc-300 px-3 py-1">
                <span className="text-[10px] uppercase text-zinc-500">Identity:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-100 uppercase">{user.username}</span>
                  <RoleBadge user={user} showText />
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Dismissible Auth Error Banner */}
      {authError && (
        <div className="w-full bg-rose-950/70 border-b border-rose-800/80 px-4 py-2 transition-all">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs font-mono text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{authError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="px-2 py-0.5 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-900/40 text-[11px] font-mono transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
};
