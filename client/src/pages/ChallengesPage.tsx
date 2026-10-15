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
  Check,
  Terminal,
  Send,
  Lock,
  AlertTriangle,
  FileText,
  Activity,
  Crosshair,
} from 'lucide-react';

export const ChallengesPage: React.FC = () => {
  const { team, user, refreshSession } = useAuth();
  const [competition, setCompetition] = useState<CompetitionConfigDTO | null>(null);
  const [readiness, setReadiness] = useState<CompetitionReadinessSummaryDTO | null>(null);
  const [compAttempt, setCompAttempt] = useState<CompetitionAttemptDTO | null>(null);
  const [loventiaChallenge, setLoventiaChallenge] = useState<ChallengeListItemDTO | null>(null);
  const [, setLoading] = useState(true);

  // Flag submission states
  const [flagInput, setFlagInput] = useState('');
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const submittingFlagRef = useRef(false);
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
      const loventia =
        chals.find(
          (c) =>
            c.isCompetitionChallenge ||
            c.slug === 'valenfind' ||
            c.title.toLowerCase().includes('loventia')
        ) ||
        chals[0] ||
        null;

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
    const interval = setInterval(fetchData, 20000);
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
        message: res.message || 'FLAG VERIFIED! YOUR SQUAD HAS COMPLETED THE CHALLENGE.',
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

  const isPreparing = competition?.state === 'PREPARING';
  const isLive = competition?.state === 'LIVE';
  const isAdmin = user?.role === 'ADMIN';
  const isSolved = Boolean(loventiaChallenge?.isSolvedByTeam || compAttempt?.status === 'COMPLETED');
  const canLaunchTarget = isLive || isAdmin;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Cyber Navigation Tracker & Smooth Cyber Tapes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase tracking-wider">
          <span className="text-emerald-400 font-semibold">&gt;_ UFC_ARENA</span>
          <span className="text-zinc-700">/</span>
          <span>Target Environment</span>
          <span className="text-zinc-700">/</span>
          <span className="text-emerald-400 font-semibold">Loventia</span>
        </div>

        {/* Smooth Cyber Tape Stickers (playful hacker theme without brutalist harshness) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="sticker-tape bg-amber-400 text-zinc-950 border border-amber-300/50">
            // TODO: TOUCH GRASS
          </div>
          <div className="sticker-tape-right bg-emerald-400 text-zinc-950 border border-emerald-300/50">
            TIMED SPEED RUN
          </div>
          <div className="sticker-tape bg-rose-500 text-white border border-rose-400/50">
            BREAK CODE // CAPTURE FLAG
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h1 className="text-2xl sm:text-4xl font-bold font-mono tracking-tight text-zinc-100 uppercase">
            Operation: <span className="text-emerald-400">Loventia</span>
          </h1>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300 font-medium">
              Timed Challenge
            </span>
            <span className="px-2.5 py-1 bg-emerald-950/40 border border-emerald-500/30 rounded-md text-emerald-400 font-medium">
              Web Exploitation
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm font-mono text-zinc-400 max-w-3xl leading-relaxed">
          USAR FOSS Club Official CTF Challenge. Reverse the client-side voucher validation algorithm,
          forge an unauthorized high-value VIP discount token, and check out the secret administrator flag.
        </p>
      </div>

      {/* MAIN TARGET COMMAND CENTER */}
      <section className="rounded-xl border border-emerald-500/30 bg-zinc-950/70 backdrop-blur-sm p-6 sm:p-8 shadow-sm space-y-6">
        {/* Top Status Bar with Corner Readiness Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
                Live Target Application
              </span>
              {isAdmin && isPreparing && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/60 font-medium">
                  Admin Preview Active
                </span>
              )}
            </div>
            <div className="text-sm sm:text-base font-semibold font-mono text-zinc-100 flex items-center gap-2">
              <span className="text-zinc-500">Host:</span>
              {canLaunchTarget ? (
                <span className="text-emerald-400 font-mono transition-colors">ctffoss.vercel.app</span>
              ) : (
                <span className="font-mono text-amber-400/90 text-xs px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-800/60 font-medium">
                  [Redacted // Locked]
                </span>
              )}
            </div>
          </div>

          {/* Right Corner: Live Round Status & Permanent Squad Readiness Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Live Timer or State Badge */}
            {isLive ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/40 rounded-md text-emerald-300 font-mono text-xs font-semibold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
                <span>Round Live: {elapsedString}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/40 border border-amber-500/40 rounded-md text-amber-300 font-mono text-xs font-semibold shadow-sm">
                <Clock className="w-3.5 h-3.5" />
                <span>Preparation Phase</span>
              </div>
            )}

            {/* Permanent Squad Readiness Button (Always in corner; disabled for admins, toggle for teams) */}
            {isAdmin ? (
              <button
                type="button"
                disabled
                className="px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono text-xs flex items-center gap-1.5 cursor-not-allowed opacity-80"
                title="Admin clearance: Readiness is managed by participant squads"
              >
                <Check className="w-3.5 h-3.5 text-zinc-600" />
                <span>Squads Ready: {readiness?.readyTeamsCount ?? 0}/{readiness?.totalEligibleTeams ?? 0}</span>
              </button>
            ) : team ? (
              <button
                type="button"
                onClick={() => handleToggleReadiness(!readiness?.myTeamReadiness?.isReady)}
                disabled={togglingReadiness}
                className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm ${
                  readiness?.myTeamReadiness?.isReady
                    ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-zinc-200'
                }`}
                title={
                  readiness?.myTeamReadiness?.isReady
                    ? 'Your squad is marked ready. Click to cancel.'
                    : 'Click to mark your squad assembled and ready to attack.'
                }
              >
                <Check
                  className={`w-3.5 h-3.5 ${
                    readiness?.myTeamReadiness?.isReady ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                />
                <span>
                  {togglingReadiness
                    ? 'Updating...'
                    : readiness?.myTeamReadiness?.isReady
                    ? 'Squad Ready'
                    : 'Mark Squad Ready'}
                </span>
                <span className="text-[11px] px-1 py-0.2 rounded bg-black/40 text-zinc-400 font-normal">
                  {readiness?.readyTeamsCount ?? 0}/{readiness?.totalEligibleTeams ?? 0}
                </span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono text-xs flex items-center gap-1.5 cursor-not-allowed opacity-80"
                title="Sign in with your squad account to toggle squad readiness"
              >
                <Clock className="w-3.5 h-3.5 text-zinc-600" />
                <span>Squads Ready: {readiness?.readyTeamsCount ?? 0}/{readiness?.totalEligibleTeams ?? 0}</span>
              </button>
            )}
          </div>
        </div>

        {/* Target Action Strip */}
        <div className="p-4 sm:p-5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-mono uppercase text-zinc-500 block">
              Direct Target Endpoint:
            </span>
            <div className="relative overflow-hidden rounded-md bg-black/60 p-2.5 sm:p-3 border border-zinc-800">
              <div
                className={`font-mono text-xs sm:text-sm font-semibold transition-all duration-500 select-none ${
                  canLaunchTarget
                    ? 'filter-none opacity-100 text-emerald-300'
                    : 'filter blur-[7px] opacity-25 text-zinc-600 pointer-events-none'
                }`}
              >
                {canLaunchTarget ? targetUrl : 'https://ctffoss.vercel.app/classified-target-endpoint-locked'}
              </div>

              {!canLaunchTarget && (
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold uppercase tracking-wider text-amber-400 bg-black/50 backdrop-blur-[1px] select-none">
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-amber-400 shrink-0" />
                  <span>Target Locked Until Start</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleCopyUrl}
              disabled={!canLaunchTarget}
              className={`px-3 py-2 text-xs font-mono font-medium rounded-md transition-colors border flex items-center gap-1.5 ${
                canLaunchTarget
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700 shadow-sm'
                  : 'bg-zinc-900 text-zinc-600 border-zinc-800/80 cursor-not-allowed opacity-60'
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
                className="px-4 py-2 text-xs sm:text-sm font-mono font-semibold uppercase rounded-md transition-colors bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 border border-emerald-400 flex items-center gap-2 shadow-sm"
              >
                <span>Launch Target Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="px-4 py-2 text-xs sm:text-sm font-mono font-medium uppercase rounded-md bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed flex items-center gap-2 opacity-60"
                title="Target unlocks when the competition officially begins"
              >
                <Lock className="w-3.5 h-3.5 text-zinc-600" />
                <span>Target Locked (Staging)</span>
              </button>
            )}
          </div>
        </div>

        {/* Target Instructions Callout */}
        <div className="flex items-start gap-2.5 text-xs font-mono text-zinc-400 p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/60">
          {canLaunchTarget ? (
            <>
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Target is active. Inspect network requests on the target to understand the voucher verification API and sign your customized voucher.
              </span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Competition is in preparation state. Mark your squad ready above. Once the administrator starts the round, the target link will immediately activate.
              </span>
            </>
          )}
        </div>
      </section>

      {/* INTEL & RECON DIRECTIVES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Mission Brief */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/60 p-5 space-y-3 transition-colors shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-emerald-400 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" />
            <span>Mission Brief</span>
          </div>
          <h2 className="font-mono text-sm font-semibold text-zinc-100 uppercase">
            Discount Voucher Forgery
          </h2>
          <p className="text-xs font-mono text-zinc-400 leading-relaxed">
            Loventia runs an automated voucher validation endpoint. A hidden VIP voucher unlocks 100% discount on order totals.
            Reverse the voucher verification algorithm to mint an unauthorized token.
          </p>
        </div>

        {/* Card 2: Squad Telemetry */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/60 p-5 space-y-3 transition-colors shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-amber-400 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            <span>Squad Telemetry</span>
          </div>
          <h2 className="font-mono text-sm font-semibold text-zinc-100 uppercase">
            {team ? team.name : 'Unassigned Operative'}
          </h2>
          <div className="space-y-1.5 text-xs font-mono text-zinc-400">
            <div>
              <span className="text-zinc-500">Ranking:</span>{' '}
              <strong className="text-emerald-400">Pure Speed / Time</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Solve Status:</span>{' '}
              {isSolved ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>SOLVED</span>
                </span>
              ) : (
                <span className="text-amber-400 font-medium">In Progress</span>
              )}
            </div>
            <div>
              <span className="text-zinc-500">Flag Pattern:</span>{' '}
              <span className="text-zinc-300 font-medium">FOSSCTF{'{...}'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Attack Playbook */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/60 p-5 space-y-3 transition-colors shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-purple-400 uppercase tracking-wider">
            <Crosshair className="w-3.5 h-3.5" />
            <span>Attack Playbook</span>
          </div>
          <h2 className="font-mono text-sm font-semibold text-zinc-100 uppercase">
            Execution Steps
          </h2>
          <ol className="text-xs font-mono text-zinc-400 space-y-1 list-decimal list-inside">
            <li>Access the target site once the competition starts</li>
            <li>Intercept the <code className="text-emerald-400">/api/vouchers</code> payload</li>
            <li>Forge the 100% discount VIP token</li>
            <li>Checkout secret admin item & retrieve flag</li>
          </ol>
        </div>
      </div>

      {/* FLAG SUBMISSION TERMINAL */}
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-sm p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
                Flag Submission Terminal
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-semibold font-mono text-zinc-100">
              Transmit Captured Token
            </h2>
          </div>
        </div>

        {/* Solved Victory Banner */}
        {isSolved ? (
          <div className="p-4 sm:p-5 rounded-lg bg-emerald-950/30 border border-emerald-500/40 font-mono text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>LOVENTIA FLAG CAPTURED & VERIFIED</span>
            </div>
            <p className="text-zinc-300">
              Your squad has conquered the Loventia challenge. Your official solve duration has been verified and recorded on the live leaderboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitFlag} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="flagInput" className="text-xs font-mono text-zinc-300 font-semibold uppercase tracking-wider block">
                Flag Token Submission
              </label>
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-emerald-400 text-sm select-none font-semibold">
                    &gt;
                  </span>
                  <input
                    id="flagInput"
                    type="text"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    placeholder="FOSSCTF{...}"
                    disabled={submittingFlag}
                    className="w-full pl-7 pr-3 py-2.5 rounded-md bg-zinc-900 border border-zinc-800 focus:border-emerald-500 font-mono text-xs sm:text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingFlag || !flagInput.trim()}
                  className="px-5 py-2.5 rounded-md bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-mono font-semibold text-xs uppercase tracking-wider border border-emerald-400 shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingFlag ? 'Transmitting...' : 'Transmit Flag'}</span>
                </button>
              </div>
            </div>

            {/* Submission Feedback Message */}
            {flagFeedback && (
              <div
                className={`p-3 rounded-lg border font-mono text-xs flex items-center gap-2.5 ${
                  flagFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
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
