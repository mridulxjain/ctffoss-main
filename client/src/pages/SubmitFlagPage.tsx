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
  Shield,
  KeyRound,
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

  // Voucher-retrieved flag info
  const [voucherFlagAvailable, setVoucherFlagAvailable] = useState<string | null>(null);

  // Live elapsed timer
  const [elapsedString, setElapsedString] = useState<string>('00:00:00');
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    try {
      const [compData, attemptData, voucherStatusRaw] = await Promise.all([
        api.get<CompetitionConfigDTO>('/competition').catch(() => null),
        team ? api.get('/competition/attempt').catch(() => null) : Promise.resolve(null),
        team ? api.get<LoventiaVoucherStatusResponse>('/competition/loventia/voucher-status').catch(() => null) : Promise.resolve(null),
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
        (voucherStatusRaw as any)?.data !== undefined ? (voucherStatusRaw as any).data : voucherStatusRaw;

      if (voucherStatus?.redeemed && voucherStatus?.flag) {
        const vFlag = voucherStatus.flag;
        setVoucherFlagAvailable(vFlag);
        // Pre-fill if input is currently empty
        setFlagInput((current) => current || vFlag);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs font-mono font-bold">
        <Link
          to="/challenges"
          className="text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-1.5"
        >
          <span>← Back to Loventia Challenge</span>
        </Link>
        <span className="text-zinc-500 hidden sm:inline">DISPATCH_GATEWAY // PORT_1337</span>
      </div>

      {/* Main Flag Submission Console */}
      <section className="border-3 border-black bg-zinc-950 p-6 sm:p-8 shadow-[6px_6px_0px_#000] space-y-6 relative overflow-hidden">
        {/* Funky Corner Tape Sticker */}
        <div className="absolute right-3 top-3 hidden sm:block">
          <div className="sticker-tape-right bg-[#bae6fd] text-zinc-950 font-black text-[10px] uppercase tracking-wider">
            // SECURE UPLINK
          </div>
        </div>

        {/* Console Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-black inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-black inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black inline-block" />
              <span className="ml-1 text-xs font-mono font-black text-emerald-400 uppercase tracking-widest">
                [FLAG_SUBMISSION_PORTAL] // /submit
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-mono text-zinc-100 uppercase tracking-tight flex items-center gap-2">
              <Terminal className="w-6 h-6 text-emerald-400 stroke-[2.5]" />
              <span>DISPATCH CAPTURE TOKEN</span>
            </h1>
          </div>

          {/* Squad & Timer Badges */}
          <div className="flex items-center flex-wrap gap-2.5 font-mono">
            {team && (
              <div className="px-3 py-1.5 bg-zinc-900 border-2 border-black shadow-[2px_2px_0px_#000] text-zinc-300 text-xs font-black uppercase flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-pink-400" />
                <span>{team.name}</span>
              </div>
            )}
            <div className="px-3 py-1.5 bg-black border-2 border-black shadow-[2px_2px_0px_#000] text-emerald-400 text-xs font-black flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{elapsedString}</span>
            </div>
          </div>
        </div>

        {/* Team Requirement Warning */}
        {!team && (
          <div className="p-4 border-2 border-black bg-rose-500/20 border-rose-500 text-rose-200 font-mono text-xs font-bold flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 stroke-[2.5]" />
              <span>You must be assigned to an official team to transmit flags and record solves.</span>
            </div>
            <Link
              to="/team"
              className="px-3 py-1 bg-rose-500 hover:bg-rose-400 text-black font-black uppercase text-xs border border-black shadow-[2px_2px_0px_#000] transition-all"
            >
              Go to Squad
            </Link>
          </div>
        )}

        {/* Solved Victory Banner */}
        {isSolved ? (
          <div className="p-6 sm:p-7 border-3 border-black bg-emerald-400 text-black shadow-[5px_5px_0px_#000] font-mono space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5 font-black text-base sm:text-lg uppercase">
                <Trophy className="w-6 h-6 text-black stroke-[2.5]" />
                <span>LOVENTIA FLAG CONQUERED &amp; VERIFIED</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/competition/leaderboard"
                  className="px-4 py-2 bg-black text-emerald-400 hover:text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-all"
                >
                  <span>View Leaderboard</span>
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
              <strong className="underline">{elapsedString}</strong> and permanently recorded on the synchronized competition leaderboard!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitFlag} className="space-y-5 font-mono">
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-mono">
              Paste your squad's minted competition flag below. Submitting will immediately halt your squad's attempt timer and publish your solve duration to the live leaderboard.
            </p>

            {/* Voucher Flag Found Callout */}
            {voucherFlagAvailable && (
              <div className="p-3 bg-zinc-900 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Your team's redeemed Loventia flag is loaded:</span>
                  <span className="font-black text-emerald-200 select-all">{voucherFlagAvailable}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFlagInput(voucherFlagAvailable)}
                  className="px-2.5 py-1 bg-emerald-400 text-black font-black text-[10px] uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000] hover:bg-emerald-300"
                >
                  Use Flag
                </button>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="flagInput"
                  className="text-xs font-mono text-zinc-200 font-black uppercase tracking-wider block"
                >
                  SUBMIT SECRET FLAG
                </label>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  CASE-SENSITIVE // SHA-256
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-emerald-400 text-sm select-none font-black">
                    &gt;
                  </span>
                  <input
                    id="flagInput"
                    type="text"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    placeholder="FOSSCTF{loventia_...}"
                    disabled={submittingFlag || !team || !isLive}
                    className="w-full pl-8 pr-4 py-3 border-2 border-zinc-600 hover:border-zinc-500 focus:border-emerald-400 bg-[#080d16] text-emerald-400 font-mono text-xs sm:text-sm font-bold placeholder-zinc-600 shadow-[2px_2px_0px_#000] focus:shadow-[0_0_12px_rgba(52,211,153,0.3)] focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingFlag || !flagInput.trim() || !team || !isLive}
                  className="px-7 py-3 border-2 border-black bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider shadow-[4px_4px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 select-none"
                >
                  <Send className="w-4 h-4 stroke-[3]" />
                  <span>{submittingFlag ? 'TRANSMITTING...' : 'TRANSMIT FLAG'}</span>
                </button>
              </div>
            </div>

            {/* Submission Feedback Message */}
            {flagFeedback && (
              <div
                className={`p-4 border-2 border-black font-mono text-xs font-bold flex items-center gap-2.5 shadow-[3px_3px_0px_#000] ${
                  flagFeedback.type === 'success'
                    ? 'bg-emerald-400 text-black'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {flagFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-black shrink-0 stroke-[2.5]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
                )}
                <span>{flagFeedback.message}</span>
              </div>
            )}
          </form>
        )}

        {/* Helpful Footnote / Link back to Loventia Voucher */}
        <div className="pt-4 border-t border-zinc-800 text-xs font-mono text-zinc-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Don't have a flag yet? Discover credentials on the target and redeem your voucher.</span>
          </div>
          <Link
            to="/challenges"
            className="text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1 shrink-0"
          >
            <span>Open Loventia Challenge</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default SubmitFlagPage;
