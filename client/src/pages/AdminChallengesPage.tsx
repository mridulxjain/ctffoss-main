import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type {
  CompetitionConfigDTO,
  CompetitionReadinessSummaryDTO,
  AdminTeamListItemDTO,
} from '@fossctf/shared';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  Shield,
  Activity,
  Globe,
  Users,
  Copy,
  ExternalLink,
  Zap,
  RotateCcw,
  Pause,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit2,
  Check,
  RefreshCw,
  X,
} from 'lucide-react';

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  badge: string;
  description: string;
  confirmLabel: string;
  theme: 'emerald' | 'amber' | 'rose';
  onConfirm: () => Promise<void>;
}

export const AdminChallengesPage: React.FC = () => {
  const { user } = useAuth();

  // Clearance check: Only administrators can access
  const isAuthorizedAdmin =
    user?.role === 'ADMIN' ||
    user?.clubRole === 'admin' ||
    user?.username?.toLowerCase() === 'mridulxjain';

  if (!isAuthorizedAdmin) {
    return <Navigate to="/challenges" replace />;
  }

  // State
  const [competition, setCompetition] = useState<CompetitionConfigDTO | null>(null);
  const [readiness, setReadiness] = useState<CompetitionReadinessSummaryDTO | null>(null);
  const [teams, setTeams] = useState<AdminTeamListItemDTO[]>([]);
  const [, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Action feedback banner
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

  // Execution: Start competition
  const executeForceStart = async () => {
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
    }
  };

  // Open Start Modal Popup
  const openStartModal = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Unlock Target & Start Competition',
      badge: 'Launch Gate',
      description:
        'This will unlock the live Loventia target challenge endpoint for all participant squads. The official synchronized competition timer will immediately start recording.',
      confirmLabel: 'Confirm & Launch Round',
      theme: 'emerald',
      onConfirm: executeForceStart,
    });
  };

  // Execution: Reset competition back to PREPARING
  const executeResetToPreparing = async () => {
    setActionFeedback(null);
    try {
      await api.put('/admin/competition', {
        state: 'PREPARING',
        isPaused: false,
      });
      setActionFeedback({
        text: 'Competition reset to PREPARING state. Participant gate is locked.',
        isError: false,
      });
      await fetchData();
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Failed to reset competition.',
        isError: true,
      });
    }
  };

  // Open Reset Modal Popup
  const openResetModal = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset to Preparation Stage',
      badge: 'System Reset',
      description:
        'This will halt the competition and lock the participant target gate. Teams will be returned to the preparation phase until you launch again.',
      confirmLabel: 'Confirm Reset',
      theme: 'rose',
      onConfirm: executeResetToPreparing,
    });
  };

  // Execution: Toggle pause
  const executeTogglePause = async () => {
    const nextPaused = !competition?.isPaused;
    setActionFeedback(null);
    try {
      await api.put('/admin/competition', {
        isPaused: nextPaused,
      });
      setActionFeedback({
        text: nextPaused
          ? 'Competition paused. Flag submissions are temporarily frozen.'
          : 'Competition resumed. Flag submissions are active.',
        isError: false,
      });
      await fetchData();
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Failed to update competition state.',
        isError: true,
      });
    }
  };

  // Open Pause Modal Popup
  const openPauseModal = () => {
    const isCurrentlyPaused = Boolean(competition?.isPaused);
    setConfirmModal({
      isOpen: true,
      title: isCurrentlyPaused ? 'Resume Competition Round' : 'Pause Competition Round',
      badge: isCurrentlyPaused ? 'Resume Gate' : 'Security Freeze',
      description: isCurrentlyPaused
        ? 'This will unfreeze the competition timer and allow squads to continue submitting flags.'
        : 'This will temporarily freeze submission endpoints and prevent flag acceptance while preserving elapsed time.',
      confirmLabel: isCurrentlyPaused ? 'Resume Competition' : 'Pause Competition',
      theme: 'amber',
      onConfirm: executeTogglePause,
    });
  };

  // Inline team Loventia ID save
  const handleSaveTeamMapping = async (teamId: string) => {
    try {
      setSavingTeamId(teamId);
      await api.patch(`/admin/teams/${teamId}/valenfind-mapping`, {
        valenfindTeamId: editValenfindId.trim() || null,
      });
      setEditingTeamId(null);
      await fetchData();
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Failed to update team Loventia voucher key.',
        isError: true,
      });
    } finally {
      setSavingTeamId(null);
    }
  };

  const isLive = competition?.state === 'LIVE';
  const isPreparing = competition?.state === 'PREPARING';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-7">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-zinc-200 font-semibold">Admin Console</span>
          <span className="text-zinc-700">/</span>
          <span>Operation: Loventia</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-emerald-400 font-medium">
            Administrator Clearance Active
          </span>
        </div>
      </div>

      {/* Main Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-zinc-100">
            Loventia Operations Console
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Monitor target accessibility, control the competition lifecycle, and manage participant squad voucher assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 shrink-0 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sync Telemetry</span>
        </button>
      </div>

      {/* Real-time Status Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Target Status</span>
            <Globe className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Operational</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-500 truncate">{targetUrl}</div>
        </div>

        <div className="p-5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Round State</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-zinc-100 uppercase">
            {competition?.state || 'PREPARING'}
          </div>
          <div className="text-[11px] font-mono text-zinc-400">
            {readiness?.readyTeamsCount ?? 0} of {readiness?.totalEligibleTeams ?? 0} squads ready
          </div>
        </div>

        <div className="p-5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
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
          className={`p-4 rounded-lg border text-xs font-mono flex items-center justify-between gap-3 shadow-sm ${
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
            <span className="font-medium">{actionFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-zinc-400 hover:text-zinc-200 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: Target System Endpoint */}
      <section className="border border-zinc-800/80 bg-zinc-950/70 rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Target Application Endpoint</h2>
            <p className="text-xs text-zinc-400">
              The live challenge target service hosted on Vercel. Admin has permanent access.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-medium self-start sm:self-auto">
            Active Instance
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-lg">
          <div className="font-mono text-xs sm:text-sm text-emerald-400 select-all truncate font-medium">
            {targetUrl}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
            </button>

            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors bg-emerald-500 hover:bg-emerald-400 text-zinc-950 border border-emerald-400 flex items-center gap-1.5"
            >
              <span>Launch Target</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 2: Competition Launch & Lifecycle Gate */}
      <section className="border border-zinc-800/80 bg-zinc-950/70 rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Competition Lifecycle Control</h2>
            <p className="text-xs text-zinc-400">
              Control round status, launch the competition for participants, or pause flag submissions.
            </p>
          </div>
          <span
            className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-medium self-start sm:self-auto border ${
              isLive
                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30'
                : isPreparing
                ? 'bg-amber-950/50 text-amber-300 border-amber-500/30'
                : 'bg-zinc-900 text-zinc-300 border-zinc-700'
            }`}
          >
            {competition?.state || 'PREPARING'}
          </span>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg">
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
                onClick={openStartModal}
                className="px-4 py-2 text-xs font-mono font-semibold uppercase bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 fill-zinc-950" />
                <span>Start Competition</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Competition is Live</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Target link is active for all participants and elapsed timers are synchronized.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={openPauseModal}
                  className="px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg bg-zinc-800 hover:bg-zinc-750 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition-colors"
                >
                  {competition?.isPaused ? <Play className="w-3.5 h-3.5 fill-amber-300" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{competition?.isPaused ? 'Resume Round' : 'Pause Round'}</span>
                </button>

                <button
                  type="button"
                  onClick={openResetModal}
                  className="px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 transition-colors"
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
      <section className="border border-zinc-800/80 bg-zinc-950/70 rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Squad Roster & Voucher Keys</h2>
            <p className="text-xs text-zinc-400">
              Manage team custom Loventia voucher IDs and monitor real-time attempt progress.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400 font-medium">
            Total Squads: {teams.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase text-[11px] font-medium">
              <tr>
                <th className="py-3 px-3.5">Squad Name</th>
                <th className="py-3 px-3.5">Members</th>
                <th className="py-3 px-3.5">Loventia Voucher Key</th>
                <th className="py-3 px-3.5">Readiness</th>
                <th className="py-3 px-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/50">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 px-3.5 text-center text-zinc-500 font-mono">
                    No teams registered yet.
                  </td>
                </tr>
              ) : (
                teams.map((t) => {
                  const isEditing = editingTeamId === t.id;
                  const readyEntry = readiness?.teams?.find((rt) => rt.teamId === t.id);
                  const isReady = Boolean(t.isReady || readyEntry?.isReady);

                  return (
                    <tr key={t.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-3.5 font-semibold text-zinc-100">
                        {t.name}
                      </td>
                      <td className="py-3 px-3.5 text-zinc-400">
                        {t.membersCount ?? t.members?.length ?? 0} members
                      </td>
                      <td className="py-3 px-3.5">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 max-w-xs">
                            <input
                              type="text"
                              value={editValenfindId}
                              onChange={(e) => setEditValenfindId(e.target.value)}
                              placeholder="e.g. team-voucher-id"
                              className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 flex-1"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveTeamMapping(t.id)}
                              disabled={savingTeamId === t.id}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded font-semibold text-[11px]"
                            >
                              {savingTeamId === t.id ? '...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTeamId(null);
                                setEditValenfindId('');
                              }}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-xs ${
                                t.valenfindTeamId ? 'text-zinc-200' : 'text-zinc-600 italic'
                              }`}
                            >
                              {t.valenfindTeamId || '[Unset]'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTeamId(t.id);
                                setEditValenfindId(t.valenfindTeamId || '');
                              }}
                              className="p-1 hover:text-emerald-400 text-zinc-500 transition-colors"
                              title="Edit Loventia voucher mapping"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-medium ${
                            isReady
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                          }`}
                        >
                          {isReady ? 'Ready' : 'Preparing'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        {!isCompStarted ? (
                          <span className="text-zinc-500 font-mono text-[11px]">
                            Preparation
                          </span>
                        ) : t.isSolved || t.attemptStatus === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Solved</span>
                          </span>
                        ) : t.attemptStatus === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Attempting</span>
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-mono text-[11px]">
                            Pending
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

      {/* Professional Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 text-left font-mono relative">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                  confirmModal.theme === 'emerald'
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    : confirmModal.theme === 'amber'
                    ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                }`}
              >
                {confirmModal.badge}
              </span>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="p-1 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-900 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                {confirmModal.theme === 'emerald' ? (
                  <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : confirmModal.theme === 'amber' ? (
                  <Pause className="w-5 h-5 text-amber-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span>{confirmModal.title}</span>
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800">
                {confirmModal.description}
              </p>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={modalLoading}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium border border-zinc-700/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={modalLoading}
                onClick={async () => {
                  setModalLoading(true);
                  try {
                    await confirmModal.onConfirm();
                    setConfirmModal(null);
                  } finally {
                    setModalLoading(false);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                  confirmModal.theme === 'emerald'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                    : confirmModal.theme === 'amber'
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {modalLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{confirmModal.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
