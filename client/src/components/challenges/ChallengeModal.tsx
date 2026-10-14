import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Lock, Unlock } from 'lucide-react';
import { api } from '../../lib/api';
import type { ChallengeDetailDTO, HintDTO } from '@fossctf/shared';
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
  const { team } = useAuth();
  const [challenge, setChallenge] = useState<ChallengeDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [flag, setFlag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unlockingHintId, setUnlockingHintId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    isFirstBlood?: boolean;
  } | null>(null);

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/challenges/${challengeId}`);
      setChallenge(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenge();
  }, [challengeId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim()) return;

    if (!team) {
      setFeedback({
        type: 'error',
        message: 'You must join or create a team before submitting flags.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await api.post(`/challenges/${challengeId}/submit`, { flag: flag.trim() });
      if (res.isCorrect) {
        setFeedback({
          type: 'success',
          message: res.isFirstBlood
            ? 'Correct flag verified. First Blood recorded for your team!'
            : 'Correct flag verified. Points awarded to your team.',
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
            <div className="flex items-center gap-2 mb-1.5">
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
              {/* Solved Status Banner */}
              {challenge.isSolvedByTeam && (
                <div className="p-3 rounded-md bg-emerald-950/30 border border-emerald-900/50 flex items-center gap-2.5 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>This challenge has already been solved by your team.</span>
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
              {!challenge.isSolvedByTeam && (
                <div className="space-y-2 pt-1 border-t border-zinc-800">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Submit Flag
                  </span>
                  <form onSubmit={handleSubmit} className="space-y-2.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={flag}
                        onChange={(e) => setFlag(e.target.value)}
                        placeholder="FOSSCTF{...}"
                        className="flex-1 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-zinc-600 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={submitting || !flag.trim()}
                        className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs transition-colors shrink-0"
                      >
                        {submitting ? 'Checking...' : 'Submit'}
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
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
