import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import type {
  ChallengeListItemDTO,
  CompetitionConfigDTO,
  CompetitionReadinessSummaryDTO,
  CompetitionAttemptDTO,
} from '@fossctf/shared';
import { useAuth } from '../context/AuthContext';
import {
  ExternalLink,
  Copy,
  Zap,
  CheckCircle2,
  Clock,
  Timer,
  AlertTriangle,
  Check,
  Terminal,
  Send,
  Lock,
} from 'lucide-react';

export const ChallengesPage: React.FC = () => {
  const { team, user, refreshSession } = useAuth();
  const [competition, setCompetition] = useState<CompetitionConfigDTO | null>(null);
  const [readiness, setReadiness] = useState<CompetitionReadinessSummaryDTO | null>(null);
  const [compAttempt, setCompAttempt] = useState<CompetitionAttemptDTO | null>(null);
  const [loventiaChallenge, setLoventiaChallenge] = useState<ChallengeListItemDTO | null>(null);
  const [loading, setLoading] = useState(true);

  // Flag submission states
  const [flagInput, setFlagInput] = useState('');
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [flagFeedback, setFlagFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Readiness toggle state
  const [togglingReadiness, setTogglingReadiness] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Live timer for elapsed competition/attempt duration
  const [elapsedString, setElapsedString] = useState<string>('00:00:00');
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const targetUrl = 'https://ctffoss.vercel.app';

  const fetchData = async () => {
    try {
      const [chalData, compData, readinessData, attemptData] = await Promise.all([
        api.get('/challenges').catch(() => ({ challenges: [] })),
        api.get('/competition').catch(() => null),
        api.get('/competition/readiness').catch(() => null),
        team ? api.get('/competition/attempt').catch(() => null) : Promise.resolve(null),
      ]);

      const chals: ChallengeListItemDTO[] = chalData?.challenges || [];
      // STRICT FILTER: Loventia ONLY! No other challenges allowed!
      const loventia = chals.find(
        (c) => c.isCompetitionChallenge || c.slug === 'valenfind' || c.title.toLowerCase().includes('loventia')
      ) || chals[0] || null;

      setLoventiaChallenge(loventia);
      setCompetition(compData);
      setReadiness(readinessData);
      setCompAttempt(attemptData);
    } catch (err) {
      console.error('Failed to load Loventia Arena data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, [team?.id]);

  // Synchronized timer display
  useEffect(() => {
    if (competition?.state === 'LIVE' && competition.startTime) {
      const startMs = new Date(competition.startTime).getTime();
      const updateTimer = () => {
        const diffMs = Math.max(0, Date.now() - startMs);
        const totalSecs = Math.floor(diffMs / 1000);
        const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
        const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
        const secs = (totalSecs % 60).toString().padStart(2, '0');
        setElapsedString(`${hrs}:${mins}:${secs}`);
      };
      updateTimer();
      elapsedTimerRef.current = setInterval(updateTimer, 1000);
      return () => {
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      };
    } else {
      setElapsedString('00:00:00');
    }
  }, [competition?.state, competition?.startTime]);

  const handleCopyUrl = async () => {
    if (!canLaunchTarget) return;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleToggleReadiness = async (nextReady: boolean) => {
    if (!team) return;
    try {
      setTogglingReadiness(true);
      await api.post('/competition/readiness', { isReady: nextReady });
      const updated = await api.get('/competition/readiness');
      setReadiness(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update squad readiness.');
    } finally {
      setTogglingReadiness(false);
    }
  };

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagInput.trim()) return;

    if (!team) {
      setFlagFeedback({
        type: 'error',
        message: 'You must belong to a team in the FOSS Club identity system to submit flags.',
      });
      return;
    }

    setSubmittingFlag(true);
    setFlagFeedback(null);

    try {
      // Submit directly to authoritative competition verifier
      const res = await api.post('/competition/attempt/submit', { flag: flagInput.trim() });
      setFlagFeedback({
        type: 'success',
        message: res.message || '★ FLAG VERIFIED! YOUR SQUAD HAS COMPLETED THE CHALLENGE.',
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
      setSubmittingFlag(false);
    }
  };

  const isPreparing = competition?.state === 'PREPARING';
  const isLive = competition?.state === 'LIVE';
  const isAdmin = user?.role === 'ADMIN';
  const isSolved = Boolean(loventiaChallenge?.isSolvedByTeam || compAttempt?.status === 'COMPLETED');

  // Can participant launch target? Only when LIVE or Admin preview
  const canLaunchTarget = isLive || isAdmin;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Cyber Navigation Tracker & Stickers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-zinc-800 pb-4">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase tracking-widest">
          <span className="text-emerald-400 font-bold">&gt;_ UFC_ARENA</span>
          <span className="text-zinc-600">//</span>
          <span>§ 01 &middot; THE TARGET</span>
          <span className="text-zinc-600">//</span>
          <span className="text-emerald-400 font-bold">LOVENTIA</span>
        </div>

        {/* Funky stickers (fossclub.tech style) - NO points */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="sticker-tape bg-amber-400 text-black border border-black shadow-[2px_2px_0px_#000]">
            // TODO: TOUCH GRASS
          </div>
          <div className="sticker-tape-right bg-emerald-400 text-black border border-black shadow-[2px_2px_0px_#000]">
            TIMED SPEED RUN
          </div>
          <div className="sticker-tape bg-rose-500 text-white border border-black shadow-[2px_2px_0px_#000]">
            BREAK CODE // CAPTURE FLAG
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-zinc-100 uppercase">
            OPERATION: <span className="text-emerald-400">LOVENTIA</span>
          </h1>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 bg-zinc-900 border-2 border-zinc-700 text-zinc-300 font-bold">
              TIMED CHALLENGE
            </span>
            <span className="px-2.5 py-1 bg-emerald-950/80 border-2 border-emerald-500 text-emerald-400 font-bold">
              WEB EXPLOITATION
            </span>
          </div>
        </div>

        <p className="text-sm font-mono text-zinc-400 max-w-3xl leading-relaxed">
          USAR FOSS Club Official CTF Challenge. Reverse the client-side voucher validation algorithm, 
          forge an unauthorized high-value VIP discount token, and checkout the secret administrator flag.
        </p>
      </div>

      {/* MAIN TARGET COMMAND CENTER */}
      <section className="tech-corner-box border-2 border-emerald-500 bg-zinc-950 p-6 sm:p-8 shadow-[6px_6px_0px_#10b981] space-y-6">
        {/* Top Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                § 01 &middot; LIVE TARGET APPLICATION
              </span>
              {isAdmin && isPreparing && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                  ADMIN PREVIEW ACTIVE
                </span>
              )}
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-zinc-100 flex items-center gap-2">
              <span>Host:</span>
              {canLaunchTarget ? (
                <span className="text-emerald-400 font-mono transition-all duration-700">ctffoss.vercel.app</span>
              ) : (
                <span className="font-mono text-amber-400/90 text-xs px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/80 font-bold">
                  [REDACTED // LOCKED]
                </span>
              )}
            </div>
          </div>

          {/* Live Timer or State Badge */}
          <div className="flex items-center gap-3">
            {isLive ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/60 border-2 border-emerald-600 text-emerald-300 font-mono text-xs font-bold shadow-[2px_2px_0px_#000]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>ROUND LIVE: {elapsedString}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/60 border-2 border-amber-600 text-amber-300 font-mono text-xs font-bold shadow-[2px_2px_0px_#000]">
                <Clock className="w-3.5 h-3.5" />
                <span>PREPARATION PHASE</span>
              </div>
            )}
          </div>
        </div>

        {/* Target Action Strip with REAL CSS BLUR & Smooth Reveal Animation */}
        <div className="p-4 sm:p-5 bg-zinc-900 border-2 border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-mono uppercase text-zinc-500 block">
              Direct Target Endpoint:
            </span>
            <div className="relative overflow-hidden rounded bg-black/60 p-2.5 sm:p-3 border border-zinc-800">
              {/* Actual CSS blur & smooth opacity transition */}
              <div
                className={`font-mono text-sm sm:text-base font-bold transition-all duration-700 ease-out select-none ${
                  canLaunchTarget
                    ? 'filter-none blur-0 opacity-100 text-emerald-300'
                    : 'filter blur-[9px] opacity-20 text-zinc-600 pointer-events-none'
                }`}
              >
                {canLaunchTarget ? targetUrl : 'https://ctffoss.vercel.app/classified-target-endpoint-locked'}
              </div>

              {/* Redaction overlay when locked */}
              {!canLaunchTarget && (
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold uppercase tracking-wider text-amber-400 bg-black/40 backdrop-blur-[1.5px] select-none">
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-amber-400 shrink-0" />
                  <span>[TARGET LINK REDACTED &middot; LOCKED UNTIL START]</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <button
              onClick={handleCopyUrl}
              disabled={!canLaunchTarget}
              className={`px-3.5 py-2.5 text-xs font-mono font-bold uppercase transition-all border-2 flex items-center gap-1.5 shadow-[2px_2px_0px_#000] ${
                canLaunchTarget
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                  : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed opacity-60'
              }`}
            >
              {canLaunchTarget ? (
                <>
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Locked</span>
                </>
              )}
            </button>

            {canLaunchTarget ? (
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 text-xs sm:text-sm font-mono font-black uppercase transition-all bg-emerald-500 hover:bg-emerald-400 text-black border-2 border-emerald-400 flex items-center gap-2 shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Launch Target Site ↗</span>
              </a>
            ) : (
              <button
                disabled
                className="px-5 py-3 text-xs sm:text-sm font-mono font-bold uppercase bg-zinc-900 text-zinc-500 border-2 border-zinc-800 cursor-not-allowed flex items-center gap-2 opacity-60"
                title="Target unlocks when the competition officially begins"
              >
                <Lock className="w-4 h-4 text-zinc-600" />
                <span>Target Locked (Staging)</span>
              </button>
            )}
          </div>
        </div>

        {/* Target instructions callout */}
        <p className="text-xs font-mono text-zinc-400">
          {canLaunchTarget
            ? '⚡ Target is active. Inspect network requests on the target to understand the voucher verification API and sign your customized voucher.'
            : '⏳ Competition is in preparation state. Mark your squad ready below. Once the administrator starts the round, the target link will immediately activate.'}
        </p>

        {/* SQUAD READINESS TOGGLE (When PREPARING) */}
        {isPreparing && (
          <div className="pt-4 border-t-2 border-zinc-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-950/20 border-2 border-amber-600/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-300">
                  <span>SQUAD READINESS CHECK</span>
                  <span className="text-zinc-500">&middot;</span>
                  <span className="text-zinc-300">
                    {readiness?.readyTeamsCount ?? 0} of {readiness?.totalEligibleTeams ?? 0} Squads Ready
                  </span>
                </div>
                <p className="text-xs font-mono text-zinc-400">
                  {readiness?.myTeamReadiness?.isReady
                    ? 'Your squad is marked READY. Waiting for admin launch signal.'
                    : 'Click below to confirm your squad is assembled and ready to attack.'}
                </p>
              </div>

              {team && (
                <button
                  onClick={() => handleToggleReadiness(!readiness?.myTeamReadiness?.isReady)}
                  disabled={togglingReadiness}
                  className={`px-4 py-2.5 text-xs font-mono font-bold uppercase transition-all border-2 shadow-[2px_2px_0px_#000] shrink-0 disabled:opacity-50 ${
                    readiness?.myTeamReadiness?.isReady
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400'
                  }`}
                >
                  {togglingReadiness ? (
                    'Updating...'
                  ) : readiness?.myTeamReadiness?.isReady ? (
                    'Cancel Readiness'
                  ) : (
                    'Mark Squad Ready ✓'
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* INTEL & RECON DIRECTIVES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Mission Brief */}
        <div className="tech-corner-box border-2 border-zinc-800 bg-zinc-950 p-5 shadow-[4px_4px_0px_#27272a] space-y-3">
          <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
            § 02 &middot; MISSION BRIEF
          </div>
          <h3 className="font-mono text-sm font-bold text-zinc-100 uppercase">
            Discount Voucher Forgery
          </h3>
          <p className="text-xs font-mono text-zinc-400 leading-relaxed">
            Loventia runs an automated voucher validation endpoint. A hidden VIP voucher unlocks 100% discount on order totals.
            Reverse the voucher verification algorithm to mint an unauthorized token.
          </p>
        </div>

        {/* Card 2: Squad Clearance */}
        <div className="tech-corner-box border-2 border-zinc-800 bg-zinc-950 p-5 shadow-[4px_4px_0px_#27272a] space-y-3">
          <div className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">
            § 03 &middot; SQUAD TELEMETRY
          </div>
          <h3 className="font-mono text-sm font-bold text-zinc-100 uppercase">
            {team ? team.name : 'Unassigned Operative'}
          </h3>
          <div className="space-y-1.5 text-xs font-mono text-zinc-400">
            <div>
              <span className="text-zinc-500">Ranking:</span>{' '}
              <strong className="text-emerald-400">PURE SPEED / TIME</strong>
            </div>
            <div>
              <span className="text-zinc-500">Solve Status:</span>{' '}
              {isSolved ? (
                <span className="text-emerald-400 font-bold">SOLVED ✓</span>
              ) : (
                <span className="text-amber-400">IN PROGRESS</span>
              )}
            </div>
            <div>
              <span className="text-zinc-500">Flag Pattern:</span>{' '}
              <span className="text-zinc-300 font-bold">FOSSCTF{'{...}'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Attack Playbook */}
        <div className="tech-corner-box border-2 border-zinc-800 bg-zinc-950 p-5 shadow-[4px_4px_0px_#27272a] space-y-3">
          <div className="text-[11px] font-mono font-bold text-purple-400 uppercase tracking-wider">
            § 04 &middot; ATTACK PLAYBOOK
          </div>
          <h3 className="font-mono text-sm font-bold text-zinc-100 uppercase">
            Execution Steps
          </h3>
          <ol className="text-xs font-mono text-zinc-400 space-y-1 list-decimal list-inside">
            <li>Access the target site once the competition starts</li>
            <li>Intercept the <code className="text-emerald-400">/api/vouchers</code> payload</li>
            <li>Forge the 100% discount VIP token</li>
            <li>Checkout secret admin item & retrieve flag</li>
          </ol>
        </div>
      </div>

      {/* INTEGRATED FLAG SUBMISSION TERMINAL (NO HINTS MENTION) */}
      <section className="tech-corner-box border-2 border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-[5px_5px_0px_#27272a] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                FLAG SUBMISSION TERMINAL
              </span>
            </div>
            <h2 className="text-lg font-bold font-mono text-zinc-100">
              Transmit Captured Token
            </h2>
          </div>
        </div>

        {/* Solved Victory Banner */}
        {isSolved ? (
          <div className="p-5 bg-emerald-950/40 border-2 border-emerald-500 font-mono text-xs space-y-2 shadow-[4px_4px_0px_#10b981]">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>★ LOVENTIA FLAG CAPTURED & VERIFIED</span>
            </div>
            <p className="text-zinc-300">
              Your squad has conquered the Loventia challenge. Your official solve duration has been verified and recorded on the live leaderboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitFlag} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">
                Command: <span className="text-emerald-400">./submit-flag --target loventia --flag</span>
              </label>
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-emerald-400 text-sm select-none font-bold">
                    &gt;
                  </span>
                  <input
                    type="text"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    placeholder="FOSSCTF{...}"
                    disabled={submittingFlag}
                    className="w-full pl-8 pr-4 py-3 bg-zinc-900 border-2 border-zinc-700 focus:border-emerald-500 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingFlag || !flagInput.trim()}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-black text-xs uppercase tracking-wider border-2 border-emerald-400 shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingFlag ? 'Transmitting...' : 'Transmit Flag ↵'}</span>
                </button>
              </div>
            </div>

            {/* Submission Feedback Message */}
            {flagFeedback && (
              <div
                className={`p-3.5 border-2 font-mono text-xs flex items-center gap-2.5 ${
                  flagFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-[3px_3px_0px_#10b981]'
                    : 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-[3px_3px_0px_#f43f5e]'
                }`}
              >
                {flagFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{flagFeedback.message}</span>
              </div>
            )}
          </form>
        )}
      </section>
    </div>
  );
};
