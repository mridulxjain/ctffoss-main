import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  Trophy,
  ArrowRight,
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
  const [readinessError, setReadinessError] = useState<string | null>(null);
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
    setReadinessError(null);
    try {
      setTogglingReadiness(true);
      await api.post('/competition/readiness', { isReady: nextReady });
      const updated = await api.get('/competition/readiness');
      setReadiness(updated);
    } catch (err: any) {
      setReadinessError(err.message || 'Failed to update squad readiness.');
      setTimeout(() => setReadinessError(null), 5000);
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
        message: res.message || 'FLAG VERIFIED! YOUR SQUAD HAS CONQUERED THE ARENA.',
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

  const isLive = competition?.state === 'LIVE';
  const isAdmin =
    user?.role?.toLowerCase() === 'admin' ||
    user?.clubRole?.toLowerCase() === 'admin' ||
    user?.username?.toLowerCase() === 'mridulxjain';
  const isSolved = Boolean(loventiaChallenge?.isSolvedByTeam || compAttempt?.status === 'COMPLETED');

  // CRITICAL: Target link is NEVER visible / launchable until the challenge has officially started (isLive)
  const canLaunchTarget = isLive;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-7">
      {/* Top Cyber Navigation Tracker & Restored Classic Cyber Stickers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase tracking-wider">
          <span className="text-emerald-400 font-bold">&gt;_ UFC_ARENA</span>
          <span className="text-zinc-700">/</span>
          <span>Target Environment</span>
          <span className="text-zinc-700">/</span>
          <span className="text-emerald-400 font-bold">Loventia</span>
        </div>

        {/* Playful Stickers (Pastel Soft Colors with Serrated Wrapper Cut Edges) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="sticker-tape bg-[#fef08a] text-zinc-950">
            // TODO: TOUCH GRASS
          </div>
          <div className="sticker-tape-right bg-[#a7f3d0] text-zinc-950">
            TIMED SPEED RUN
          </div>
          <div className="sticker-tape bg-[#fbcfe8] text-zinc-950">
            BREAK CODE // CAPTURE FLAG
          </div>
        </div>
      </div>

      {/* Hero Header with Neobrutal Category Badges & Red-and-White Funky Title */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-4xl font-black font-mono uppercase tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-white drop-shadow-[2px_2px_0px_#000]">OPERATION:</span>
              <span className="px-3.5 py-1 bg-red-600 text-white font-mono font-black border-2 border-black shadow-[3px_3px_0px_#000] tracking-wider -rotate-1 inline-block">
                LOVENTIA
              </span>
            </h1>
          </div>

          {/* Badges for "Timed Challenge" and "Web Exploitation": dashed border with dots on each border and high contrast */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="relative px-3.5 py-1.5 bg-[#fefce8] text-black border-2 border-dashed border-black font-black uppercase shadow-[2px_2px_0px_#000] tracking-wide inline-flex items-center justify-center select-none">
              {/* Dots on corners */}
              <span className="absolute -top-1 -left-1 w-2 h-2 bg-black rounded-full" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-black rounded-full" />
              <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-black rounded-full" />
              <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-black rounded-full" />
              {/* Dots on each border */}
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span>difficulty: easy</span>
            </div>

            <div className="relative px-3.5 py-1.5 bg-[#fefce8] text-black border-2 border-dashed border-black font-black uppercase shadow-[2px_2px_0px_#000] tracking-wide inline-flex items-center justify-center select-none">
              {/* Dots on corners */}
              <span className="absolute -top-1 -left-1 w-2 h-2 bg-black rounded-full" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-black rounded-full" />
              <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-black rounded-full" />
              <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-black rounded-full" />
              {/* Dots on each border */}
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 bg-black rounded-full" />
              <span>Web Exploitation</span>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm font-mono text-zinc-400 max-w-3xl leading-relaxed">
          <strong className="text-zinc-200">USAR FOSS CLUB, GGSIPU</strong> Official CTF Challenge. Reverse the client-side voucher validation algorithm,
          forge an unauthorized high-value VIP discount token, and check out the secret administrator flag.
        </p>
      </div>

      {/* Readiness error message if any */}
      {readinessError && (
        <div className="p-3 border-2 border-black bg-rose-500 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-[3px_3px_0px_#000]">
          <AlertTriangle className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
          <span>{readinessError}</span>
        </div>
      )}

      {/* MAIN TARGET COMMAND CENTER */}
      <section className="border-2 border-black bg-zinc-950 p-6 sm:p-7 shadow-[4px_4px_0px_#000] space-y-6">
        {/* Top Status Bar with Neobrutal Status & Squad Readiness Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black text-emerald-400 uppercase tracking-wider">
                Live Target Application
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-zinc-100 flex items-center gap-2">
              <span className="text-zinc-500 font-medium">Host:</span>
              <span className="text-zinc-100 font-black tracking-wide">USAR FOSS CLUB, GGSIPU</span>
            </div>
          </div>

          {/* Right Corner: Permanent Side-by-Side Status & Squad Readiness Controls (Zero Shift on Click) */}
          <div className="flex items-center gap-3 shrink-0 flex-nowrap self-start sm:self-auto">
            {/* Neobrutal Preparation Phase / Round Live Indicator */}
            {isLive ? (
              <div className="h-10 px-3.5 bg-emerald-400 text-black border-2 border-black font-mono text-xs font-black uppercase shadow-[3px_3px_0px_#000] inline-flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                <span>Round Live: {elapsedString}</span>
              </div>
            ) : (
              <div className="h-10 px-3.5 bg-amber-400 text-black border-2 border-black font-mono text-xs font-black uppercase shadow-[3px_3px_0px_#000] inline-flex items-center gap-2 shrink-0 whitespace-nowrap">
                <Clock className="w-4 h-4 text-black stroke-[2.5]" />
                <span>Preparation Phase</span>
              </div>
            )}

            {/* Neobrutal Squad Readiness Button (Locked Width & Height to Prevent Shifting) */}
            {isAdmin ? (
              <div
                className="h-10 px-3.5 bg-zinc-900 text-zinc-300 border-2 border-black font-mono text-xs font-bold uppercase shadow-[2px_2px_0px_#000] inline-flex items-center gap-2 shrink-0 whitespace-nowrap"
                title="Admin clearance: Squad readiness managed by participant squads"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                <span>Squads Ready:</span>
                <span className="px-1.5 py-0.5 bg-black text-emerald-400 font-black border border-black text-[11px]">
                  {readiness?.readyTeamsCount ?? 0}/{readiness?.totalEligibleTeams ?? 0}
                </span>
              </div>
            ) : team ? (
              <button
                type="button"
                onClick={() => handleToggleReadiness(!readiness?.myTeamReadiness?.isReady)}
                disabled={togglingReadiness}
                className={`h-10 px-4 min-w-[215px] border-2 border-black font-mono text-xs font-black uppercase tracking-wider transition-colors shadow-[3px_3px_0px_#000] inline-flex items-center justify-between gap-2 shrink-0 whitespace-nowrap select-none ${
                  readiness?.myTeamReadiness?.isReady
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-black'
                    : 'bg-amber-400 hover:bg-amber-300 text-black'
                }`}
                title={
                  readiness?.myTeamReadiness?.isReady
                    ? 'Your squad is marked ready. Click to cancel.'
                    : 'Click to mark your squad assembled and ready to attack.'
                }
              >
                <div className="flex items-center gap-2">
                  <Check
                    className={`w-4 h-4 ${
                      readiness?.myTeamReadiness?.isReady ? 'text-black stroke-[3]' : 'text-black stroke-[2]'
                    }`}
                  />
                  <span>
                    {togglingReadiness
                      ? 'SYNCING...'
                      : readiness?.myTeamReadiness?.isReady
                      ? 'SQUAD READY'
                      : 'MARK SQUAD READY'}
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-black text-white font-black border border-black shrink-0">
                  {readiness?.readyTeamsCount ?? 0}/{readiness?.totalEligibleTeams ?? 0}
                </span>
              </button>
            ) : (
              <div
                className="h-10 px-3.5 bg-zinc-900 text-zinc-500 border-2 border-black font-mono text-xs font-bold uppercase shadow-[2px_2px_0px_#000] inline-flex items-center gap-2 shrink-0 whitespace-nowrap"
                title="Sign in with your squad account to toggle readiness"
              >
                <Clock className="w-3.5 h-3.5 text-zinc-600" />
                <span>Squads Ready: {readiness?.readyTeamsCount ?? 0}/{readiness?.totalEligibleTeams ?? 0}</span>
              </div>
            )}
          </div>
        </div>

        {/* Target Action Strip */}
        <div className="p-4 sm:p-5 bg-zinc-900 border-2 border-black shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
              Direct Target Endpoint:
            </span>
            <div className="relative overflow-hidden bg-black p-2.5 sm:p-3 border-2 border-black shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8)]">
              <div
                className={`font-mono text-xs sm:text-sm font-bold transition-all duration-300 select-none ${
                  canLaunchTarget
                    ? 'filter-none opacity-100 text-emerald-300'
                    : 'filter blur-[7px] opacity-25 text-zinc-600 pointer-events-none'
                }`}
              >
                {canLaunchTarget ? targetUrl : 'https://ctffoss.vercel.app/classified-target-endpoint-locked'}
              </div>

              {!canLaunchTarget && (
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-black uppercase tracking-wider text-amber-400 bg-black/60 backdrop-blur-[1px] select-none">
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-amber-400 shrink-0" />
                  <span>Target Locked Until Round Start</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleCopyUrl}
              disabled={!canLaunchTarget}
              className={`px-3.5 py-2 text-xs font-mono font-bold uppercase border-2 border-black shadow-[2px_2px_0px_#000] transition-all flex items-center gap-1.5 ${
                canLaunchTarget
                  ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-100 active:translate-x-0.5 active:translate-y-0.5'
                  : 'bg-zinc-900 text-zinc-600 cursor-not-allowed opacity-60'
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
                className="px-5 py-2 text-xs sm:text-sm font-mono font-black uppercase bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-2 transition-all"
              >
                <span>Launch Target Site</span>
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="px-4 py-2 text-xs sm:text-sm font-mono font-bold uppercase bg-zinc-850 text-zinc-500 border-2 border-black shadow-[2px_2px_0px_#000] cursor-not-allowed flex items-center gap-2 opacity-60"
                title="Target unlocks automatically when the competition officially begins"
              >
                <Lock className="w-3.5 h-3.5 text-zinc-600" />
                <span>Target Locked (Staging)</span>
              </button>
            )}
          </div>
        </div>

        {/* Target Instructions Callout */}
        <div className="flex items-start gap-2.5 text-xs font-mono text-zinc-300 p-3.5 bg-zinc-900 border-2 border-black shadow-[2px_2px_0px_#000]">
          {canLaunchTarget ? (
            <>
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 fill-emerald-400" />
              <span>
                <strong className="text-emerald-400 uppercase font-black mr-1.5">[TARGET ACTIVE]:</strong>
                Inspect network requests on the target to understand the voucher verification API and sign your customized voucher.
              </span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-amber-400 uppercase font-black mr-1.5">[PREPARATION]:</strong>
                Competition is in staging state. Mark your squad ready above. Once the administrator starts the round, the target link will immediately activate.
              </span>
            </>
          )}
        </div>
      </section>

      {/* INTEL & RECON DIRECTIVES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Mission Brief */}
        <div className="border-2 border-black bg-zinc-950 p-5 space-y-3 shadow-[3px_3px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-black text-emerald-400 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" />
            <span>Mission Brief</span>
          </div>
          <h2 className="font-mono text-sm font-black text-zinc-100 uppercase">
            Discount Voucher Forgery
          </h2>
          <p className="text-xs font-mono text-zinc-400 leading-relaxed">
            Loventia runs an automated voucher validation endpoint. A hidden VIP voucher unlocks 100% discount on order totals.
            Reverse the voucher verification algorithm to mint an unauthorized token.
          </p>
        </div>

        {/* Card 2: Squad Telemetry */}
        <div className="border-2 border-black bg-zinc-950 p-5 space-y-3 shadow-[3px_3px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-black text-amber-400 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            <span>Squad Telemetry</span>
          </div>
          <h2 className="font-mono text-sm font-black text-zinc-100 uppercase truncate">
            {team ? team.name : 'Unassigned Operative'}
          </h2>
          <div className="space-y-1.5 text-xs font-mono text-zinc-400">
            <div>
              <span className="text-zinc-500 font-bold">Ranking:</span>{' '}
              <strong className="text-emerald-400">Pure Speed / Time</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-bold">Solve Status:</span>{' '}
              {isSolved ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-black">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>SOLVED</span>
                </span>
              ) : (
                <span className="text-amber-400 font-bold">In Progress</span>
              )}
            </div>
            <div>
              <span className="text-zinc-500 font-bold">Flag Pattern:</span>{' '}
              <span className="text-zinc-300 font-bold">FOSSCTF{'{...}'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Attack Playbook */}
        <div className="border-2 border-black bg-zinc-950 p-5 space-y-3 shadow-[3px_3px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-black text-cyan-400 uppercase tracking-wider">
            <Crosshair className="w-3.5 h-3.5" />
            <span>Attack Playbook</span>
          </div>
          <h2 className="font-mono text-sm font-black text-zinc-100 uppercase">
            Execution Steps
          </h2>
          <ol className="text-xs font-mono text-zinc-400 space-y-1 list-decimal list-inside">
            <li>Access the target site once the competition starts</li>
            <li>Intercept the <code className="text-emerald-400 font-bold">/api/vouchers</code> payload</li>
            <li>Forge the 100% discount VIP token</li>
            <li>Checkout secret admin item & retrieve flag</li>
          </ol>
        </div>
      </div>

      {/* UNIQUE, NEOBRUTAL, FUNKY FLAG SUBMISSION CONSOLE */}
      <section className="border-3 border-black bg-zinc-950 p-6 sm:p-7 shadow-[6px_6px_0px_#000] space-y-5 relative overflow-hidden">
        {/* Funky Corner Tape Sticker (Pastel Ocean Blue with Wrapper Cut) */}
        <div className="absolute right-3 top-3 hidden sm:block">
          <div className="sticker-tape-right bg-[#bae6fd] text-zinc-950 font-black text-[10px] uppercase tracking-wider">
            // HACK THE PLANET
          </div>
        </div>

        {/* Console Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-black inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-black inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black inline-block" />
              <span className="ml-1 text-xs font-mono font-black text-emerald-400 uppercase tracking-widest">
                [TRANSMIT_PAYLOAD_CONSOLE] // PORT_1337
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black font-mono text-zinc-100 uppercase tracking-tight flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
              <span>DISPATCH CAPTURE TOKEN</span>
            </h2>
          </div>
        </div>

        {/* Solved Victory Banner */}
        {isSolved ? (
          <div className="p-5 sm:p-6 border-3 border-black bg-emerald-400 text-black shadow-[5px_5px_0px_#000] font-mono space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base uppercase">
                <Trophy className="w-5 h-5 text-black stroke-[2.5]" />
                <span>LOVENTIA FLAG CONQUERED & VERIFIED</span>
              </div>
              <Link
                to="/competition/leaderboard"
                className="px-3.5 py-1.5 bg-black text-emerald-400 hover:text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-all"
              >
                <span>View Leaderboard</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-zinc-950 font-semibold leading-relaxed">
              Your squad has officially captured the Loventia flag. Your solve timestamp and duration are recorded on the synchronized scoreboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitFlag} className="space-y-4 font-mono">
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
                    placeholder="FOSSCTF{...}"
                    disabled={submittingFlag}
                    className="w-full pl-8 pr-4 py-3 border-2 border-zinc-600 hover:border-zinc-500 focus:border-emerald-400 bg-[#080d16] text-emerald-400 font-mono text-xs sm:text-sm font-bold placeholder-zinc-600 shadow-[2px_2px_0px_#000] focus:shadow-[0_0_12px_rgba(52,211,153,0.3)] focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingFlag || !flagInput.trim()}
                  className="px-6 py-3 border-2 border-black bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider shadow-[4px_4px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  <Send className="w-4 h-4 stroke-[3]" />
                  <span>{submittingFlag ? 'TRANSMITTING...' : 'TRANSMIT FLAG'}</span>
                </button>
              </div>
            </div>

            {/* Submission Feedback Message */}
            {flagFeedback && (
              <div
                className={`p-3.5 border-2 border-black font-mono text-xs font-bold flex items-center gap-2.5 shadow-[3px_3px_0px_#000] ${
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
      </section>
    </div>
  );
};
