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
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
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
                  <span className="text-[11px] text-zinc-500 font-mono block">Team Score</span>
                  <span className="text-lg font-mono font-semibold text-zinc-100">
                    {teamDetails?.totalScore ?? team?.totalScore ?? 0} pts
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>Team identity and membership are authoritative and synchronized from the FOSS Club identity system.</span>
            </div>
          </div>

          {/* Members Roster */}
          <div className="space-y-2">
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
