import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  AlertCircle,
  Info,
  ExternalLink,
  Timer,
  Award,
  Radio,
  Shield,
} from 'lucide-react';
import { formatElapsedDuration, type TeamDTO, type CompetitionAttemptDTO } from '@fossctf/shared';

export const TeamPage: React.FC = () => {
  const { user, team } = useAuth();
  const [teamDetails, setTeamDetails] = useState<TeamDTO | null>(null);
  const [compAttempt, setCompAttempt] = useState<CompetitionAttemptDTO | null>(null);
  const [, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Section Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase tracking-wider">
          <span className="text-emerald-400 font-semibold">&gt;_ SQUAD TERMINAL</span>
          <span className="text-zinc-700">/</span>
          <span>Squad Operations</span>
          <span className="text-zinc-700">/</span>
          <span className="text-emerald-400 font-semibold">Roster & Attempts</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="sticker-tape bg-amber-400 text-black border border-black shadow-[2px_2px_0px_#000]">
            CLEARANCE: SQUAD
          </div>
          <div className="sticker-tape-right bg-emerald-400 text-black border border-black shadow-[2px_2px_0px_#000]">
            MERGE SMALL, MERGE OFTEN
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-4xl font-bold font-mono tracking-tight text-zinc-100 uppercase">
          Squad Operations
        </h1>
        <p className="text-xs sm:text-sm font-mono text-zinc-400 max-w-2xl leading-relaxed">
          Monitor your competition squad membership and synchronized Loventia attempt status.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-4 font-mono text-xs text-rose-300 flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Case 1: Participant has NO team */}
      {!user?.teamId ? (
        <div className="max-w-xl mx-auto py-10 space-y-4">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-8 space-y-5 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mx-auto shadow-sm">
              <Users className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold font-mono text-zinc-100 uppercase">
                No Squad Assigned
              </h2>
              <p className="text-xs font-mono text-zinc-400 leading-relaxed max-w-md mx-auto">
                Teams and squad memberships are managed centrally through the official{' '}
                <strong className="text-zinc-200">FOSS Club Identity System</strong>. FOSS CTF binds your verified squad context automatically upon sign-in.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-zinc-900/70 border border-zinc-800/80 text-left font-mono text-xs text-zinc-400 space-y-2">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold uppercase text-[11px]">
                <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>How to participate with a squad:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 text-xs pl-1">
                <li>Log in to the FOSS Club member portal.</li>
                <li>Join or create your competition squad there.</li>
                <li>Return to FOSS CTF and your team context will sync automatically.</li>
              </ul>
            </div>

            <div className="pt-2">
              <a
                href="https://fossclub.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-mono font-semibold text-xs uppercase tracking-wider border border-emerald-400 shadow-sm transition-colors"
              >
                <span>Open FOSS Club Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Case 2: Participant HAS an assigned team */
        <div className="space-y-6">
          {/* Squad Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-1 shadow-sm">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                <span>Squad Identity</span>
                <Users className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-zinc-100 truncate">
                {team?.name || 'Your Squad'}
              </div>
              <p className="text-[10px] text-zinc-500 font-mono truncate">
                UUID: {user.teamId}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-1 shadow-sm">
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider flex items-center justify-between font-semibold">
                <span>Competition Track</span>
                <Award className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">
                SPEED SPRINT
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                Ranked by verified elapsed duration
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-1 shadow-sm">
              <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider flex items-center justify-between font-semibold">
                <span>Loventia Attempt</span>
                <Timer className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono">
                {compAttempt?.status === 'COMPLETED' ? (
                  <span className="text-emerald-400 font-mono">
                    {compAttempt.elapsedSeconds ? formatElapsedDuration(compAttempt.elapsedSeconds * 1000) : 'SOLVED'}
                  </span>
                ) : compAttempt?.status === 'IN_PROGRESS' ? (
                  <span className="text-amber-400 text-sm">Attempt Running</span>
                ) : (
                  <span className="text-zinc-500 text-sm">Staging</span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                {compAttempt?.status === 'COMPLETED'
                  ? 'Flag captured and verified'
                  : 'Synchronized competition target'}
              </p>
            </div>
          </div>

          {/* Squad Roster Table */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider font-mono">
                  Squad Roster ({teamDetails?.members?.length || 1} Members)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                Central FOSS Club sync
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-zinc-950/80 border-b border-zinc-800/80 text-zinc-400 text-[11px] uppercase">
                  <tr>
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Username</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {teamDetails?.members && teamDetails.members.length > 0 ? (
                    teamDetails.members.map((m) => {
                      const isCurrentUser = m.id === user.id;
                      return (
                        <tr
                          key={m.id}
                          className={`transition-colors hover:bg-zinc-900/50 ${
                            isCurrentUser ? 'bg-emerald-950/15' : ''
                          }`}
                        >
                          <td className="px-5 py-3.5 font-semibold text-zinc-100">
                            <div className="flex items-center gap-2">
                              <span>{m.displayName || m.username}</span>
                              {isCurrentUser && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase rounded font-bold">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-400">
                            @{m.username}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              m.role === 'ADMIN'
                                ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700/60'
                            }`}>
                              {m.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right text-emerald-400 font-semibold text-xs">
                            ACTIVE
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-5 py-3.5 font-semibold text-zinc-100">
                        {user.username}
                        <span className="ml-2 text-[9px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase rounded font-bold">
                          You
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400">
                        @{user.username}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400">
                        {user.role}
                      </td>
                      <td className="px-5 py-3.5 text-right text-emerald-400 font-semibold text-xs">
                        ACTIVE
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
