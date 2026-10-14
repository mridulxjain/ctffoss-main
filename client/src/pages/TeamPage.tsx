import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, AlertCircle, Info, ExternalLink } from 'lucide-react';
import type { TeamDTO } from '@fossctf/shared';

export const TeamPage: React.FC = () => {
  const { user, team } = useAuth();
  const [teamDetails, setTeamDetails] = useState<TeamDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTeamDetails = async () => {
    if (!user?.teamId) return;
    try {
      setLoading(true);
      const data = await api.get('/teams/me');
      setTeamDetails(data);
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page Header */}
      <div className="border-b border-zinc-800 pb-5">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
          Team Overview
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          View your current competition squad, team score, and active roster.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-md bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Case 1: Participant has NO team */}
      {!user?.teamId ? (
        <div className="max-w-lg mx-auto py-10 space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 space-y-4 text-center">
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-400 mx-auto">
              <Users className="w-5 h-5" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-zinc-200">
                No Team Assigned
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                Teams and team memberships are managed centrally through the official{' '}
                <strong className="text-zinc-300">FOSS Club Identity System</strong>. FOSS CTF consumes your verified team assignment automatically.
              </p>
            </div>

            <div className="p-3.5 rounded-md bg-zinc-900/70 border border-zinc-800 text-left text-xs text-zinc-400 space-y-2">
              <div className="flex items-start gap-2 text-zinc-300 font-medium">
                <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                <span>How to join a team:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px] pl-1">
                <li>Log in to the FOSS Club member portal.</li>
                <li>Create or join your competition squad there.</li>
                <li>Return to FOSS CTF and your team context will be synced automatically.</li>
              </ul>
            </div>

            <div className="pt-2">
              <a
                href="https://fossclub.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                <span>FOSS Club Portal</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Case 2: Participant HAS an assigned team */
        <div className="space-y-6">
          {/* Team Summary Card */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">
                  Assigned Team
                </span>
                <h2 className="text-lg font-semibold text-zinc-100 mt-0.5 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  {teamDetails?.name || team?.name}
                </h2>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[11px] text-zinc-500 font-mono block">Scoreboard Rank</span>
                  <span className="text-lg font-mono font-semibold text-zinc-100">
                    {teamDetails?.rank ? `#${teamDetails.rank}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 font-mono block">Total Score</span>
                  <span className="text-lg font-mono font-semibold text-emerald-400">
                    {teamDetails?.totalScore ?? team?.totalScore ?? 0} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar & Stats */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Competition Progress</span>
                <span className="font-mono text-zinc-300">
                  <span className="text-zinc-100 font-semibold">{teamDetails?.solvesCount ?? 0}</span>
                  {' / '}
                  <span>{teamDetails?.totalAvailableChallenges ?? 0} challenges solved</span>
                  {teamDetails?.totalAvailableChallenges && teamDetails.totalAvailableChallenges > 0 ? (
                    <span className="text-zinc-500 ml-1.5">
                      ({Math.round(((teamDetails.solvesCount ?? 0) / teamDetails.totalAvailableChallenges) * 100)}%)
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      teamDetails?.totalAvailableChallenges && teamDetails.totalAvailableChallenges > 0
                        ? Math.min(100, Math.round(((teamDetails.solvesCount ?? 0) / teamDetails.totalAvailableChallenges) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>Team identity and membership are authoritative and synchronized from the central FOSS Club identity system.</span>
            </div>
          </div>

          {/* Solved Challenges Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Solved Challenges ({teamDetails?.solves?.length || 0})
              </h3>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs font-mono text-zinc-500">
                Loading team progress...
              </div>
            ) : !teamDetails?.solves || teamDetails.solves.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-6 text-center text-xs text-zinc-500">
                No challenges solved yet. Complete challenges from the challenge board to earn points for your team.
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-medium">
                      <tr>
                        <th className="px-4 py-2.5">Challenge</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5 text-right">Points</th>
                        <th className="px-4 py-2.5 text-right">Solved At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {teamDetails.solves.map((solve) => (
                        <tr key={solve.challengeId} className="hover:bg-zinc-900/60 transition-colors">
                          <td className="px-4 py-3 font-medium text-zinc-200">
                            <div className="flex items-center gap-2">
                              <span>{solve.challengeTitle}</span>
                              {solve.isFirstBlood && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950/60 text-rose-400 border border-rose-900/60 font-semibold">
                                  First Blood 🩸
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {solve.categoryName}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-emerald-400">
                            +{solve.pointsAwarded}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-500 text-[11px]">
                            {new Date(solve.solvedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Members Roster */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Team Roster ({teamDetails?.members?.length || 1} Members)
              </h3>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs font-mono text-zinc-500">
                Loading team roster...
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-800/80">
                {teamDetails?.members?.map((member) => (
                  <div
                    key={member.id}
                    className="px-4 py-3 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-medium text-zinc-200">{member.username}</span>
                      {member.id === user?.id && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-500 font-mono">{member.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
