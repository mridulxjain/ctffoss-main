import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type {
  CompetitionConfigDTO,
  CompetitionReadinessSummaryDTO,
  AdminTeamListItemDTO,
} from '@fossctf/shared';
import {
  ExternalLink,
  Copy,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit2,
  Check,
  X,
  Pause,
  RotateCcw,
  Users,
  Shield,
  Activity,
  Globe,
} from 'lucide-react';

export const AdminChallengesPage: React.FC = () => {
  const { user } = useAuth();

  // Strict client-side Admin protection
  if (user && user.role !== 'ADMIN') {
    return <Navigate to="/challenges" replace />;
  }

  // State
  const [competition, setCompetition] = useState<CompetitionConfigDTO | null>(null);
  const [readiness, setReadiness] = useState<CompetitionReadinessSummaryDTO | null>(null);
  const [teams, setTeams] = useState<AdminTeamListItemDTO[]>([]);
  const [, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Action states & synchronous guards
  const [startingCompetition, setStartingCompetition] = useState(false);
  const startingRef = useRef(false);
  const [resettingCompetition, setResettingCompetition] = useState(false);
  const resettingRef = useRef(false);
  const [pausingCompetition, setPausingCompetition] = useState(false);
  const pausingRef = useRef(false);
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

  // FORCE START: Admin can start the competition at any second
  const handleForceStart = async () => {
    if (startingRef.current) return;
    if (!window.confirm('Unlock Loventia and START the competition now?\n\nTarget will immediately become active for all participants without requiring squad readiness.')) {
      return;
    }
    startingRef.current = true;
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
      startingRef.current = false;
      setStartingCompetition(false);
    }
  };

  // Reset competition state back to PREPARING
  const handleResetToPreparing = async () => {
    if (resettingRef.current) return;
    if (!window.confirm('Reset competition back to PREPARING state?\n\nThis will lock the participant target gate again until you start it.')) {
      return;
    }
    resettingRef.current = true;
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
      resettingRef.current = false;
      setResettingCompetition(false);
    }
  };

  // Toggle pause
  const handleTogglePause = async () => {
    if (pausingRef.current) return;
    pausingRef.current = true;
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
      pausingRef.current = false;
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header - Simple and Professional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Administration</span>
            <span>/</span>
            <span className="text-zinc-300">Competition Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Loventia Operations Console
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Monitor target accessibility, control the competition lifecycle, and manage participant squad voucher assignments.
          </p>
        </div>
      </div>

      {/* KPI Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Target Status</span>
            <Globe className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
            <span>Operational</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-500 truncate">{targetUrl}</div>
        </div>

        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Round State</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-zinc-100">
            {competition?.state || 'PREPARING'}
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            {readiness?.readyTeamsCount ?? 0} of {readiness?.totalEligibleTeams ?? 0} squads ready
          </div>
        </div>

        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Enrolled Squads</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-zinc-100">
            {teams.length} Teams
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            Central identity synced
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-mono flex items-center justify-between gap-3 shadow-sm ${
            actionFeedback.isError
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
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
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-zinc-400 hover:text-zinc-100 font-mono text-xs"
          >
            [Close]
          </button>
        </div>
      )}

      {/* SECTION 1: Target System Endpoint */}
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Target Application Endpoint</h2>
            <p className="text-xs text-zinc-400">
              The live challenge target service hosted on Vercel. Admin has permanent access.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-md self-start sm:self-auto font-medium">
            Active Instance
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-md bg-zinc-950 border border-zinc-800">
          <div className="font-mono text-xs sm:text-sm text-emerald-300 select-all truncate">
            {targetUrl}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 flex items-center gap-1.5"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
            </button>

            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm"
            >
              <span>Launch Target</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 2: Competition Launch & Lifecycle Gate */}
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Competition Lifecycle Control</h2>
            <p className="text-xs text-zinc-400">
              Control round status, launch the competition for participants, or pause flag submissions.
            </p>
          </div>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-md font-semibold self-start sm:self-auto border ${
              isLive
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                : isPreparing
                ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}
          >
            {competition?.state || 'PREPARING'}
          </span>
        </div>

        <div className="p-4 rounded-md bg-zinc-950/60 border border-zinc-800/80">
          {isPreparing ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-zinc-200">
                  Target is currently locked for participants
                </div>
                <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
                  Starting the round immediately reveals the target endpoint and enables timer tracking and flag submission.
                </p>
              </div>

              <button
                type="button"
                onClick={handleForceStart}
                disabled={startingCompetition}
                className="px-4 py-2 text-xs font-mono font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{startingCompetition ? 'Starting Round...' : 'Start Competition'}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
                  <span>Competition is Live</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Target link is active for all participants and elapsed timers are synchronized.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTogglePause}
                  disabled={pausingCompetition}
                  className="px-3 py-1.5 text-xs font-mono font-medium rounded-md bg-zinc-800 hover:bg-zinc-750 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{competition?.isPaused ? 'Resume Round' : 'Pause Round'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToPreparing}
                  disabled={resettingCompetition}
                  className="px-3 py-1.5 text-xs font-mono font-medium rounded-md bg-zinc-900 hover:bg-zinc-850 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Preparing</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: Participating Squads & Voucher Mappings */}
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Squad Roster & Voucher Keys</h2>
            <p className="text-xs text-zinc-400">
              Manage team custom Loventia voucher IDs and monitor real-time attempt progress.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            Total Squads: <strong className="text-zinc-200">{teams.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto rounded-md border border-zinc-800">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3.5">Squad Name</th>
                <th className="py-2.5 px-3.5">Members</th>
                <th className="py-2.5 px-3.5">Loventia Voucher Key</th>
                <th className="py-2.5 px-3.5">Readiness</th>
                <th className="py-2.5 px-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/60">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-500">
                    No teams registered in system.
                  </td>
                </tr>
              ) : (
                teams.map((t) => {
                  const isEditing = editingTeamId === t.id;
                  const isReady = t.isReady;

                  return (
                    <tr key={t.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-zinc-100">
                        {t.name}
                      </td>
                      <td className="py-2.5 px-3.5 text-zinc-400">
                        {t.membersCount ?? 0} members
                      </td>
                      <td className="py-2.5 px-3.5">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editValenfindId}
                              onChange={(e) => setEditValenfindId(e.target.value)}
                              placeholder="e.g. byte_bandits_vip"
                              className="px-2 py-1 bg-zinc-900 border border-emerald-500 text-xs text-zinc-100 font-mono w-44 rounded focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveTeamMapping(t.id)}
                              disabled={savingTeamId === t.id}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTeamId(null)}
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="font-mono text-emerald-400 text-xs">
                              {t.valenfindTeamId || <span className="text-zinc-600 italic">auto-generated</span>}
                            </span>
                            <button
                              type="button"
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
                      <td className="py-2.5 px-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] rounded font-semibold uppercase border ${
                            isReady
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {isReady ? 'READY' : 'PREPARING'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        {!isCompStarted ? (
                          <span className="text-zinc-500 font-mono text-[11px] uppercase tracking-wider">
                            STAGING
                          </span>
                        ) : t.isSolved || t.attemptStatus === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>SOLVED</span>
                          </span>
                        ) : t.attemptStatus === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-xs">
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
