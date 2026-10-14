import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type {
  AdminChallengeDTO,
  CategoryDTO,
  CompetitionConfigDTO,
  Difficulty,
  CreateChallengeRequest,
  UpdateChallengeRequest,
} from '@fossctf/shared';
import {
  Shield,
  Plus,
  KeyRound,
  Edit2,
  Archive,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  X,
  Radio,
  Sliders,
} from 'lucide-react';

export const AdminChallengesPage: React.FC = () => {
  const { user } = useAuth();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'challenges' | 'competition'>('challenges');

  // Challenge state
  const [challenges, setChallenges] = useState<AdminChallengeDTO[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Competition state
  const [competition, setCompetition] = useState<CompetitionConfigDTO | null>(null);
  const [compTitle, setCompTitle] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compStart, setCompStart] = useState('');
  const [compEnd, setCompEnd] = useState('');
  const [compPaused, setCompPaused] = useState(false);
  const [savingComp, setSavingComp] = useState(false);
  const [compMessage, setCompMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<AdminChallengeDTO | null>(null);
  const [rotatingChallenge, setRotatingChallenge] = useState<AdminChallengeDTO | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCatId, setFormCatId] = useState('');
  const [formDiff, setFormDiff] = useState<Difficulty>('EASY');
  const [formPoints, setFormPoints] = useState<number>(100);
  const [formIsTimed, setFormIsTimed] = useState(false);
  const [formDuration, setFormDuration] = useState<number>(30);
  const [formFlag, setFormFlag] = useState('');
  const [formPublishImmediately, setFormPublishImmediately] = useState(false);
  const [submittingModal, setSubmittingModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Rotate Flag form state
  const [newFlagValue, setNewFlagValue] = useState('');
  const [rotatingFlag, setRotatingFlag] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);

  // Fetch all initial data
  const fetchChallenges = async () => {
    try {
      setLoadingChallenges(true);
      const [chalData, catData] = await Promise.all([
        api.get('/admin/challenges'),
        api.get('/challenges').catch(() => ({ categories: [] })),
      ]);
      setChallenges(chalData.challenges || []);
      setCategories(catData.categories || []);
    } catch (err: any) {
      setActionFeedback({ text: err.message || 'Failed to load challenges.', isError: true });
    } finally {
      setLoadingChallenges(false);
    }
  };

  const fetchCompetition = async () => {
    try {
      const data = await api.get('/admin/competition');
      const cfg = data.config as CompetitionConfigDTO;
      setCompetition(cfg);
      setCompTitle(cfg.title || '');
      setCompDesc(cfg.description || '');
      setCompStart(cfg.startTime ? formatForInput(cfg.startTime) : '');
      setCompEnd(cfg.endTime ? formatForInput(cfg.endTime) : '');
      setCompPaused(cfg.isPaused || false);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchChallenges();
      fetchCompetition();
    }
  }, [user?.role]);

  const formatForInput = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const yyyy = date.getFullYear();
      const mm = pad(date.getMonth() + 1);
      const dd = pad(date.getDate());
      const hh = pad(date.getHours());
      const min = pad(date.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch {
      return '';
    }
  };

  const showNotification = (text: string, isError = false) => {
    setActionFeedback({ text, isError });
    setTimeout(() => {
      setActionFeedback(null);
    }, 4500);
  };

  // Handle Competition Save
  const handleSaveCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompMessage(null);

    // Validation
    if (compStart && compEnd) {
      const startDate = new Date(compStart);
      const endDate = new Date(compEnd);
      if (endDate <= startDate) {
        setCompMessage({ text: 'Scheduled end time must be after scheduled start time.', isError: true });
        return;
      }
    }

    try {
      setSavingComp(true);
      const res = await api.put('/admin/competition', {
        title: compTitle.trim(),
        description: compDesc.trim(),
        startTime: compStart ? new Date(compStart).toISOString() : null,
        endTime: compEnd ? new Date(compEnd).toISOString() : null,
        isPaused: compPaused,
      });
      setCompetition(res.config);
      setCompMessage({ text: 'Competition settings updated successfully.', isError: false });
    } catch (err: any) {
      setCompMessage({ text: err.message || 'Failed to update competition settings.', isError: true });
    } finally {
      setSavingComp(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormTitle('');
    setFormSlug('');
    setFormDesc('');
    setFormCatId(categories[0]?.id || '');
    setFormDiff('EASY');
    setFormPoints(100);
    setFormIsTimed(false);
    setFormDuration(30);
    setFormFlag('');
    setFormPublishImmediately(false);
    setModalError(null);
    setIsCreateOpen(true);
  };

  // Handle Create Challenge
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formTitle.trim()) {
      setModalError('Challenge title is required.');
      return;
    }
    if (!formDesc.trim()) {
      setModalError('Description is required.');
      return;
    }
    if (!formCatId) {
      setModalError('Category is required.');
      return;
    }
    if (!formFlag.trim()) {
      setModalError('Flag is required for new challenge.');
      return;
    }

    const payload: CreateChallengeRequest = {
      title: formTitle.trim(),
      slug: formSlug.trim() || undefined,
      description: formDesc.trim(),
      categoryId: formCatId,
      difficulty: formDiff,
      points: Number(formPoints),
      flag: formFlag.trim(),
      isTimed: formIsTimed,
      durationMinutes: formIsTimed ? Number(formDuration) : null,
      isPublished: formPublishImmediately,
    };

    try {
      setSubmittingModal(true);
      await api.post('/admin/challenges', payload);
      setIsCreateOpen(false);
      showNotification(`Challenge "${payload.title}" created successfully.`);
      fetchChallenges();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create challenge.');
    } finally {
      setSubmittingModal(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (c: AdminChallengeDTO) => {
    setEditingChallenge(c);
    setFormTitle(c.title);
    setFormSlug(c.slug);
    setFormDesc(c.description);
    setFormCatId(c.categoryId);
    setFormDiff(c.difficulty);
    setFormPoints(c.points);
    setFormIsTimed(c.isTimed);
    setFormDuration(c.durationMinutes || 30);
    setModalError(null);
  };

  // Handle Edit Challenge
  const handleUpdateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallenge) return;
    setModalError(null);

    const payload: UpdateChallengeRequest = {
      title: formTitle.trim(),
      slug: formSlug.trim() || undefined,
      description: formDesc.trim(),
      categoryId: formCatId,
      difficulty: formDiff,
      points: Number(formPoints),
      isTimed: formIsTimed,
      durationMinutes: formIsTimed ? Number(formDuration) : null,
    };

    try {
      setSubmittingModal(true);
      await api.patch(`/admin/challenges/${editingChallenge.id}`, payload);
      setEditingChallenge(null);
      showNotification(`Challenge "${payload.title}" updated successfully.`);
      fetchChallenges();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update challenge metadata.');
    } finally {
      setSubmittingModal(false);
    }
  };

  // Open Rotate Flag Modal
  const openRotateFlagModal = (c: AdminChallengeDTO) => {
    setRotatingChallenge(c);
    setNewFlagValue('');
    setRotateError(null);
  };

  // Handle Rotate Flag
  const handleRotateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotatingChallenge) return;
    setRotateError(null);

    if (!newFlagValue.trim()) {
      setRotateError('New flag value cannot be empty.');
      return;
    }

    try {
      setRotatingFlag(true);
      await api.post(`/admin/challenges/${rotatingChallenge.id}/flag`, {
        flag: newFlagValue.trim(),
      });
      setRotatingChallenge(null);
      showNotification(`Flag rotated successfully for "${rotatingChallenge.title}". Existing solves remain intact.`);
      fetchChallenges();
    } catch (err: any) {
      setRotateError(err.message || 'Failed to update flag.');
    } finally {
      setRotatingFlag(false);
    }
  };

  // Lifecycle toggles
  const handlePublish = async (c: AdminChallengeDTO) => {
    try {
      await api.post(`/admin/challenges/${c.id}/publish`);
      showNotification(`Published "${c.title}". Challenge is now live for participants.`);
      fetchChallenges();
    } catch (err: any) {
      showNotification(err.message || 'Failed to publish challenge.', true);
    }
  };

  const handleUnpublish = async (c: AdminChallengeDTO) => {
    try {
      await api.post(`/admin/challenges/${c.id}/unpublish`);
      showNotification(`Unpublished "${c.title}". Challenge is now hidden as draft.`);
      fetchChallenges();
    } catch (err: any) {
      showNotification(err.message || 'Failed to unpublish challenge.', true);
    }
  };

  const handleArchive = async (c: AdminChallengeDTO) => {
    if (!confirm(`Are you sure you want to archive "${c.title}"? Submissions will be closed, but existing solves and points remain intact.`)) {
      return;
    }
    try {
      await api.post(`/admin/challenges/${c.id}/archive`);
      showNotification(`Archived "${c.title}". Solves preserved; submissions closed.`);
      fetchChallenges();
    } catch (err: any) {
      showNotification(err.message || 'Failed to archive challenge.', true);
    }
  };

  const handleDelete = async (c: AdminChallengeDTO) => {
    if (!confirm(`Are you sure you want to permanently delete "${c.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/admin/challenges/${c.id}`);
      showNotification(`Deleted challenge "${c.title}".`);
      fetchChallenges();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete challenge. Challenges with historical solves must be archived.', true);
    }
  };

  // Unauthorized guard
  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-900/80 flex items-center justify-center text-rose-400 mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-semibold text-zinc-100">Access Restricted</h1>
        <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
          Competition administration requires authoritative platform admin privileges. Use the test account switcher in the top navigation to select Platform Admin for local administrative verification.
        </p>
      </div>
    );
  }

  // Filter challenges
  const filteredChallenges = challenges.filter((c) => {
    const matchesFilter =
      filterStatus === 'ALL'
        ? true
        : filterStatus === 'PUBLISHED'
        ? c.isPublished && !c.isArchived
        : filterStatus === 'DRAFT'
        ? !c.isPublished && !c.isArchived
        : c.isArchived;

    const matchesSearch =
      searchQuery.trim() === '' ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.categoryName && c.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              Competition Administration
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 font-semibold uppercase">
              Admin Portal
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage challenge authoring, secret flags, lifecycle states, and scheduled competition time windows.
          </p>
        </div>

        {/* Global Notification */}
        {actionFeedback && (
          <div
            className={`px-3 py-1.5 rounded-md text-xs border flex items-center gap-2 ${
              actionFeedback.isError
                ? 'bg-rose-950/60 border-rose-900/80 text-rose-300'
                : 'bg-emerald-950/60 border-emerald-900/80 text-emerald-300'
            }`}
          >
            {actionFeedback.isError ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'challenges'
              ? 'border-emerald-500 text-zinc-100'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Challenge Catalog ({challenges.length})
        </button>
        <button
          onClick={() => setActiveTab('competition')}
          className={`px-4 py-2 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'competition'
              ? 'border-emerald-500 text-zinc-100'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Competition Schedule & Settings</span>
          {competition && (
            <span
              className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                competition.state === 'LIVE'
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                  : competition.state === 'SCHEDULED'
                  ? 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {competition.state}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CHALLENGES */}
      {activeTab === 'challenges' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Status Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterStatus === st
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  {st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Right: Search & Create Action */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search challenges..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-md bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 w-44 sm:w-56"
                />
              </div>

              <button
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Challenge</span>
              </button>
            </div>
          </div>

          {/* Challenges Table */}
          {loadingChallenges ? (
            <div className="py-16 text-center text-xs font-mono text-zinc-500">
              Loading challenge catalog...
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-12 text-center space-y-2">
              <p className="text-sm font-medium text-zinc-300">No challenges found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery || filterStatus !== 'ALL'
                  ? 'No challenges match your current filter criteria.'
                  : 'Get started by creating your first competition challenge.'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-medium">
                    <tr>
                      <th className="px-4 py-2.5">Title & Category</th>
                      <th className="px-4 py-2.5">Difficulty</th>
                      <th className="px-4 py-2.5 text-center">Points</th>
                      <th className="px-4 py-2.5 text-center">Timing</th>
                      <th className="px-4 py-2.5 text-center">Solves</th>
                      <th className="px-4 py-2.5 text-center">Lifecycle</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredChallenges.map((c) => {
                      const isArchived = c.isArchived;
                      const isPublished = c.isPublished && !isArchived;
                      const isDraft = !c.isPublished && !isArchived;

                      return (
                        <tr key={c.id} className="hover:bg-zinc-900/60 transition-colors">
                          {/* Title & Category */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <span className="font-medium text-zinc-100 block">{c.title}</span>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                <span className="text-zinc-400">{c.categoryName || 'General'}</span>
                                <span>·</span>
                                <span className="font-mono text-[10px] text-zinc-600">/{c.slug}</span>
                              </div>
                            </div>
                          </td>

                          {/* Difficulty */}
                          <td className="px-4 py-3">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                                c.difficulty === 'EASY'
                                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/40'
                                  : c.difficulty === 'MEDIUM'
                                  ? 'text-amber-400 bg-amber-950/40 border-amber-900/40'
                                  : 'text-rose-400 bg-rose-950/40 border-rose-900/40'
                              }`}
                            >
                              {c.difficulty}
                            </span>
                          </td>

                          {/* Points */}
                          <td className="px-4 py-3 text-center font-mono font-medium text-zinc-200">
                            {c.points}
                          </td>

                          {/* Timing */}
                          <td className="px-4 py-3 text-center">
                            {c.isTimed ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-400">
                                <Clock className="w-3 h-3" />
                                {c.durationMinutes}m
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-[11px]">Untimed</span>
                            )}
                          </td>

                          {/* Solves */}
                          <td className="px-4 py-3 text-center font-mono text-zinc-400">
                            {c.solveCount}
                          </td>

                          {/* Lifecycle Status Pill */}
                          <td className="px-4 py-3 text-center">
                            {isPublished ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 uppercase">
                                Published
                              </span>
                            ) : isArchived ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60 uppercase">
                                Archived
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase">
                                Draft
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Edit metadata */}
                              <button
                                onClick={() => openEditModal(c)}
                                title="Edit metadata"
                                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Rotate flag */}
                              <button
                                onClick={() => openRotateFlagModal(c)}
                                title="Set / Rotate flag (preserves historical solves)"
                                className="p-1 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              {/* Publish / Unpublish */}
                              {isDraft && (
                                <button
                                  onClick={() => handlePublish(c)}
                                  title="Publish challenge"
                                  className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {isPublished && (
                                <button
                                  onClick={() => handleUnpublish(c)}
                                  title="Unpublish (revert to draft)"
                                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                                >
                                  <EyeOff className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Archive */}
                              {!isArchived && (
                                <button
                                  onClick={() => handleArchive(c)}
                                  title="Archive challenge"
                                  className="p-1 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete (only available if 0 solves) */}
                              {c.solveCount === 0 && (
                                <button
                                  onClick={() => handleDelete(c)}
                                  title="Delete challenge"
                                  className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPETITION SETTINGS */}
      {activeTab === 'competition' && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Competition Lifecycle & Schedule
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Configure competition name, active time window, and server-enforced submission availability.
              </p>
            </div>

            {/* Current Status Box */}
            {competition && (
              <div className="p-4 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                    Authoritative Server State
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border uppercase ${
                        competition.state === 'LIVE'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                          : competition.state === 'SCHEDULED'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          : competition.state === 'ENDED'
                          ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                      }`}
                    >
                      {competition.state}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {competition.state === 'LIVE'
                        ? 'Flag submissions accepted'
                        : competition.state === 'SCHEDULED'
                        ? 'Submissions locked until scheduled start'
                        : competition.state === 'ENDED'
                        ? 'Submissions locked (event ended)'
                        : 'Submissions disabled'}
                    </span>
                  </div>
                </div>

                <div className="text-right text-[11px] font-mono text-zinc-500">
                  <div>Server Time:</div>
                  <div className="text-zinc-300">
                    {new Date(competition.serverTime).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveCompetition} className="space-y-4">
              {compMessage && (
                <div
                  className={`p-3 rounded-md text-xs border flex items-center gap-2 ${
                    compMessage.isError
                      ? 'bg-rose-950/60 border-rose-900/80 text-rose-300'
                      : 'bg-emerald-950/60 border-emerald-900/80 text-emerald-300'
                  }`}
                >
                  {compMessage.isError ? (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>{compMessage.text}</span>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Competition Title</label>
                <input
                  type="text"
                  required
                  value={compTitle}
                  onChange={(e) => setCompTitle(e.target.value)}
                  placeholder="e.g. FOSS CTF 2026"
                  className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Description</label>
                <textarea
                  rows={2}
                  value={compDesc}
                  onChange={(e) => setCompDesc(e.target.value)}
                  placeholder="Brief description of the competition..."
                  className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* Schedule Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Scheduled Start Time</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={compStart}
                    onChange={(e) => setCompStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  />
                  <p className="text-[11px] text-zinc-500">Optional. Leave empty for immediate activation.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Scheduled End Time</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={compEnd}
                    onChange={(e) => setCompEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  />
                  <p className="text-[11px] text-zinc-500">Optional. Must be after start time.</p>
                </div>
              </div>

              {/* Pause Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={compPaused}
                    onChange={(e) => setCompPaused(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Emergency Pause (Overrides schedule; blocks all submissions immediately)</span>
                </label>
              </div>

              {/* Save Button */}
              <div className="pt-3 border-t border-zinc-800 flex justify-end">
                <button
                  type="submit"
                  disabled={savingComp}
                  className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {savingComp ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CHALLENGE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-sm font-semibold text-zinc-100">Create New Challenge</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-md bg-rose-950/60 border border-rose-900/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-300">Challenge Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Broken Token"
                    className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Category</label>
                  <select
                    value={formCatId}
                    onChange={(e) => setFormCatId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Difficulty</label>
                  <select
                    value={formDiff}
                    onChange={(e) => setFormDiff(e.target.value as Difficulty)}
                    className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                    <option value="INSANE">Insane</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Points Awarded</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formPoints}
                    onChange={(e) => setFormPoints(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Slug (URL identifier)</label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Challenge Description</label>
                <textarea
                  rows={3}
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Task instructions and hints for participants..."
                  className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* Secret Flag */}
              <div className="p-3.5 rounded-md bg-zinc-900/60 border border-zinc-800 space-y-2">
                <label className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Competition Flag Secret</span>
                </label>
                <input
                  type="text"
                  required
                  value={formFlag}
                  onChange={(e) => setFormFlag(e.target.value)}
                  placeholder="e.g. CTF{crypto_hash_secret_example}"
                  className="w-full px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-700"
                />
                <p className="text-[11px] text-zinc-500">
                  Flags are hashed with HMAC-SHA256 and salt/pepper before storage. Flags are never displayed or stored in plaintext.
                </p>
              </div>

              {/* Timed Session Options */}
              <div className="space-y-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={formIsTimed}
                    onChange={(e) => setFormIsTimed(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Enable shared team timer for this challenge</span>
                </label>

                {formIsTimed && (
                  <div className="pl-6 space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Duration (Minutes)</label>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                      className="w-32 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                )}
              </div>

              {/* Publish immediately */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={formPublishImmediately}
                    onChange={(e) => setFormPublishImmediately(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Publish immediately (default: save as Draft)</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {submittingModal ? 'Creating...' : 'Create Challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CHALLENGE MODAL */}
      {editingChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-sm font-semibold text-zinc-100">Edit Challenge Metadata</h2>
              <button
                onClick={() => setEditingChallenge(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-md bg-rose-950/60 border border-rose-900/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateChallenge} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-300">Challenge Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Category</label>
                  <select
                    value={formCatId}
                    onChange={(e) => setFormCatId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Difficulty</label>
                  <select
                    value={formDiff}
                    onChange={(e) => setFormDiff(e.target.value as Difficulty)}
                    className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                    <option value="INSANE">Insane</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Points Awarded</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formPoints}
                    onChange={(e) => setFormPoints(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Slug</label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Description</label>
                <textarea
                  rows={3}
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* Timed Session Options */}
              <div className="space-y-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={formIsTimed}
                    onChange={(e) => setFormIsTimed(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Enable shared team timer for this challenge</span>
                </label>

                {formIsTimed && (
                  <div className="pl-6 space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Duration (Minutes)</label>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                      className="w-32 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                )}
              </div>

              <div className="p-3 rounded-md bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400">
                To rotate or change the secret flag, use the dedicated <strong className="text-amber-400">Rotate Flag</strong> key action on the challenge row.
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingChallenge(null)}
                  className="px-3 py-1.5 rounded-md border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {submittingModal ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROTATE FLAG MODAL */}
      {rotatingChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-zinc-100">Rotate Challenge Flag</h2>
              </div>
              <button
                onClick={() => setRotatingChallenge(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Updating the flag for <strong className="text-zinc-200">{rotatingChallenge.title}</strong> will securely calculate a new HMAC-SHA256 hash. Existing historical solves and points are preserved.
            </p>

            {rotateError && (
              <div className="p-3 rounded-md bg-rose-950/60 border border-rose-900/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{rotateError}</span>
              </div>
            )}

            <form onSubmit={handleRotateFlag} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">New Flag Secret</label>
                <input
                  type="text"
                  required
                  value={newFlagValue}
                  onChange={(e) => setNewFlagValue(e.target.value)}
                  placeholder="e.g. CTF{new_rotated_secret_flag}"
                  className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRotatingChallenge(null)}
                  className="px-3 py-1.5 rounded-md border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rotatingFlag}
                  className="px-4 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {rotatingFlag ? 'Updating Flag...' : 'Update Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
