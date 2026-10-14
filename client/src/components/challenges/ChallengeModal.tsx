import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Clock,
  Play,
  ExternalLink,
  Timer,
  Trophy,
  Shield,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  formatElapsedDuration,
  type ChallengeDetailDTO,
  type HintDTO,
  type TeamChallengeSessionDTO,
  type CompetitionAttemptDTO,
} from '@fossctf/shared';
import { useAuth } from '../../context/AuthContext';

interface ChallengeModalProps {
  challengeId: string;
  onClose: () => void;
  onSolved: () => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  challengeId,
  onClose,
  onSolved,
}) => {
  const { user, team } = useAuth();
  const [challenge, setChallenge] = useState<ChallengeDetailDTO | null>(null);
  const [session, setSession] = useState<TeamChallengeSessionDTO | null>(null);
  const [compAttempt, setCompAttempt] = useState<CompetitionAttemptDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [flag, setFlag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [unlockingHintId, setUnlockingHintId] = useState<string | null>(null);
  const [remainingSecs, setRemainingSecs] = useState<number | null>(null);
  const [liveElapsedMs, setLiveElapsedMs] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    isFirstBlood?: boolean;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isCompetitionChallenge = Boolean(
    challenge?.isCompetitionChallenge || challenge?.slug === 'valenfind'
  );

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      const data: ChallengeDetailDTO = await api.get(`/challenges/${challengeId}`);
      setChallenge(data);

      if (data.session) {
        setSession(data.session);
        setRemainingSecs(data.session.remainingSeconds);
      }

      if (data.competitionAttempt) {
        setCompAttempt(data.competitionAttempt);
      } else if (team && (data.isCompetitionChallenge || data.slug === 'valenfind')) {
        // Retrieve persistent competition attempt status if not attached
        const attempt = await api.get('/competition/attempt').catch(() => null);
        if (attempt) {
          setCompAttempt(attempt);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const syncSession = async () => {
    if (!team) return;

    if (isCompetitionChallenge) {
      // Periodically sync authoritative competition attempt for teammates
      if (compAttempt?.status !== 'COMPLETED') {
        try {
          const attempt = await api.get('/competition/attempt');
          if (attempt) {
            setCompAttempt(attempt);
            if (attempt.status === 'COMPLETED') {
              onSolved();
            }
          }
        } catch {
          // Ignore background sync errors
        }
      }
      return;
    }

    if (!challenge?.isTimed || challenge?.isSolvedByTeam) return;
    try {
      const data = await api.get(`/challenges/${challengeId}/session`);
      setSession(data);
      setRemainingSecs(data.remainingSeconds);
    } catch {
      // Ignore background sync errors
    }
  };

  useEffect(() => {
    fetchChallenge();
  }, [challengeId]);

  // Periodic session synchronization every 5 seconds for timed challenges & competition attempts
  useEffect(() => {
    const interval = setInterval(syncSession, 5000);
    return () => clearInterval(interval);
  }, [challenge?.isTimed, challenge?.isSolvedByTeam, isCompetitionChallenge, compAttempt?.status, challengeId]);

  // Smooth countdown ticker for standard active sessions
  useEffect(() => {
    if (!isCompetitionChallenge && session?.status === 'ACTIVE' && session.expiresAt) {
      const targetTime = new Date(session.expiresAt).getTime();

      const updateRemaining = () => {
        const diff = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
        setRemainingSecs(diff);
        if (diff === 0 && session.status === 'ACTIVE') {
          setSession((prev) => (prev ? { ...prev, status: 'EXPIRED', remainingSeconds: 0 } : null));
        }
      };

      updateRemaining();
      timerRef.current = setInterval(updateRemaining, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isCompetitionChallenge, session?.status, session?.expiresAt]);

  // Authoritative live elapsed timer for competition attempts
  useEffect(() => {
    if (isCompetitionChallenge && compAttempt?.status === 'IN_PROGRESS' && compAttempt.startedAt) {
      const startMs = new Date(compAttempt.startedAt).getTime();

      const updateElapsed = () => {
        const elapsed = Math.max(0, Date.now() - startMs);
        setLiveElapsedMs(elapsed);
      };

      updateElapsed();
      elapsedTimerRef.current = setInterval(updateElapsed, 200);

      return () => {
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      };
    } else if (compAttempt?.status === 'COMPLETED' && compAttempt.elapsedMs !== null) {
      setLiveElapsedMs(compAttempt.elapsedMs);
    }
  }, [isCompetitionChallenge, compAttempt?.status, compAttempt?.startedAt, compAttempt?.elapsedMs]);

  // Handle ESC key to close modal & lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleStartChallenge = async () => {
    if (user?.role === 'ADMIN' && !team) {
      const target = challenge?.externalUrl || 'https://ctffoss.vercel.app';
      window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!team) {
      alert('You must belong to a team in the FOSS Club identity system to start this challenge.');
      return;
    }

    setStartingSession(true);
    setFeedback(null);

    try {
      if (isCompetitionChallenge) {
        const res = await api.post('/competition/attempt/start');
        setCompAttempt(res);
      } else {
        const res = await api.post(`/challenges/${challengeId}/start`);
        setSession(res);
        setRemainingSecs(res.remainingSeconds);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to start challenge session',
      });
    } finally {
      setStartingSession(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim()) return;

    if (!team) {
      setFeedback({
        type: 'error',
        message: 'You must belong to a team in the FOSS Club identity system to submit flags.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      if (isCompetitionChallenge) {
        // Valenfind flag submission: verify via authoritative backend verifier
        const res = await api.post('/competition/attempt/submit', { flag: flag.trim() });
        const updatedAttempt = res.attempt || res;
        setCompAttempt(updatedAttempt);
        setFeedback({
          type: 'success',
          message: res.message || 'Challenge flag verified successfully! Competition attempt completed.',
        });
        setFlag('');
        onSolved();
        fetchChallenge();
      } else {
        // Standard challenge flag submission
        const res = await api.post(`/challenges/${challengeId}/submit`, { flag: flag.trim() });
        if (res.isCorrect) {
          setFeedback({
            type: 'success',
            message: res.message,
            isFirstBlood: res.isFirstBlood,
          });
          setFlag('');
          onSolved();
          fetchChallenge();
        } else {
          setFeedback({
            type: 'error',
            message: res.message || 'Incorrect flag. Please check formatting and try again.',
          });
        }
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Submission error. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlockHint = async (hint: HintDTO) => {
    if (!team) {
      alert('You must be a member of a team to unlock hints.');
      return;
    }

    if (
      hint.cost > 0 &&
      !window.confirm(
        `Unlocking this hint will deduct ${hint.cost} points from your team score. Continue?`
      )
    ) {
      return;
    }

    setUnlockingHintId(hint.id);
    try {
      await api.post(`/challenges/${challengeId}/hints/${hint.id}/unlock`);
      await fetchChallenge();
      onSolved();
    } catch (err: any) {
      alert(err.message || 'Failed to unlock hint');
    } finally {
      setUnlockingHintId(null);
    }
  };

  const difficultyBadge = (diff: string) => {
    switch (diff) {
      case 'EASY':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-900/40';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-950/40 border-amber-900/40';
      case 'HARD':
        return 'text-rose-400 bg-rose-950/40 border-rose-900/40';
      case 'INSANE':
        return 'text-purple-400 bg-purple-950/40 border-purple-900/40';
      default:
        return 'text-zinc-400 bg-zinc-900 border-zinc-800';
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const isTimed = challenge?.isTimed;
  const isSolved = Boolean(challenge?.isSolvedByTeam || compAttempt?.status === 'COMPLETED');
  const compStatus = compAttempt?.status || 'NOT_STARTED';
  const sessionStatus = isSolved
    ? 'COMPLETED'
    : isCompetitionChallenge
    ? (compStatus === 'IN_PROGRESS' ? 'ACTIVE' : compStatus)
    : session?.status || 'NOT_STARTED';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs text-zinc-400">{challenge?.categoryName || 'Challenge'}</span>
              {challenge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${difficultyBadge(
                    challenge.difficulty
                  )}`}
                >
                  {challenge.difficulty}
                </span>
              )}
              {isCompetitionChallenge ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-700/60 bg-emerald-950/40 text-emerald-300 flex items-center gap-1">
                  <Timer className="w-2.5 h-2.5" />
                  Timed Competition Challenge
                </span>
              ) : isTimed ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Timed ({challenge.durationMinutes || 30}m)
                </span>
              ) : null}
            </div>
            <h2 className="text-base font-semibold text-zinc-100">
              {challenge ? challenge.title : 'Loading challenge...'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {challenge && (
              <div className="font-mono text-sm font-semibold text-zinc-100">
                {challenge.points} <span className="text-xs text-zinc-500 font-normal">pts</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {loading || !challenge ? (
            <div className="py-8 text-center text-xs font-mono text-zinc-500">
              Loading challenge data...
            </div>
          ) : (
            <>
              {/* Solved / Completed Status Banner */}
              {isSolved && (
                <div className="p-4 rounded-md bg-emerald-950/30 border border-emerald-900/50 space-y-2 text-xs text-emerald-400">
                  <div className="flex items-center gap-2.5 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Challenge Completed</span>
                  </div>

                  {isCompetitionChallenge && compAttempt?.elapsedMs !== null && compAttempt?.elapsedMs !== undefined && (
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-900/40 font-mono text-xs">
                      <span className="text-zinc-400">Official Elapsed Time:</span>
                      <span className="font-bold text-emerald-300">
                        {formatElapsedDuration(compAttempt.elapsedMs)}
                      </span>
                    </div>
                  )}

                  {isCompetitionChallenge && (
                    <div className="pt-2">
                      <Link
                        to="/competition/leaderboard"
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>View standing on Timed Competition Leaderboard</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: Timed Loventia Competition Attempt Controls */}
              {isCompetitionChallenge && !isSolved && (
                <div className="p-4 rounded-md border border-zinc-800 bg-zinc-900/60 space-y-4">
                  {user?.role === 'ADMIN' && (
                    <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                          <Shield className="w-3.5 h-3.5" />
                          <span>Admin Preview — Target Environment</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                          {challenge.externalUrl || 'https://ctffoss.vercel.app'}
                        </p>
                      </div>
                      <a
                        href={challenge.externalUrl || 'https://ctffoss.vercel.app'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shrink-0"
                      >
                        <span>Launch Target</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {!challenge.externalUrl && user?.role !== 'ADMIN' ? (
                    <div className="relative overflow-hidden rounded-md border border-amber-900/40 bg-zinc-950 p-5">
                      <div className="absolute inset-0 backdrop-blur-sm bg-zinc-950/75 z-10 flex flex-col items-center justify-center p-4 text-center">
                        <div className="p-2.5 rounded-full bg-zinc-900 border border-amber-800/60 mb-2">
                          <Lock className="w-5 h-5 text-amber-400" />
                        </div>
                        <span className="text-xs font-semibold text-zinc-100">Loventia Challenge Locked</span>
                        <p className="text-[11px] text-zinc-400 mt-1.5 max-w-sm leading-relaxed">
                          The Loventia target URL is concealed and locked until the official synchronized start. The administrator will unlock the competition when all eligible teams are Ready.
                        </p>
                      </div>
                      <div className="filter blur-md select-none opacity-30 space-y-2 pointer-events-none py-4">
                        <div className="h-4 bg-zinc-700 rounded w-3/4 mx-auto"></div>
                        <div className="h-8 bg-zinc-800 rounded w-full"></div>
                        <div className="h-4 bg-zinc-700 rounded w-1/2 mx-auto"></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {compStatus === 'NOT_STARTED' && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                              <Timer className="w-3.5 h-3.5 text-amber-400" />
                              <span>Official Synchronized Competition Attempt</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-1">
                              The competition is LIVE! Click below to access Loventia. All teams share the official synchronized start timer.
                            </p>
                          </div>

                          <button
                            onClick={handleStartChallenge}
                            disabled={startingSession || (!team && user?.role !== 'ADMIN')}
                            className="px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{startingSession ? 'Opening...' : 'Start Challenge'}</span>
                          </button>
                        </div>
                      )}

                      {compStatus === 'IN_PROGRESS' && (
                        <div className="space-y-3">
                          {/* Live Synchronized Timer & Status */}
                          <div className="flex items-center justify-between bg-zinc-950 p-3 rounded border border-zinc-800">
                            <div>
                              <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                <span className="font-semibold text-emerald-400">Attempt In Progress</span>
                              </div>
                              {compAttempt?.startedAt && (
                                <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                                  Official start: {new Date(compAttempt.startedAt).toLocaleTimeString()}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-emerald-400 font-mono font-bold text-sm">
                              <Timer className="w-3.5 h-3.5 animate-pulse" />
                              <span>
                                {liveElapsedMs !== null
                                  ? formatElapsedDuration(liveElapsedMs)
                                  : '00:00.000'}
                              </span>
                            </div>
                          </div>

                          {/* Prominent External Challenge Action */}
                          <div className="p-3 rounded-md bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-xs text-zinc-300">
                              <span className="font-medium text-zinc-100">Step 1:</span> Solve the challenge in Loventia, extract your voucher, and generate your team flag.
                            </div>

                            <a
                              href={challenge.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                            >
                              <span>Open Loventia Challenge</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* SECTION: Standard Timed Session Controls (Non-Competition Challenges) */}
              {!isCompetitionChallenge && isTimed && !isSolved && (
                <div className="p-3.5 rounded-md border border-zinc-800 bg-zinc-900/50 space-y-3">
                  {sessionStatus === 'NOT_STARTED' && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Timed Challenge ({challenge.durationMinutes || 30} Minutes)</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Starting initiates a shared timer for all members of your team.
                        </p>
                      </div>

                      <button
                        onClick={handleStartChallenge}
                        disabled={startingSession || !team}
                        className="px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        {startingSession ? 'Starting...' : 'Start for Team'}
                      </button>
                    </div>
                  )}

                  {sessionStatus === 'ACTIVE' && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider block">
                          Shared Team Session Active
                        </span>
                        <div className="text-[11px] text-zinc-500">
                          Synchronized across all active teammates.
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-emerald-400 font-mono font-semibold text-sm">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        <span>{remainingSecs !== null ? formatCountdown(remainingSecs) : '...'}</span>
                      </div>
                    </div>
                  )}

                  {sessionStatus === 'EXPIRED' && (
                    <div className="flex items-center gap-2 text-xs text-rose-400">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <div>
                        <div className="font-medium">Time Limit Expired</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          The shared time window for this challenge has elapsed. Submissions are closed.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Description
                </span>
                <div className="text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap rounded-md bg-zinc-900/60 border border-zinc-800/80 p-3.5 font-sans">
                  {challenge.description}
                </div>
              </div>

              {/* External Challenge Link for reference */}
              {challenge.externalUrl && !isSolved && (
                <div className="text-xs text-zinc-400 flex items-center justify-between p-3 rounded-md bg-zinc-900/40 border border-zinc-800">
                  <span>Target Service:</span>
                  <a
                    href={challenge.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 hover:underline"
                  >
                    <span>{challenge.externalUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Hints */}
              {challenge.hints && challenge.hints.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Hints
                  </span>
                  <div className="space-y-1.5">
                    {challenge.hints.map((hint, idx) => (
                      <div
                        key={hint.id}
                        className="p-3 rounded-md border border-zinc-800 bg-zinc-900/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-zinc-400">
                          <span className="flex items-center gap-1.5 font-medium">
                            {hint.isUnlocked ? (
                              <Unlock className="w-3.5 h-3.5 text-zinc-400" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-zinc-500" />
                            )}
                            Hint #{idx + 1}
                          </span>
                          {!hint.isUnlocked && (
                            <button
                              onClick={() => handleUnlockHint(hint)}
                              disabled={unlockingHintId === hint.id}
                              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                            >
                              {unlockingHintId === hint.id
                                ? 'Unlocking...'
                                : hint.cost === 0
                                ? 'View'
                                : `Unlock (-${hint.cost} pts)`}
                            </button>
                          )}
                        </div>
                        {hint.isUnlocked && (
                          <p className="text-zinc-200 pt-1 border-t border-zinc-800/60">
                            {hint.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flag Submission Form */}
              {!isSolved && (
                <div className="space-y-2 pt-1 border-t border-zinc-800">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    {isCompetitionChallenge ? 'Step 2: Submit Verified Flag' : 'Submit Flag'}
                  </span>

                  {isCompetitionChallenge && !challenge.externalUrl ? (
                    <div className="p-3 rounded-md bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-500">
                      Flag submissions are locked until the competition administrator unlocks Loventia and officially starts the competition.
                    </div>
                  ) : isCompetitionChallenge && compStatus === 'NOT_STARTED' ? (
                    <div className="p-3 rounded-md bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400">
                      Click <strong className="text-zinc-200">Start Challenge</strong> above to initiate your team's official attempt before submitting flags.
                    </div>
                  ) : !isCompetitionChallenge && isTimed && sessionStatus === 'NOT_STARTED' ? (
                    <div className="p-3 rounded-md bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400">
                      Start the challenge session above to begin submitting flags.
                    </div>
                  ) : !isCompetitionChallenge && isTimed && sessionStatus === 'EXPIRED' ? (
                    <div className="p-3 rounded-md bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-500">
                      Flag submission is disabled because the team session has expired.
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-2.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={flag}
                          onChange={(e) => setFlag(e.target.value)}
                          placeholder="FOSSCTF{...}"
                          disabled={submitting}
                          className="flex-1 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-zinc-600 transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={submitting || !flag.trim()}
                          className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs transition-colors shrink-0"
                        >
                          {submitting ? 'Verifying...' : 'Submit Flag'}
                        </button>
                      </div>

                      {/* Submission Feedback */}
                      {feedback && (
                        <div
                          className={`p-2.5 rounded-md text-xs flex items-start gap-2 ${
                            feedback.type === 'success'
                              ? 'bg-emerald-950/40 border border-emerald-900/60 text-emerald-300'
                              : 'bg-rose-950/40 border border-rose-900/60 text-rose-300'
                          }`}
                        >
                          {feedback.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                          )}
                          <span>{feedback.message}</span>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
