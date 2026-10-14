import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Copy, Check, AlertCircle } from 'lucide-react';
import type { TeamDTO } from '@fossctf/shared';

export const TeamPage: React.FC = () => {
  const { user, team, refreshSession } = useAuth();
  const [teamDetails, setTeamDetails] = useState<TeamDTO | null>(null);
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
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
    const code = teamDetails?.inviteCode || team?.inviteCode;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page Header */}
      <div className="border-b border-zinc-800 pb-5">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
          Team Management
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Form or join a team with your peers to collaborate and compete together.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-md bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Case 1: User does NOT have a team */}
      {!user?.teamId ? (
        <div className="max-w-md mx-auto py-6 space-y-4">
          {/* Segmented Control Toggle */}
          <div className="grid grid-cols-2 p-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs">
            <button
              onClick={() => {
                setActiveTab('join');
                setErrorMsg(null);
              }}
              className={`py-1.5 rounded text-center font-medium transition-colors ${
                activeTab === 'join'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Join a Team
            </button>
            <button
              onClick={() => {
                setActiveTab('create');
                setErrorMsg(null);
              }}
              className={`py-1.5 rounded text-center font-medium transition-colors ${
                activeTab === 'create'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Create a Team
            </button>
          </div>

          {/* Form Container */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
            {activeTab === 'join' ? (
              <form onSubmit={handleJoinTeam} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    Team Invite Code
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter 12-character code"
                    className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-zinc-600 uppercase tracking-wider"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Ask your team creator for their invite code.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || !inviteCode.trim()}
                  className="w-full py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Joining...' : 'Join Team'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Binary Beasts"
                    className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-zinc-600"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Choose a unique name for your team.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || !teamName.trim()}
                  className="w-full py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Team'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* Case 2: User HAS a team */
        <div className="space-y-6">
          {/* Team Overview Card */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
                  Active Team
                </span>
                <h2 className="text-lg font-semibold text-zinc-100 mt-0.5">
                  {teamDetails?.name || team?.name}
                </h2>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[11px] text-zinc-500 font-mono block">Score</span>
                  <span className="text-lg font-mono font-semibold text-zinc-100">
                    {teamDetails?.totalScore ?? team?.totalScore ?? 0} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Invite Code Bar */}
            <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-zinc-400">
                Share this invite code to add members to your team:
              </div>

              <div className="flex items-center gap-2">
                <code className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 font-mono text-zinc-200 text-xs select-all">
                  {teamDetails?.inviteCode || team?.inviteCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Members Roster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Roster ({teamDetails?.members?.length || 1} / 4 Members)
              </h3>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-800/80">
              {teamDetails?.members?.map((member) => (
                <div
                  key={member.id}
                  className="px-4 py-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-medium text-zinc-200">{member.username}</span>
                    {member.id === user.id && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-zinc-500 font-mono">{member.email}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
