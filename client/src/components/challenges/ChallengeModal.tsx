import React, { useState, useEffect } from 'react';
import { X, Trophy, AlertCircle, CheckCircle2, Flame, HelpCircle, Lock, Unlock, Send } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim()) return;

    if (!team) {
      setFeedback({
        type: 'error',
        message: 'You must join or create a team before submitting flags!',
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
          message: res.message,
          isFirstBlood: res.isFirstBlood,
        });
        setFlag('');
        onSolved();
        // Refresh challenge state to mark as solved
        fetchChallenge();
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Incorrect flag. Please try again.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Submission failed. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlockHint = async (hint: HintDTO) => {
    if (!team) {
      alert('You must be in a team to unlock hints.');
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
      onSolved(); // Refresh team score
    } catch (err: any) {
      alert(err.message || 'Failed to unlock hint');
    } finally {
      setUnlockingHintId(null);
    }
  };

  if (loading || !challenge) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="glass-panel p-8 rounded-2xl border border-slate-700 text-slate-300">
          Loading challenge data...
        </div>
      </div>
    );
  }

  const difficultyColors = {
    EASY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    HARD: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    INSANE: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0b1120] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-start justify-between bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-medium text-slate-400">
                {challenge.categoryName}
              </span>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                  difficultyColors[challenge.difficulty]
                }`}
              >
                {challenge.difficulty}
              </span>
              {challenge.isSolvedByTeam && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500 text-black flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Solved
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{challenge.title}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xl font-mono font-bold text-emerald-400">
                {challenge.points} pts
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 justify-end">
                <Trophy className="w-3 h-3 text-amber-400" />
                {challenge.solveCount} {challenge.solveCount === 1 ? 'solve' : 'solves'}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Description */}
          <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 font-sans">
            {challenge.description}
          </div>

          {/* Author note */}
          {challenge.author && (
            <div className="text-xs text-slate-400 font-mono">
              Challenge Author: <span className="text-slate-300">@{challenge.author}</span>
            </div>
          )}

          {/* Hints Section */}
          {challenge.hints && challenge.hints.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                Hints Available
              </h3>

              <div className="space-y-2">
                {challenge.hints.map((hint, idx) => (
                  <div
                    key={hint.id}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 text-xs"
                  >
                    {hint.isUnlocked ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-cyan-400 font-semibold font-mono text-[11px]">
                          <span className="flex items-center gap-1">
                            <Unlock className="w-3 h-3" /> Hint #{idx + 1}
                          </span>
                          {hint.cost > 0 && <span>(-{hint.cost} pts)</span>}
                        </div>
                        <p className="text-slate-200 mt-1">{hint.content}</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Hint #{idx + 1}</span>
                          <span className="text-slate-400 font-mono">
                            {hint.cost === 0 ? '(Free)' : `(Cost: ${hint.cost} pts)`}
                          </span>
                        </div>

                        <button
                          onClick={() => handleUnlockHint(hint)}
                          disabled={unlockingHintId === hint.id}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium transition text-xs flex items-center gap-1"
                        >
                          <Unlock className="w-3 h-3" />
                          {unlockingHintId === hint.id ? 'Unlocking...' : 'Unlock Hint'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flag Submission Area */}
          <div className="pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-emerald-400" />
              Flag Submission
            </h3>

            {challenge.isSolvedByTeam ? (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold">Challenge already solved by your team!</div>
                  <div className="text-xs text-emerald-400/80">
                    Points have been credited to your team on the scoreboard.
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={flag}
                    onChange={(e) => setFlag(e.target.value)}
                    placeholder="FOSSCTF{your_flag_here}"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-400 font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !flag.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-sm tracking-wide transition flex items-center gap-2 shadow-glow"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Verifying...' : 'Submit'}
                  </button>
                </div>

                {/* Feedback message */}
                {feedback && (
                  <div
                    className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 animate-in slide-in-from-top-1 ${
                      feedback.type === 'success'
                        ? feedback.isFirstBlood
                          ? 'bg-amber-950/40 border border-amber-500/40 text-amber-300'
                          : 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/40 border border-red-500/40 text-red-300'
                    }`}
                  >
                    {feedback.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                    )}
                    <div>
                      <div className="font-semibold">{feedback.message}</div>
                      {feedback.isFirstBlood && (
                        <div className="text-xs text-amber-400 font-mono mt-0.5">
                          🏆 You captured the FIRST BLOOD on this challenge!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
