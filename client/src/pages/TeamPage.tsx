import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  AlertCircle,
  Info,
  ExternalLink,
  Timer,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { formatElapsedDuration, type TeamDTO, type CompetitionAttemptDTO } from '@fossctf/shared';

export const TeamPage: React.FC = () => {
  const { user, team } = useAuth();
  const [teamDetails, setTeamDetails] = useState<TeamDTO | null>(null);
  const [compAttempt, setCompAttempt] = useState<CompetitionAttemptDTO | null>(null);
  const [loading, setLoading] = useState(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-zinc-800 pb-4">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase tracking-widest">
          <span className="text-emerald-400 font-bold">&gt;_ SQUAD TERMINAL</span>
          <span className="text-zinc-600">//</span>
          <span>§ 03 &middot; SQUAD OPERATIONS</span>
          <span className="text-zinc-600">//</span>
          <span className="text-emerald-400 font-bold">ROSTER & ATTEMPTS</span>
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
        <h1 className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-zinc-100 uppercase">
          Squad Operations
        </h1>
        <p className="text-sm font-mono text-zinc-400 max-w-2xl">
          Monitor your competition squad membership and synchronized Loventia attempt status.
        </p>
      </div>

      {errorMsg && (
        <div className="border-2 border-rose-500 bg-rose-950/40 p-4 font-mono text-xs text-rose-300 flex items-center gap-2 shadow-[3px_3px_0px_#f43f5e]">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Case 1: Participant has NO team */}
      {!user?.teamId ? (
        <div className="max-w-xl mx-auto py-10 space-y-4">
          <div className="tech-corner-box border-2 border-zinc-800 bg-zinc-950 p-8 space-y-5 text-center shadow-[5px_5px_0px_#27272a]">
            <div className="w-12 h-12 bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-zinc-300 mx-auto shadow-[2px_2px_0px_#000]">
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

            <div className="p-4 bg-zinc-900 border-2 border-zinc-800 text-left font-mono text-xs text-zinc-400 space-y-2">
              <div className="flex items-center gap-2 text-zinc-200 font-bold uppercase text-[11px]">
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
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-black text-xs uppercase tracking-wider border-2 border-emerald-400 shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] transition-all"
              >
                <span>Open FOSS Club Portal ↗</span>
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
            <div className="tech-corner-box border-2 border-zinc-800 bg-zinc-950 p-5 space-y-1 shadow-[4px_4px_0px_#27272a]">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                <span>Squad Identity</span>
                <Users className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="text-xl font-black font-mono text-zinc-100 truncate">
                {team?.name || 'Your Squad'}
              </div>
              <p className="text-[10px] text-zinc-500 font-mono truncate">
                UUID: {user.teamId}
              </p>
            </div>

            <div className="tech-corner-box border-2 border-emerald-500 bg-zinc-950 p-5 space-y-1 shadow-[4px_4px_0px_#10b981]">
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider flex items-center justify-between font-bold">
                <span>Competition Track</span>
                <Award className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-400 font-mono">
                SPEED SPRINT
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                Ranked by verified elapsed duration
              </p>
            </div>

            <div className="tech-corner-box border-2 border-amber-500 bg-zinc-950 p-5 space-y-1 shadow-[4px_4px_0px_#f59e0b]">
              <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider flex items-center justify-between font-bold">
                <span>Loventia Attempt</span>
                <Timer className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-black font-mono">
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
          <div className="border-2 border-zinc-800 bg-zinc-950 shadow-[5px_5px_0px_#27272a] overflow-hidden">
            <div className="px-5 py-4 bg-zinc-900 border-b-2 border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-mono">
                  Squad Roster ({teamDetails?.members?.length || 1} Members)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                Central FOSS Club sync
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-zinc-950/80 border-b-2 border-zinc-800 text-zinc-400 text-[11px] uppercase">
                  <tr>
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Username</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {teamDetails?.members && teamDetails.members.length > 0 ? (
                    teamDetails.members.map((m) => {
                      const isCurrentUser = m.id === user.id;
                      return (
                        <tr
                          key={m.id}
                          className={`transition-colors hover:bg-zinc-900/60 ${
                            isCurrentUser ? 'bg-emerald-950/15' : ''
                          }`}
                        >
                          <td className="px-5 py-3.5 font-bold text-zinc-100">
                            <div className="flex items-center gap-2">
                              <span>{m.displayName || m.username}</span>
                              {isCurrentUser && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-bold">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-400">
                            @{m.username}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 border text-[10px] font-bold ${
                              m.role === 'ADMIN'
                                ? 'bg-purple-950 text-purple-300 border-purple-800'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                            }`}>
                              {m.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right text-emerald-400 font-bold text-xs">
                            ACTIVE
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-5 py-3.5 font-bold text-zinc-100">
                        {user.username}
                        <span className="ml-2 text-[9px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-bold">
                          You
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400">
                        @{user.username}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400">
                        {user.role}
                      </td>
                      <td className="px-5 py-3.5 text-right text-emerald-400 font-bold text-xs">
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
