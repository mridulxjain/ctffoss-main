import React, { useState, useEffect, useRef } from 'react';
import { api, getLoginUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  AlertCircle,
  Timer,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Search,
  Check,
  ChevronRight,
  Mail,
  Lock,
} from 'lucide-react';
import { formatElapsedDuration, type TeamDTO, type CompetitionAttemptDTO } from '@fossctf/shared';

export const TeamPage: React.FC = () => {
  const { user, team, refreshSession } = useAuth();
  const [teamDetails, setTeamDetails] = useState<TeamDTO | null>(null);
  const [compAttempt, setCompAttempt] = useState<CompetitionAttemptDTO | null>(null);
  const [, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Squad Registration Form State
  const [squadQuery, setSquadQuery] = useState('');
  const [selectedSquad, setSelectedSquad] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTeamDetails = async () => {
    if (!user?.teamId) return;
    try {
      setLoading(true);
      const [teamData, attemptData] = await Promise.all([
        api.get('/teams/me').catch(() => null),
        api.get('/competition/attempt').catch(() => null),
      ]);
      setTeamDetails(teamData);
      setCompAttempt(attemptData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to retrieve team details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamDetails();
  }, [user?.teamId]);

  // Debounced Autocomplete Query
  useEffect(() => {
    if (!user || user.teamId) return;

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.get<string[]>(`/teams/autocomplete?q=${encodeURIComponent(squadQuery)}`);
        setSuggestions(Array.isArray(res) ? res : []);
        setHighlightedIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [squadQuery, user?.teamId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectSquad = (name: string) => {
    setSelectedSquad(name);
    setSquadQuery(name);
    setIsDropdownOpen(false);
    setRegError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectSquad(suggestions[highlightedIndex]);
      } else if (suggestions.length > 0) {
        handleSelectSquad(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleRegisterSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    const squadToSubmit = selectedSquad.trim() || squadQuery.trim();
    if (!squadToSubmit) {
      setRegError('Please select your registered competition squad.');
      inputRef.current?.focus();
      return;
    }

    if (!registeredEmail.trim()) {
      setRegError('Registered competition email address is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/teams/register', {
        teamName: squadToSubmit,
        registeredEmail: registeredEmail.trim(),
      });

      setRegSuccess(res?.message || `Successfully joined ${squadToSubmit}.`);

      // Refresh session context to transition user to squad operations view
      await refreshSession();
    } catch (err: any) {
      const code = err?.code;
      if (code === 'EMAIL_VERIFICATION_REQUIRED') {
        setRegError(
          'The registered competition email must match your signed-in identity. Direct linking of a different email is not permitted. Please sign in with your registered competition email or contact event administrators for assistance.'
        );
      } else if (code === 'EMAIL_NOT_IN_TEAM') {
        setRegError(
          'Roster mismatch: The entered email address is registered under a different squad on the competition roster.'
        );
      } else if (code === 'NOT_ON_ROSTER') {
        setRegError(
          'The entered email address was not found on the official competition roster.'
        );
      } else if (code === 'ALREADY_ASSIGNED' || code === 'ALREADY_IN_TEAM') {
        setRegError('Your account is already assigned to a squad. Changing squads is not permitted.');
      } else if (code === 'TEAM_NOT_FOUND') {
        setRegError(
          'The selected squad name was not found on the approved roster. Please select from the suggestions.'
        );
      } else if (code === 'COMPETITION_LOCKED') {
        setRegError('Team registrations are currently closed.');
      } else if (code === 'AMBIGUOUS_ROSTER_MATCH') {
        setRegError(
          'Multiple roster records were found for this email address. Please contact event administrators.'
        );
      } else {
        setRegError(err?.message || 'Failed to complete squad registration. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page Header */}
      <div className="space-y-2 pb-4 border-b-2 border-black">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
          <span className="text-[#ffd000] font-black">SECTION 03</span>
          <span className="text-slate-600">•</span>
          <span className="text-white">SQUAD OPERATIONS</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white uppercase">
          Squad Operations
        </h1>

        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed font-sans">
          Monitor your squad membership, competition track parameters, and synchronized attempt status for the Loventia sprint.
        </p>
      </div>

      {errorMsg && (
        <div className="border-2 border-black bg-[#ff3366] text-white p-4 font-mono text-xs font-bold flex items-center gap-2 shadow-[3px_3px_0px_#000]">
          <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* State 0: Unauthenticated Visitor */}
      {!user ? (
        <div className="rulebook-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b-2 border-black">
            <div className="w-12 h-12 bg-amber-400 text-black border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black font-display text-white uppercase tracking-tight">
                Authentication Required
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Sign in through FOSS Club OIDC to view or join your competition squad.
              </p>
            </div>
          </div>

          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-black font-mono font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000] transition-all"
          >
            <span>SIGN IN WITH FOSS CLUB</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </a>
        </div>
      ) : !user.teamId ? (
        /* State B: User has NO team -> Join Your Registered Squad Form */
        <div className="space-y-6">
          <div className="rulebook-card p-6 sm:p-8 space-y-6">
            <div className="pb-6 border-b-2 border-black space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#ffd000] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-display text-white uppercase tracking-tight">
                  Join Your Registered Squad
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed pt-1">
                Your sign-in email did not automatically match a competition registration. Enter the exact squad name and the email address you used when registering for this competition. Both details must match the official competition roster.
              </p>
            </div>

            {/* State C: Validation or Verification Error Banner */}
            {regError && (
              <div className="border-2 border-black bg-[#ff3366] text-white p-4 font-mono text-xs font-bold flex items-start gap-2.5 shadow-[3px_3px_0px_#000]">
                <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5] mt-0.5" />
                <span className="leading-relaxed">{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="border-2 border-black bg-emerald-500 text-black p-4 font-mono text-xs font-black flex items-center gap-2 shadow-[3px_3px_0px_#000]">
                <CheckCircle2 className="w-4 h-4 shrink-0 stroke-[3]" />
                <span>{regSuccess}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleRegisterSquad} className="space-y-5">
              {/* Squad Name Autocomplete */}
              <div className="space-y-1.5 relative" ref={dropdownRef}>
                <label
                  htmlFor="squad-name-input"
                  className="block text-xs font-mono font-bold text-slate-200 uppercase tracking-wider"
                >
                  Squad Name <span className="text-[#ffd000]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="squad-name-input"
                    ref={inputRef}
                    type="text"
                    value={squadQuery}
                    onChange={(e) => {
                      setSquadQuery(e.target.value);
                      setSelectedSquad('');
                      setIsDropdownOpen(true);
                      setRegError(null);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Select your registered squad..."
                    autoComplete="off"
                    disabled={isSubmitting}
                    className="w-full bg-[#121724] border-2 border-black p-3 text-xs sm:text-sm font-mono text-white placeholder-slate-500 shadow-[2px_2px_0px_#000] focus:outline-none focus:border-[#ffd000] transition-colors"
                  />
                  <div className="absolute right-3 top-3 text-slate-500 pointer-events-none">
                    <Search className="w-4 h-4" />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 font-sans">
                  Select your registered competition squad from the official roster.
                </p>

                {/* Autocomplete Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-[#161d2d] border-2 border-black shadow-[4px_4px_0px_#000] max-h-60 overflow-y-auto divide-y divide-black/50">
                    {isSearching ? (
                      <div className="p-3 text-xs font-mono text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#ffd000] animate-pulse" />
                        <span>Searching roster...</span>
                      </div>
                    ) : suggestions.length === 0 ? (
                      <div className="p-3 text-xs font-mono text-slate-400">
                        No squads matching "{squadQuery}". Ensure exact spelling.
                      </div>
                    ) : (
                      suggestions.map((name, idx) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleSelectSquad(name)}
                          className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm font-mono font-bold flex items-center justify-between transition-colors ${
                            idx === highlightedIndex || selectedSquad === name
                              ? 'bg-[#ffd000] text-black'
                              : 'text-slate-200 hover:bg-[#1f283d] hover:text-white'
                          }`}
                        >
                          <span>{name}</span>
                          {selectedSquad === name && (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Registered Competition Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="registered-email-input"
                  className="block text-xs font-mono font-bold text-slate-200 uppercase tracking-wider"
                >
                  Registered Competition Email <span className="text-[#ffd000]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="registered-email-input"
                    type="email"
                    value={registeredEmail}
                    onChange={(e) => {
                      setRegisteredEmail(e.target.value);
                      setRegError(null);
                    }}
                    placeholder="Email used during competition registration"
                    autoComplete="email"
                    disabled={isSubmitting}
                    className="w-full bg-[#121724] border-2 border-black p-3 text-xs sm:text-sm font-mono text-white placeholder-slate-500 shadow-[2px_2px_0px_#000] focus:outline-none focus:border-[#ffd000] transition-colors"
                  />
                  <div className="absolute right-3 top-3 text-slate-500 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  This must be the email address submitted in your official competition registration form.
                </p>
              </div>

              {/* State D: Submit Button with Loading State */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3 bg-[#ffd000] hover:bg-[#ffdb33] disabled:bg-amber-600/70 text-black border-2 border-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-2 h-2 bg-black animate-ping" />
                      <span>VERIFYING ROSTER...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify &amp; Join Squad</span>
                      <ChevronRight className="w-4 h-4 stroke-[3]" />
                    </>
                  )}
                </button>

                <span className="text-[11px] font-mono text-slate-500 text-center sm:text-left">
                  Squad assignment is permanent once confirmed.
                </span>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* State A: Participant HAS a team */
        <div className="space-y-6">
          {/* Confirmed & Permanent Status Indicator */}
          <div className="p-3 bg-[#141a27] border-2 border-black shadow-[2px_2px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold">Squad Assignment Confirmed</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              MEMBERSHIP PERMANENT &amp; LOCKED
            </span>
          </div>

          {/* Squad Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rulebook-card p-5 space-y-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between font-bold">
                <span>Squad Identity</span>
                <Users className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-xl font-black font-display text-white truncate uppercase">
                {team?.name || 'Your Squad'}
              </div>
              <p className="text-[10px] text-slate-400 font-sans pt-1 border-t border-slate-800">
                Official affiliated squad roster
              </p>
            </div>

            <div className="rulebook-card p-5 space-y-2">
              <div className="text-[10px] font-mono text-[#00f0ff] uppercase tracking-wider flex items-center justify-between font-bold">
                <span>Competition Track</span>
                <Zap className="w-3.5 h-3.5 text-[#00f0ff] fill-[#00f0ff]" />
              </div>
              <div className="text-xl font-black text-[#00f0ff] font-display uppercase flex items-center gap-1.5">
                SPEED SPRINT
              </div>
              <p className="text-[10px] text-slate-400 font-sans pt-1 border-t border-slate-800">
                Ranked strictly by verified elapsed duration
              </p>
            </div>

            <div className="rulebook-card p-5 space-y-2">
              <div className="text-[10px] font-mono text-[#ffd000] uppercase tracking-wider flex items-center justify-between font-bold">
                <span>Attempt Status</span>
                <Timer className="w-3.5 h-3.5 text-[#ffd000] stroke-[2.5]" />
              </div>
              <div className="text-xl font-black font-mono">
                {compAttempt?.status === 'COMPLETED' ? (
                  <span className="text-[#00f0ff] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                    <span>{compAttempt.elapsedSeconds ? formatElapsedDuration(compAttempt.elapsedSeconds * 1000) : 'SOLVED'}</span>
                  </span>
                ) : compAttempt?.status === 'IN_PROGRESS' ? (
                  <span className="text-[#ffd000] text-sm flex items-center gap-1.5 font-bold">
                    <span className="w-2 h-2 bg-[#ffd000] animate-pulse" />
                    <span>Attempt In Flight</span>
                  </span>
                ) : (
                  <span className="text-slate-400 text-sm font-bold">Staging</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-sans pt-1 border-t border-slate-800">
                {compAttempt?.status === 'COMPLETED'
                  ? 'Flag captured and verified'
                  : 'Synchronized competition target'}
              </p>
            </div>
          </div>

          {/* Squad Roster Table */}
          <section className="rulebook-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b-2 border-black bg-[#161d2d] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#ffd000]" />
                <h2 className="text-sm font-black text-white uppercase tracking-wider font-display">
                  Squad Member Roster ({teamDetails?.members?.length || 1} Members)
                </h2>
              </div>

              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                Synced with FOSS Club
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#121724] border-b-2 border-black text-slate-300 text-[11px] uppercase font-bold">
                  <tr>
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Username</th>
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {teamDetails?.members && teamDetails.members.length > 0 ? (
                    teamDetails.members.map((m) => {
                      const isCurrentUser = m.id === user.id;
                      const isMemberLoggedIn = isCurrentUser || Boolean(m.isLoggedIn);
                      return (
                        <tr
                          key={m.id}
                          className={`transition-colors hover:bg-[#151c2c] ${
                            isCurrentUser ? 'bg-[#00f0ff]/5' : ''
                          }`}
                        >
                          <td className="px-5 py-3.5 font-bold text-white font-sans">
                            <div className="flex items-center gap-2">
                              <span>{m.displayName || m.username}</span>
                              {isCurrentUser && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#00f0ff] text-black border border-black uppercase font-black shadow-[1px_1px_0px_#000]">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">
                            @{m.username}
                          </td>
                          <td className="px-5 py-3.5 text-right font-black text-xs">
                            {isMemberLoggedIn ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                                <span className="w-1.5 h-1.5 bg-emerald-400" />
                                <span>ACTIVE</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-zinc-500">
                                <span className="w-1.5 h-1.5 bg-zinc-600" />
                                <span>OFFLINE</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-5 py-3.5 font-bold text-white font-sans">
                        {user.username}
                        <span className="ml-2 text-[9px] font-mono px-1.5 py-0.2 bg-[#00f0ff] text-black border border-black uppercase font-black shadow-[1px_1px_0px_#000]">
                          You
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        @{user.username}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-xs">
                        <span className="inline-flex items-center gap-1.5 text-emerald-400">
                          <span className="w-1.5 h-1.5 bg-emerald-400" />
                          <span>ACTIVE</span>
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
