import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flag, Trophy, Users, BookOpen, Shield, LogOut, Terminal, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, team, loginDev, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Challenges', path: '/challenges', icon: Flag },
    { label: 'Scoreboard', path: '/scoreboard', icon: Trophy },
    { label: 'My Team', path: '/team', icon: Users },
    { label: 'Rules', path: '/rules', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#080c14]/90 backdrop-blur-md">
      {/* Dev Switcher Bar */}
      <div className="bg-emerald-950/40 border-b border-emerald-900/30 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-400">
          <Terminal className="w-3.5 h-3.5" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">Dev Auth Switcher:</span>
          <span className="text-slate-400 hidden sm:inline">(Local Sandbox)</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => loginDev('USER', 'alice_sec', 'alice@university.edu')}
            className={`px-2 py-0.5 rounded transition text-[11px] font-mono ${
              user?.username === 'alice_sec'
                ? 'bg-emerald-500 text-black font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Alice (Team 1)
          </button>
          <button
            onClick={() => loginDev('USER', 'bob_0x', 'bob@university.edu')}
            className={`px-2 py-0.5 rounded transition text-[11px] font-mono ${
              user?.username === 'bob_0x'
                ? 'bg-emerald-500 text-black font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Bob (Team 1)
          </button>
          <button
            onClick={() => loginDev('USER', 'charlie_hax', 'charlie@university.edu')}
            className={`px-2 py-0.5 rounded transition text-[11px] font-mono ${
              user?.username === 'charlie_hax'
                ? 'bg-emerald-500 text-black font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Charlie (Team 2)
          </button>
          <button
            onClick={() => loginDev('ADMIN', 'foss_admin', 'admin@fossclub.tech')}
            className={`px-2 py-0.5 rounded transition text-[11px] font-mono ${
              user?.role === 'ADMIN'
                ? 'bg-purple-500 text-white font-semibold'
                : 'bg-purple-950/60 text-purple-300 hover:bg-purple-900/60'
            }`}
          >
            ⚡ Admin
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 group-hover:bg-emerald-500/20 transition shadow-glow">
            <Flag className="w-5 h-5 fill-emerald-500/20" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-emerald-400 transition">
                FOSS<span className="text-emerald-400">CTF</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 border border-emerald-500/20">
                2026
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider -mt-0.5">
              ctf.fossclub.tech
            </p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/20 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User / Team Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              {team && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs">
                  <span className="text-slate-400">Team:</span>
                  <span className="font-semibold text-white">{team.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                    {team.totalScore} pts
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200">{user.username}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{user.role.toLowerCase()}</div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-emerald-400">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>

                <button
                  onClick={() => logout()}
                  title="Logout"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => loginDev('USER')}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-wide transition shadow-glow flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sign In (Dev)
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
