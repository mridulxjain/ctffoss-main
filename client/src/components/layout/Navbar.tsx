import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flag, Trophy, Users, LogOut, Menu, X, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '@fossctf/shared';

export const Navbar: React.FC = () => {
  const { user, team, loginDev, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [devDropdownOpen, setDevDropdownOpen] = useState(false);

  const navItems = [
    { label: 'Challenges', path: '/challenges', icon: Flag },
    { label: 'Scoreboard', path: '/scoreboard', icon: Trophy },
    { label: 'Teams', path: '/team', icon: Users },
  ];

  const devPersonas: Array<{ role: Role; username: string; email: string; label: string }> = [
    { role: 'USER', username: 'alice_sec', email: 'alice@university.edu', label: 'Alice (Binary Beasts)' },
    { role: 'USER', username: 'bob_0x', email: 'bob@university.edu', label: 'Bob (Binary Beasts)' },
    { role: 'USER', username: 'dave_bravo', email: 'dave@university.edu', label: 'Dave (Null Pointers)' },
    { role: 'USER', username: 'charlie_solo', email: 'charlie@university.edu', label: 'Charlie (No Team)' },
    { role: 'ADMIN', username: 'foss_admin', email: 'admin@fossclub.tech', label: 'Platform Admin' },
  ];

  const handlePersonaSelect = (persona: typeof devPersonas[0]) => {
    loginDev(persona.role, persona.username, persona.email);
    setDevDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-[#09090b]/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Brand + Nav links */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-semibold text-sm tracking-tight text-zinc-100 group-hover:text-emerald-400 transition-colors">
              FOSS <span className="text-zinc-400">CTF</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-800/80 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Controls & User Profile */}
        <div className="flex items-center gap-3">
          {/* Discreet Dev Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setDevDropdownOpen(!devDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
              title="Switch local dev account"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="font-mono text-[11px] truncate max-w-[110px]">
                {user ? user.username : 'Dev Auth'}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {devDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setDevDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-48 rounded-md bg-zinc-900 border border-zinc-800 py-1 shadow-lg z-40 text-xs">
                  <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-zinc-800/80">
                    Switch Test Account
                  </div>
                  {devPersonas.map((p) => {
                    const isSelected = user?.username === p.username;
                    return (
                      <button
                        key={p.username}
                        onClick={() => handlePersonaSelect(p)}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800 transition-colors ${
                          isSelected ? 'text-emerald-400 font-medium' : 'text-zinc-300'
                        }`}
                      >
                        <span className="truncate">{p.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Team score info */}
          {team && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/60 border border-zinc-800/60 text-xs text-zinc-400">
              <span className="truncate max-w-[100px] text-zinc-200">{team.name}</span>
              <span className="text-zinc-600">·</span>
              <span className="font-mono text-zinc-300">{team.totalScore} pts</span>
            </div>
          )}

          {/* User Sign In / Logout */}
          {user ? (
            <button
              onClick={() => logout()}
              title="Sign out"
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => loginDev('USER')}
              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
            >
              Sign In
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
