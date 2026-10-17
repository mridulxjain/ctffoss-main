import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  AlertCircle,
  Timer,
  Zap,
  CheckCircle2,
  Shield,
  HelpCircle,
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Clean Architectural Eyebrow & Header */}
      <div className="space-y-3 pb-3 border-b-2 border-black">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider">
          <div className="flex items-center gap-2 text-slate-400 font-bold">
            <span className="text-[#ffd000] font-black">§ 03</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-white">SQUAD OPERATIONS</span>
          </div>
          <span className="spec-tag spec-tag-dark">ROSTER SPEC</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white uppercase">
            Squad Operations
          </h1>
        </div>

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

      {/* Case 1: Participant has NO team */}
      {!user?.teamId ? (
        <div className="space-y-6">
          <div className="rulebook-card p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-2 border-black">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#ffd000] text-black border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black font-display text-white uppercase tracking-tight">
                      No Squad Assigned
                    </h2>
                    <span className="spec-tag spec-tag-accent text-[10px]">UNLINKED</span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Your account is currently registered as an independent operative.
                  </p>
                </div>
              </div>
            </div>

            {/* 3-Step Setup Blueprint */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block">
                How Squad Sync Works:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#141a27] border-2 border-black shadow-[2px_2px_0px_#000] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black text-[#ffd000]">STEP 01</span>
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Join or Form Squad</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Log in to the central FOSS Club portal to create your team and invite squad members.
                  </p>
                </div>

                <div className="p-4 bg-[#141a27] border-2 border-black shadow-[2px_2px_0px_#000] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black text-[#00f0ff]">STEP 02</span>
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Sign In to CTF</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Use your same FOSS Club account credentials. FOSS CTF automatically resolves your squad context.
                  </p>
                </div>

                <div className="p-4 bg-[#141a27] border-2 border-black shadow-[2px_2px_0px_#000] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black text-emerald-400">STEP 03</span>
                    <Zap className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Compete & Score</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Flag captures submit under your squad's name, syncing solve times with the synchronized speed ledger.
                  </p>
                </div>
              </div>
            </div>

            {/* Operative Note */}
            <div className="p-4 bg-[#141a27] border-2 border-black text-xs text-slate-300 font-sans flex items-start gap-3">
              <HelpCircle className="w-4 h-4 text-[#ffd000] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-white">Note for solo participants:</strong> You can still explore challenges and verify flag payloads locally. To appear on the official verified speed podium, an active squad affiliation is required.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Case 2: Participant HAS an assigned team */
        <div className="space-y-6">
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
