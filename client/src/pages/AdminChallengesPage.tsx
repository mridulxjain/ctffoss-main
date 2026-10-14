import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type {
  CompetitionConfigDTO,
  CompetitionReadinessSummaryDTO,
  AdminTeamListItemDTO,
} from '@fossctf/shared';
import {
  Shield,
  Play,
  ExternalLink,
  Copy,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Edit2,
  Check,
  X,
  Pause,
  RotateCcw,
} from 'lucide-react';

export const AdminChallengesPage: React.FC = () => {
  const { user } = useAuth();

  // Strict client-side Admin protection: if user is not admin, immediately boot them to /challenges
  if (user && user.role !== 'ADMIN') {
    return <Navigate to="/challenges" replace />;
  }

  // State
  const [competition, setCompetition] = useState<CompetitionConfigDTO | null>(null);
  const [readiness, setReadiness] = useState<CompetitionReadinessSummaryDTO | null>(null);
  const [teams, setTeams] = useState<AdminTeamListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Action states
  const [startingCompetition, setStartingCompetition] = useState(false);
  const [resettingCompetition, setResettingCompetition] = useState(false);
  const [pausingCompetition, setPausingCompetition] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // Inline team Loventia ID editing
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editValenfindId, setEditValenfindId] = useState('');
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);

  const targetUrl = 'https://ctffoss.vercel.app';
  const isCompStarted = competition?.state === 'LIVE' || competition?.state === 'ENDED';

  const fetchData = async () => {
    try {
      const [compRes, readyRes, teamsRes] = await Promise.all([
        api.get('/competition').catch(() => null),
        api.get('/competition/readiness').catch(() => null),
        api.get('/admin/teams').catch(() => []),
      ]);
      setCompetition(compRes);
      setReadiness(readyRes);
      setTeams(teamsRes || []);
    } catch (err) {
      console.error('Failed to load admin telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  // FORCE START: Admin can start the competition at any second — readiness checks are bypassed!
  const handleForceStart = async () => {
    if (!window.confirm('⚡ Unlock Loventia and START the competition now?\n\nTarget will immediately become active for all participants without requiring squad readiness.')) {
      return;
    }
    setStartingCompetition(true);
    setActionFeedback(null);
    try {
      const res = await api.post('/admin/competition/start', { force: true });
      setActionFeedback({
        text: res?.message || 'Competition started! Loventia target unlocked for all participants.',
        isError: false,
      });
      await fetchData();
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Failed to start competition.',
        isError: true,
      });
    } finally {
      setStartingCompetition(false);
    }
  };

  // Reset competition state back to PREPARING
  const handleResetToPreparing = async () => {
    if (!window.confirm('Reset competition back to PREPARING state?\n\nThis will lock the participant target gate again until you start it.')) {
      return;
    }
    setResettingCompetition(true);
    setActionFeedback(null);
    try {
      await api.put('/admin/competition', {
        state: 'PREPARING',
        isPaused: false,
      });
      setActionFeedback({
        text: 'Competition reset to PREPARING state.',
        isError: false,
      });
      await fetchData();
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Failed to reset competition.',
        isError: true,
      });
    } finally {
      setResettingCompetition(false);
    }
  };

  // Toggle pause
  const handleTogglePause = async () => {
    const nextPaused = !competition?.isPaused;
    setPausingCompetition(true);
    setActionFeedback(null);
    try {
      await api.put('/admin/competition', {
        isPaused: nextPaused,
      });
      setActionFeedback({
        text: nextPaused ? 'Competition PAUSED. Flag submissions temporarily frozen.' : 'Competition RESUMED.',
        isError: false,
      });
      await fetchData();
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Failed to toggle pause state.',
        isError: true,
      });
    } finally {
      setPausingCompetition(false);
    }
  };

  // Save team Loventia mapping
  const handleSaveTeamMapping = async (teamId: string) => {
    try {
      setSavingTeamId(teamId);
      const cleanValenfindId = editValenfindId.trim() || null;
      await api.put(`/admin/teams/${teamId}/valenfind-mapping`, {
        valenfindTeamId: cleanValenfindId,
      });

      setTeams((prev) =>
        prev.map((t) => (t.id === teamId ? { ...t, valenfindTeamId: cleanValenfindId } : t))
      );
      setEditingTeamId(null);
      setEditValenfindId('');
      setActionFeedback({
        text: 'Team Loventia voucher ID updated successfully.',
        isError: false,
      });
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Failed to update Loventia voucher mapping.',
        isError: true,
      });
    } finally {
      setSavingTeamId(null);
    }
  };

  const isLive = competition?.state === 'LIVE';
  const isPreparing = competition?.state === 'PREPARING';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Section Indicator with stickers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-zinc-800 pb-4">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase tracking-widest">
          <span className="text-emerald-400 font-bold">&gt;_ ADMIN TERMINAL</span>
          <span className="text-zinc-600">//</span>
          <span>§ 01 &middot; MISSION CONTROL</span>
          <span className="text-zinc-600">//</span>
          <span className="text-amber-400 font-bold">LOVENTIA ONLY</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="sticker-tape bg-amber-400 text-black border border-black shadow-[2px_2px_0px_#000]">
            CLEARANCE: ROOT
          </div>
          <div className="sticker-tape-right bg-emerald-400 text-black border border-black shadow-[2px_2px_0px_#000]">
            TARGET: ONLINE
          </div>
        </div>
      </div>

      {/* Main Page Title Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-zinc-100 uppercase">
            Loventia Mission Control
          </h1>
        </div>
        <p className="text-sm font-mono text-zinc-400 max-w-2xl">
          Live competition launch gate and target monitoring for the Loventia voucher breach.
          Admin can launch the target or force-start the round anytime.
        </p>
      </div>

      {/* Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-none border-2 font-mono text-xs flex items-center justify-between gap-3 ${
            actionFeedback.isError
              ? 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-[3px_3px_0px_#f43f5e]'
              : 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-[3px_3px_0px_#10b981]'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.isError ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-zinc-400 hover:text-zinc-100 font-mono text-xs"
          >
            [CLOSE]
          </button>
        </div>
      )}

      {/* SECTION 1: THE TARGET COMMAND BOX */}
      <section className="tech-corner-box border-2 border-emerald-500 bg-zinc-950 p-6 sm:p-7 shadow-[5px_5px_0px_#10b981] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                § 01 &middot; TARGET SYSTEM DEPLOYMENT
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                PERMANENT ACCESS
              </span>
            </div>
            <h2 className="text-lg font-bold font-mono text-zinc-100">
              Loventia Production Instance
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
              Target Reachable
            </span>
          </div>
        </div>

        {/* Target URL Display & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-zinc-900/90 border-2 border-zinc-800">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-mono uppercase text-zinc-500 block">
              Official Target Application URL:
            </span>
            <div className="font-mono text-sm sm:text-base font-bold text-emerald-300 truncate select-all">
              {targetUrl}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleCopyUrl}
              className="px-3.5 py-2.5 text-xs font-mono font-bold uppercase transition-all bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-2 border-zinc-700 flex items-center gap-1.5 shadow-[2px_2px_0px_#000]"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
            </button>

            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 text-xs font-mono font-black uppercase transition-all bg-emerald-500 hover:bg-emerald-400 text-black border-2 border-emerald-400 flex items-center gap-2 shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Launch Target ↗</span>
            </a>
          </div>
        </div>

        <p className="text-xs font-mono text-zinc-400">
          Target link is permanently unlocked for administrators. Participants unlock the target automatically once the round starts.
        </p>
      </section>

      {/* SECTION 2: COMPETITION START / LIFECYCLE GATE */}
      <section className="tech-corner-box border-2 border-amber-500 bg-zinc-950 p-6 sm:p-7 shadow-[5px_5px_0px_#f59e0b] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                § 02 &middot; COMPETITION LAUNCH GATE
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 font-bold uppercase border ${
                  isLive
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : isPreparing
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                {competition?.state || 'PREPARING'}
              </span>
            </div>
            <h2 className="text-lg font-bold font-mono text-zinc-100">
              Synchronized Launch Control
            </h2>
          </div>

          {/* Readiness tally summary */}
          <div className="text-xs font-mono text-zinc-400">
            Squads Ready: <strong className="text-zinc-100">{readiness?.readyTeamsCount ?? 0}</strong> of{' '}
            <strong className="text-zinc-100">{readiness?.totalEligibleTeams ?? 0}</strong>
          </div>
        </div>

        {/* Dynamic State Control Actions */}
        <div className="space-y-4">
          {isPreparing ? (
            <div className="p-5 bg-amber-950/20 border-2 border-amber-500/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-mono text-sm font-bold text-amber-300">
                    Target Locked For Participants (PREPARING)
                  </div>
                  <p className="text-xs font-mono text-zinc-400 max-w-lg">
                    Admin can start the round at any moment. Squad readiness check is completely bypassed when you force start.
                  </p>
                </div>

                <button
                  onClick={handleForceStart}
                  disabled={startingCompetition}
                  className="px-6 py-3.5 text-sm font-mono font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black border-2 border-emerald-400 shadow-[4px_4px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2.5 shrink-0 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  <span>{startingCompetition ? 'Starting Round...' : '⚡ FORCE START COMPETITION NOW'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-emerald-950/20 border-2 border-emerald-500/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-mono text-sm font-bold text-emerald-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ROUND IS LIVE &middot; LOVENTIA UNLOCKED</span>
                  </div>
                  <p className="text-xs font-mono text-zinc-400">
                    All participants can view the target link and submit flags. Elapsed timer is running.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <button
                    onClick={handleTogglePause}
                    disabled={pausingCompetition}
                    className="px-4 py-2.5 text-xs font-mono font-bold uppercase bg-zinc-800 hover:bg-zinc-700 text-amber-300 border-2 border-amber-500/50 flex items-center gap-1.5 shadow-[2px_2px_0px_#000] disabled:opacity-50"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>{competition?.isPaused ? 'Resume Round' : 'Pause Round'}</span>
                  </button>

                  <button
                    onClick={handleResetToPreparing}
                    disabled={resettingCompetition}
                    className="px-4 py-2.5 text-xs font-mono font-bold uppercase bg-zinc-900 hover:bg-zinc-800 text-rose-300 border-2 border-rose-500/50 flex items-center gap-1.5 shadow-[2px_2px_0px_#000] disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Preparing</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: SQUAD ROSTER & LOVENTIA SECRETS MONITOR */}
      <section className="tech-corner-box border-2 border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-[5px_5px_0px_#27272a] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
              § 03 &middot; SQUAD TELEMETRY & VOUCHER MAPPINGS
            </span>
            <h2 className="text-lg font-bold font-mono text-zinc-100">
              Participating Teams Monitor
            </h2>
          </div>

          <div className="text-xs font-mono text-zinc-400">
            Registered Squads: <strong className="text-emerald-400 font-bold">{teams.length}</strong>
          </div>
        </div>

        {/* Clean Squad Table */}
        <div className="overflow-x-auto border-2 border-zinc-800">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-zinc-900 border-b-2 border-zinc-800 text-zinc-400 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Squad Name</th>
                <th className="py-3 px-4">Members</th>
                <th className="py-3 px-4">Loventia Voucher Key</th>
                <th className="py-3 px-4">Readiness</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950/60">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    No teams registered yet.
                  </td>
                </tr>
              ) : (
                teams.map((t) => {
                  const isEditing = editingTeamId === t.id;
                  const isReady = t.isReady;

                  return (
                    <tr key={t.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-zinc-100">
                        {t.name}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {t.membersCount ?? 0} members
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editValenfindId}
                              onChange={(e) => setEditValenfindId(e.target.value)}
                              placeholder="e.g. byte_bandits_vip"
                              className="px-2 py-1 bg-zinc-900 border border-emerald-500 text-xs text-zinc-100 font-mono w-44 focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveTeamMapping(t.id)}
                              disabled={savingTeamId === t.id}
                              className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingTeamId(null)}
                              className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="font-mono text-emerald-400">
                              {t.valenfindTeamId || <span className="text-zinc-600 italic">auto-generated</span>}
                            </span>
                            <button
                              onClick={() => {
                                setEditingTeamId(t.id);
                                setEditValenfindId(t.valenfindTeamId || '');
                              }}
                              className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-opacity"
                              title="Edit Loventia voucher key"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase border ${
                            isReady
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {isReady ? 'READY' : 'PREPARING'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isCompStarted ? (
                          <span className="text-zinc-500 font-mono text-[11px] uppercase tracking-wider">
                            STAGING
                          </span>
                        ) : t.isSolved || t.attemptStatus === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>SOLVED</span>
                          </span>
                        ) : t.attemptStatus === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>ATTEMPTING</span>
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-mono text-[11px] uppercase tracking-wider">
                            PENDING
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
