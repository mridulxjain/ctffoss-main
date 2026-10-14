import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Shield, Copy, Check, Key, Trophy, Sparkles, AlertCircle } from 'lucide-react';
import type { TeamDTO } from '@fossctf/shared';

export const TeamPage: React.FC = () => {
  const { user, team, refreshSession } = useAuth();
  const [teamDetails, setTeamDetails] = useState<TeamDTO | null>(null);
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchTeamDetails = async () => {
    if (!user?.teamId) return;
    try {
      setLoadingDetails(true);
      const data = await api.get('/teams/me');
      setTeamDetails(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchTeamDetails();
  }, [user?.teamId]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setActionLoading(true);
    setErrorMsg(null);

    try {
      await api.post('/teams', { name: teamName.trim() });
      setTeamName('');
      await refreshSession();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setActionLoading(true);
    setErrorMsg(null);

    try {
      await api.post('/teams/join', { inviteCode: inviteCode.trim() });
      setInviteCode('');
      await refreshSession();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to join team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!teamDetails?.inviteCode) return;
    navigator.clipboard.writeText(teamDetails.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
          <Users className="w-4 h-4" /> Team Headquarters
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Team Operations</h1>
        <p className="text-slate-400 text-sm mt-1">
          CTF competitions are fought in teams of up to 4 members. Share invites and conquer challenges
          together.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Case 1: User does NOT have a team */}
      {!user?.teamId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Create Team Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create a New Team</h3>
                <p className="text-xs text-slate-400">
                  You will become the team founder and receive an invite code.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. CyberVanguard"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading || !teamName.trim()}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-sm tracking-wide transition shadow-glow flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                {actionLoading ? 'Creating...' : 'Form Team'}
              </button>
            </form>
          </div>

          {/* Join Team Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Join an Existing Team</h3>
                <p className="text-xs text-slate-400">Enter the secret invite code provided by your teammate.</p>
              </div>
            </div>

            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Secret Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="e.g. BEASTS2026"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-400 font-mono text-sm focus:outline-none focus:border-cyan-500 uppercase tracking-widest"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading || !inviteCode.trim()}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold text-sm tracking-wide transition shadow-cyan-glow flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {actionLoading ? 'Joining...' : 'Join Team'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Case 2: User HAS a team */
        <div className="space-y-6">
          {/* Team Overview Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 relative overflow-hidden bg-gradient-to-r from-slate-900 to-[#0c1424]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">
                  Active Squad
                </div>
                <h2 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
                  {teamDetails?.name || team?.name}
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Formed on{' '}
                  {teamDetails?.createdAt
                    ? new Date(teamDetails.createdAt).toLocaleDateString()
                    : 'CTF Season 2026'}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="bg-slate-950/70 px-5 py-3 rounded-xl border border-slate-800 text-right">
                  <div className="text-[11px] text-slate-400 uppercase font-mono">Total Points</div>
                  <div className="text-2xl font-mono font-extrabold text-emerald-400">
                    {teamDetails?.totalScore ?? team?.totalScore ?? 0} pts
                  </div>
                </div>
              </div>
            </div>

            {/* Invite Code Box */}
            <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>Invite teammates with your code:</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-mono font-bold tracking-widest text-sm">
                  {teamDetails?.inviteCode || team?.inviteCode}
                </div>

                <button
                  onClick={handleCopyCode}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Members Roster */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Team Roster ({teamDetails?.members?.length || 1} / 4 Members)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {teamDetails?.members?.map((member) => (
                <div
                  key={member.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-emerald-400 text-sm">
                    {member.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                      {member.username}
                      {member.id === user.id && (
                        <span className="text-[10px] font-mono px-1 rounded bg-slate-800 text-slate-300">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-[150px]">
                      {member.email}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
