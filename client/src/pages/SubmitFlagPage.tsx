import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Terminal,
  Send,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  ArrowRight,
  Clock,
  ExternalLink,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type {
  CompetitionConfigDTO,
  CompetitionAttemptDTO,
  LoventiaVoucherStatusResponse,
} from '@fossctf/shared';

export const SubmitFlagPage: React.FC = () => {
  const { team, refreshSession } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [competition, setCompetition] = useState<CompetitionConfigDTO | null>(null);
  const [compAttempt, setCompAttempt] = useState<CompetitionAttemptDTO | null>(null);
  const [loading, setLoading] = useState(true);

  // Flag input & submission state
  const [flagInput, setFlagInput] = useState('');
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const submittingFlagRef = useRef(false);
  const [flagFeedback, setFlagFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Live elapsed timer
  const [elapsedString, setElapsedString] = useState<string>('00:00:00');
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    try {
      const [compData, attemptData, voucherStatusRaw] = await Promise.all([
        api.get<CompetitionConfigDTO>('/competition').catch(() => null),
        team ? api.get('/competition/attempt').catch(() => null) : Promise.resolve(null),
        team
          ? api
              .get<LoventiaVoucherStatusResponse>('/competition/loventia/voucher-status')
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      if (compData) {
        setCompetition(compData);
      }

      const attempt: CompetitionAttemptDTO | null =
        (attemptData as any)?.attempt !== undefined
          ? (attemptData as any).attempt
          : (attemptData as any)?.data !== undefined
          ? (attemptData as any).data
          : attemptData || null;

      setCompAttempt(attempt);

      const voucherStatus: LoventiaVoucherStatusResponse | null =
        (voucherStatusRaw as any)?.data !== undefined
          ? (voucherStatusRaw as any).data
          : voucherStatusRaw;

      // If team's flag was already minted, pre-fill it if input is currently empty
      if (voucherStatus?.redeemed && voucherStatus?.flag) {
        setFlagInput((current) => current || voucherStatus.flag!);
      }
    } catch (err) {
      console.error('Failed to load flag submission data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [team]);

  // Check state or query param for pre-filled flag
  useEffect(() => {
    const passedFlag = (location.state as any)?.flag || searchParams.get('flag');
    if (passedFlag && typeof passedFlag === 'string') {
      setFlagInput(passedFlag.trim());
    }
  }, [location.state, searchParams]);

  // Live timer tick calculation
  useEffect(() => {
    const updateTimer = () => {
      if (!competition) return;

      if (compAttempt?.status === 'COMPLETED' && compAttempt.elapsedMs != null) {
        const totalSec = Math.floor(compAttempt.elapsedMs / 1000);
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        setElapsedString(
          `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        );
        return;
      }

      if (competition.state === 'LIVE' && competition.startTime) {
        const startMs = new Date(competition.startTime).getTime();
        const nowMs = Date.now();
        const diffMs = Math.max(0, nowMs - startMs);

        const totalSec = Math.floor(diffMs / 1000);
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        setElapsedString(
          `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        );
      } else {
        setElapsedString('00:00:00');
      }
    };

    updateTimer();
    elapsedTimerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [competition, compAttempt]);

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagInput.trim()) return;

    if (submittingFlagRef.current) return;
    submittingFlagRef.current = true;

    if (!team) {
      setFlagFeedback({
        type: 'error',
        message: 'You must belong to a team in the FOSS Club identity system to submit flags.',
      });
      submittingFlagRef.current = false;
      return;
    }

    setSubmittingFlag(true);
    setFlagFeedback(null);

    try {
      const res = await api.post('/competition/attempt/submit', { flag: flagInput.trim() });
      setFlagFeedback({
        type: 'success',
        message: (res as any)?.message || 'FLAG VERIFIED! YOUR SQUAD HAS CONQUERED THE ARENA.',
      });
      setFlagInput('');
      await fetchData();
      refreshSession();
    } catch (err: any) {
      setFlagFeedback({
        type: 'error',
        message: err.message || 'Flag rejected. Invalid signature or voucher verification failed.',
      });
    } finally {
      submittingFlagRef.current = false;
      setSubmittingFlag(false);
    }
  };

  const isSolved = compAttempt?.status === 'COMPLETED';
  const isLive = competition?.state === 'LIVE';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Top Cyber Navigation & Status Stickers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <Link
          to="/challenges"
          className="text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-2 font-mono text-xs font-bold group w-fit"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span>Back to Loventia Challenge</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="sticker-tape bg-[#fef08a] text-zinc-950 font-black text-[10px] uppercase tracking-wider">
            DISPATCH GATEWAY
          </div>
          <div className="sticker-tape-right bg-[#bae6fd] text-zinc-950 font-black text-[10px] uppercase tracking-wider">
            PORT_1337 // SECURE
          </div>
        </div>
      </div>

      {/* Main Flag Submission Console */}
      <section className="border-3 border-black bg-zinc-950 p-6 sm:p-8 md:p-10 shadow-[6px_6px_0px_#000] space-y-8 relative overflow-hidden">
        {/* Console Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-black inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-black inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black inline-block" />
              <span className="ml-1 text-xs font-mono font-black text-emerald-400 uppercase tracking-widest">
                [FLAG_SUBMISSION_PORTAL] // /submit
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-zinc-100 uppercase tracking-tight flex items-center gap-2.5">
              <Terminal className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400 stroke-[2.5]" />
              <span>DISPATCH CAPTURE TOKEN</span>
            </h1>
          </div>

          {/* Squad & Timer Badges */}
          <div className="flex items-center flex-wrap gap-2.5 font-mono">
            {team && (
              <div className="px-3.5 py-1.5 bg-zinc-900 border-2 border-black shadow-[2px_2px_0px_#000] text-zinc-300 text-xs font-black uppercase flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-pink-400" />
                <span>{team.name}</span>
              </div>
            )}
            <div className="px-3.5 py-1.5 bg-black border-2 border-black shadow-[2px_2px_0px_#000] text-emerald-400 text-xs font-black flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span>{elapsedString}</span>
            </div>
          </div>
        </div>

        {/* Team Requirement Warning */}
        {!team && (
          <div className="p-4 sm:p-5 border-2 border-black bg-rose-500/20 border-rose-500 text-rose-200 font-mono text-xs sm:text-sm font-bold flex items-center justify-between flex-wrap gap-3 shadow-[3px_3px_0px_#000]">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 stroke-[2.5]" />
              <span>You must belong to an official squad to transmit flags and record solves.</span>
            </div>
            <Link
              to="/team"
              className="px-4 py-1.5 bg-rose-500 hover:bg-rose-400 text-black font-black uppercase text-xs border border-black shadow-[2px_2px_0px_#000] transition-all"
            >
              Go to Squad
            </Link>
          </div>
        )}

        {/* Competition Not Live Warning */}
        {team && !isLive && !isSolved && (
          <div className="p-4 sm:p-5 border-2 border-black bg-amber-500/20 border-amber-500 text-amber-200 font-mono text-xs sm:text-sm font-bold flex items-center gap-3 shadow-[3px_3px_0px_#000]">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 stroke-[2.5]" />
            <span>
              The competition is not yet LIVE. Flag submission will unlock as soon as the synchronized start signal triggers.
            </span>
          </div>
        )}

        {/* Solved Victory Banner */}
        {isSolved ? (
          <div className="p-6 sm:p-8 border-3 border-black bg-emerald-400 text-black shadow-[6px_6px_0px_#000] font-mono space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 font-black text-lg sm:text-xl uppercase">
                <Trophy className="w-7 h-7 text-black stroke-[2.5]" />
                <span>LOVENTIA FLAG CONQUERED &amp; VERIFIED</span>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <Link
                  to="/competition/leaderboard"
                  className="px-4 py-2 bg-black text-emerald-400 hover:text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-all"
                >
                  <span>Leaderboard</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </Link>
                <Link
                  to="/challenges"
                  className="px-4 py-2 bg-zinc-900 text-zinc-100 hover:text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-all"
                >
                  <span>Challenge Page</span>
                </Link>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-950 font-bold leading-relaxed">
              Your squad has officially conquered the Loventia arena. Your solve duration is locked at{' '}
              <strong className="underline font-black">{elapsedString}</strong> and permanently recorded on the synchronized competition leaderboard!
            </p>
          </div>
        ) : (
          <div className="space-y-6 font-mono">
            {/* FLAG TRANSMISSION FORM */}
            <form onSubmit={handleSubmitFlag} className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="flagInput"
                    className="text-xs sm:text-sm font-mono text-zinc-100 font-black uppercase tracking-wider block"
                  >
                    TRANSMIT OFFICIAL CAPTURE FLAG
                  </label>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider hidden sm:inline">
                    STOPS SQUAD CLOCK // SHA-256
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  Paste your squad's competition flag below. Submitting immediately halts your squad's timer and publishes your official solve duration to the live leaderboard.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-emerald-400 text-sm sm:text-base select-none font-black">
                    &gt;
                  </span>
                  <input
                    id="flagInput"
                    type="text"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    placeholder="FOSSCTF{loventia_...}"
                    disabled={submittingFlag || !team || !isLive}
                    className="w-full pl-8 pr-4 py-3 sm:py-3.5 border-2 border-zinc-600 hover:border-zinc-500 focus:border-emerald-400 bg-[#080d16] text-emerald-400 font-mono text-xs sm:text-sm font-bold placeholder-zinc-600 shadow-[2px_2px_0px_#000] focus:shadow-[0_0_12px_rgba(52,211,153,0.3)] focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingFlag || !flagInput.trim() || !team || !isLive}
                  className="px-8 py-3.5 border-2 border-black bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 shrink-0 select-none"
                >
                  <Send className="w-4 h-4 stroke-[3]" />
                  <span>{submittingFlag ? 'TRANSMITTING...' : 'TRANSMIT FLAG'}</span>
                </button>
              </div>

              {/* Submission Feedback Message */}
              {flagFeedback && (
                <div
                  className={`p-4 border-2 border-black font-mono text-xs sm:text-sm font-bold flex items-center gap-3 shadow-[4px_4px_0px_#000] ${
                    flagFeedback.type === 'success'
                      ? 'bg-emerald-400 text-black'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {flagFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-black shrink-0 stroke-[2.5]" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-white shrink-0 stroke-[2.5]" />
                  )}
                  <span>{flagFeedback.message}</span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Helpful Footnote / Link back to Loventia Challenge */}
        <div className="pt-6 border-t border-zinc-800 text-xs font-mono text-zinc-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Need target details? Review the challenge instructions and target link.</span>
          </div>
          <Link
            to="/challenges"
            className="text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1 shrink-0"
          >
            <span>Open Loventia Challenge</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default SubmitFlagPage;
