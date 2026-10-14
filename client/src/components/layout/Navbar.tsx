import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Flag, Trophy, Users, LogOut, Menu, X, ChevronDown, Check, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, getLoginUrl } from '../../lib/api';
import type { Role, CompetitionConfigDTO } from '@fossctf/shared';

export const Navbar: React.FC = () => {
  const { user, team, loginDev, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [devDropdownOpen, setDevDropdownOpen] = useState(false);
  const [compConfig, setCompConfig] = useState<CompetitionConfigDTO | null>(null);

  useEffect(() => {
    api.get('/competition').then(setCompConfig).catch(() => null);
    const interval = setInterval(() => {
      api.get('/competition').then(setCompConfig).catch(() => null);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: '01 // LOVENTIA', path: '/challenges', icon: Flag },
    { label: '02 // LEADERBOARD', path: '/competition/leaderboard', icon: Trophy },
    { label: '03 // SQUAD', path: '/team', icon: Users },
    ...(user?.role === 'ADMIN' ? [{ label: '⚡ ADMIN', path: '/admin/challenges', icon: Shield }] : []),
  ];

  interface DevPersonaGroup {
    group: string;
    personas: Array<{ role: Role; username: string; email: string; label: string }>;
  }

  const devPersonaGroups: DevPersonaGroup[] = [
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
        { role: 'ADMIN', username: 'foss_admin', email: 'admin@fossclub.tech', label: 'Platform Admin' },
      ],
    },
    {
      group: 'Unassigned (Solo)',
      personas: [
        { role: 'USER', username: 'charlie_solo', email: 'charlie@university.edu', label: 'Charlie (No Team)' },
      ],
    },
  ];

  const handlePersonaSelect = async (persona: { role: Role; username: string; email: string }) => {
    try {
      await loginDev(persona.role, persona.username, persona.email);
      setDevDropdownOpen(false);
      // Immediately kick non-admin users out of admin routes
      if (persona.role !== 'ADMIN' && location.pathname.startsWith('/admin')) {
        navigate('/challenges', { replace: true });
      }
    } catch (err: any) {
      console.error('Failed to switch dev persona:', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-[#070709]/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        {/* Left: Brand + Nav links */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link to="/challenges" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded bg-zinc-950 border border-emerald-500/80 flex items-center justify-center font-mono text-sm sm:text-base font-black text-emerald-400 shadow-[2px_2px_0px_#10b981] group-hover:shadow-[3px_3px_0px_#10b981] transition-all">
              &gt;_
            </div>
            <div className="flex items-center gap-2 leading-none">
              <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-100 group-hover:text-emerald-400 transition-colors uppercase font-mono">
                UFC<span className="text-emerald-400 font-mono text-xs sm:text-sm ml-0.5">_CTF</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                SYS.ONLINE
              </span>
            </div>
          </Link>

          {/* Streamlined Desktop Navigation (Only 3 participant links + Admin) */}
          <nav className="hidden md:flex items-center gap-1.5">
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
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-mono font-bold tracking-wider rounded transition-all ${isActive
                      ? 'bg-zinc-900 text-emerald-400 border border-emerald-500/80 shadow-[2px_2px_0px_#10b981]'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Controls & User Profile */}
        <div className="flex items-center gap-3">
          {/* Discreet Dev Persona Switcher (Development Only) */}
          {import.meta.env.DEV && (
            <div className="relative">
              <button
                onClick={() => setDevDropdownOpen(!devDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors shadow-sm"
                title="Switch local dev account"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-mono text-xs truncate max-w-[120px] font-semibold">
                  {user ? user.username : 'Dev Auth'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  DEV
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {devDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setDevDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded bg-zinc-900 border border-zinc-800 py-1 shadow-2xl z-40 text-xs max-h-[380px] overflow-y-auto">
                    <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 border-b border-zinc-800 flex items-center justify-between">
                      <span>Test Participant Roster</span>
                      <span className="text-amber-400 font-semibold">16 Devs</span>
                    </div>
                    {devPersonaGroups.map((grp) => (
                      <div key={grp.group} className="border-b border-zinc-800/50 last:border-0 pb-1">
                        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                          {grp.group}
                        </div>
                        {grp.personas.map((p) => {
                          const isSelected = user?.username === p.username;
                          return (
                            <button
                              key={p.username}
                              onClick={() => handlePersonaSelect(p)}
                              className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800 transition-colors ${isSelected ? 'text-emerald-400 font-medium bg-emerald-500/10' : 'text-zinc-300'
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

          {/* Team identity without points */}
          {team && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 font-mono">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[130px] text-zinc-100 font-bold">{team.name}</span>
            </div>
          )}

          {/* User Sign In / Profile / Logout */}
          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-6 h-6 rounded-full border border-emerald-500/50 object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center font-mono text-[10px] font-bold text-emerald-400">
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="font-mono text-xs text-zinc-200 font-semibold max-w-[110px] truncate">
                  {user.username}
                </span>
              </div>
              <button
                onClick={() => logout()}
                title="Sign out"
                className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <a
              href={getLoginUrl()}
              className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
            >
              Sign In
            </a>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium ${isActive
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
              >
                <Icon className="w-4 h-4 text-zinc-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
