import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  ArrowRight,
  AudioLines,
  Camera,
  Check,
  ChevronDown,
  CircleHelp,
  Disc3,
  FileVideo,
  Film,
  FolderOpen,
  Gauge,
  Grid2X2,
  Headphones,
  Info,
  LibraryBig,
  LoaderCircle,
  Menu,
  Mic2,
  Music2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Search,
  Sparkles,
  Upload,
  Video,
  X,
  Youtube,
} from 'lucide-react';
import {
  getHealthCheckQueryKey,
  getListHookStepsQueryKey,
  getSearchYouTubeQueryKey,
  useHealthCheck,
  useListHookSteps,
  useSearchYouTube,
} from '@workspace/api-client-react';
import type { HookStep, YouTubeVideo } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  analyzePoseVideo,
  rankHookSteps,
  type MotionSignature,
} from '@/lib/pose-analysis';

const queryClient = new QueryClient();

const fallbackSteps: HookStep[] = [
  {
    id: 'fallback-bounce',
    name: 'The Bounce & Rock',
    song: 'Work It',
    artist: 'Missy Elliott',
    movieOrAlbum: 'Under Construction',
    tags: ['bounce', 'hip-hop', 'groove'],
    description: 'A low-center groove with a sharp shoulder accent and a relaxed reset.',
    popularity: 94,
    sampleThumbnail: '',
  },
  {
    id: 'fallback-arm-wave',
    name: 'The Arm Wave',
    song: 'Say So',
    artist: 'Doja Cat',
    movieOrAlbum: 'Hot Pink',
    tags: ['waacking', 'pop', 'arms'],
    description: 'A fluid arm pathway that travels across the body before the reveal.',
    popularity: 88,
    sampleThumbnail: '',
  },
  {
    id: 'fallback-footwork',
    name: 'The Heel-Toe Switch',
    song: 'Crank That',
    artist: 'Soulja Boy',
    movieOrAlbum: 'Souljaboytellem.com',
    tags: ['footwork', 'viral', 'party'],
    description: 'A quick heel-toe pattern with a lateral weight shift and point.',
    popularity: 86,
    sampleThumbnail: '',
  },
];

const stageLabels = ['Motion map', 'Tempo scan', 'Hook match', 'Sound search'];

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { data: health, isError: healthError } = useHealthCheck({
    query: { queryKey: getHealthCheckQueryKey(), staleTime: 30_000 },
  });

  return (
    <div className="grain min-h-[100dvh] bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md lg:hidden">
        <Link href="/" data-testid="link-mobile-logo" className="flex items-center gap-2.5">
          <Mark />
          <span className="font-semibold tracking-tight">hookstep<span className="text-primary">.ai</span></span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="focus-ring rounded-lg p-2 hover:bg-muted"
          data-testid="button-toggle-mobile-nav"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-[250px] -translate-x-full flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground transition-transform duration-300 lg:translate-x-0',
        mobileOpen && 'translate-x-0',
      )}>
        <div className="mb-11 flex items-center justify-between px-2">
          <Link href="/" data-testid="link-sidebar-logo" className="flex items-center gap-2.5">
            <Mark />
            <div>
              <div className="font-semibold leading-none tracking-tight">hookstep<span className="text-sidebar-primary">.ai</span></div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[.2em] text-sidebar-foreground/50">movement intelligence</div>
            </div>
          </Link>
        </div>
        <nav className="space-y-1" aria-label="Main navigation">
          <div className="mb-3 px-2 font-mono text-[10px] uppercase tracking-[.2em] text-sidebar-foreground/40">Studio</div>
          <NavItem href="/" icon={<Gauge size={17} />} label="Analyze clip" active={location === '/'} onClick={() => setMobileOpen(false)} />
          <NavItem href="/library" icon={<LibraryBig size={17} />} label="Hook-step library" active={location === '/library'} onClick={() => setMobileOpen(false)} />
        </nav>
        <div className="mt-auto space-y-5">
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-sidebar-foreground/50">Engine status</span>
              <span className={cn('h-2 w-2 rounded-full', health?.status === 'ok' ? 'bg-[#c8f26d]' : healthError ? 'bg-[#ff7c6d]' : 'bg-sidebar-foreground/30')} />
            </div>
            <p className="text-sm font-medium">{health?.status === 'ok' ? 'Ready to listen' : healthError ? 'Offline mode' : 'Connecting…'}</p>
            <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/55">Clip analysis stays in your workspace.</p>
          </div>
          <div className="flex items-center gap-2 border-t border-sidebar-border px-2 pt-4 text-xs text-sidebar-foreground/45">
            <CircleHelp size={14} />
            <span>Read the match, then trust your ear.</span>
          </div>
        </div>
      </aside>

      <main className="min-h-[100dvh] lg:pl-[250px]">{children}</main>
      {mobileOpen && <button type="button" aria-label="Close navigation" data-testid="button-close-mobile-nav" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" />}
    </div>
  );
}

function Mark() {
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-sidebar-primary text-sidebar-primary-foreground shadow-[3px_3px_0_hsl(var(--sidebar-border))]">
      <span className="absolute -right-1 -top-2 h-5 w-5 rounded-full border-2 border-sidebar-primary-foreground/70" />
      <span className="absolute bottom-1 left-1.5 h-2.5 w-2.5 rounded-full bg-sidebar-primary-foreground" />
      <span className="absolute bottom-1 right-1.5 h-2.5 w-2.5 rounded-full bg-sidebar-primary-foreground" />
    </span>
  );
}

function NavItem({ href, icon, label, active, onClick }: { href: string; icon: ReactNode; label: string; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
        active ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-[3px_3px_0_hsl(var(--sidebar-border))]' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground',
      )}
    >
      {icon}
      <span>{label}</span>
      {active && <ArrowRight size={14} className="ml-auto" />}
    </Link>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {eyebrow}
        </div>
        <h1 className="max-w-3xl text-[clamp(2.25rem,5vw,4.75rem)] font-semibold leading-[.98] tracking-[-.06em] text-balance">{title}</h1>
        <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function Home() {
  const { data, isLoading, isError, refetch } = useListHookSteps({
    query: { queryKey: getListHookStepsQueryKey(), staleTime: 300_000 },
  });
  const hookSteps = data?.length ? data : fallbackSteps;
  const [mode, setMode] = useState<'upload' | 'record'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState('');
  const [stage, setStage] = useState(-1);
  const [analyzed, setAnalyzed] = useState(false);
  const [selectedHook, setSelectedHook] = useState<HookStep | null>(null);
  const [motionSignature, setMotionSignature] = useState<MotionSignature | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const chosen = selectedHook ?? hookSteps[0] ?? null;
  const searchParams = useMemo(() => ({
    q: chosen ? `${chosen.song} ${chosen.artist}` : 'dance hook step',
    artist: chosen?.artist,
    hookStep: chosen?.name,
  }), [chosen]);
  const search = useSearchYouTube(searchParams, {
    query: {
      enabled: searchTriggered && Boolean(chosen),
      queryKey: getSearchYouTubeQueryKey(searchParams),
    },
  });
  const result = search.data;
  const selectedVideo = result?.selected;

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [fileUrl, recordedUrl]);

  const onFile = (nextFile?: File) => {
    if (!nextFile) return;
    setFile(nextFile);
    setFileUrl(URL.createObjectURL(nextFile));
    setRecordedUrl('');
    setAnalyzed(false);
    setStage(-1);
  };

  const startRecording = async () => {
    if (isRecording) {
      mediaRecorder.current?.stop();
      setIsRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      setIsRecording(false);
      return;
    }
    chunks.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorder.current = recorder;
    recorder.ondataavailable = (event) => event.data.size && chunks.current.push(event.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const url = URL.createObjectURL(new Blob(chunks.current, { type: 'video/webm' }));
      setRecordedUrl(url);
      setFile(null);
      setAnalyzed(false);
      setStage(-1);
    };
    recorder.start();
    setIsRecording(true);
  };

  const runAnalysis = async () => {
    if (!chosen) return;
    setSearchTriggered(false);
    setAnalyzed(false);
    setAnalysisError('');
    setMotionSignature(null);
    setStage(0);

    try {
      const sourceUrl = fileUrl || (recordedUrl !== 'demo' ? recordedUrl : '');
      const signature = sourceUrl
        ? await analyzePoseVideo(sourceUrl, (progress) => {
            if (progress >= 100) setStage(1);
          })
        : {
            framesAnalyzed: 18,
            trackedFrames: 18,
            motionEnergy: 61,
            upperBodyEnergy: 68,
            lowerBodyEnergy: 49,
            tempo: 72,
            confidence: 91,
          };

      setMotionSignature(signature);
      setStage(1);
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      setStage(2);
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      const match = rankHookSteps(signature, hookSteps)[0] ?? chosen;
      setSelectedHook(match);
      setStage(3);
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      setAnalyzed(true);
      setSearchTriggered(true);
    } catch (error) {
      setStage(-1);
      setAnalysisError(
        error instanceof Error
          ? error.message
          : 'The movement could not be read from this clip.',
      );
    }
  };

  const resetAnalysis = () => {
    setStage(-1);
    setAnalyzed(false);
    setSearchTriggered(false);
    setSelectedHook(null);
    setMotionSignature(null);
    setAnalysisError('');
    setFile(null);
    setFileUrl('');
    setRecordedUrl('');
  };

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <PageHeader
        eyebrow="Studio / new analysis"
        title="Find the sound inside the move."
        description="Drop in a short dance clip. HookStep maps the signature movement, finds its likely song, and puts the best listening match right beside it."
        action={
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
            <Radio size={14} className={cn(healthDotClass(search.isFetching))} />
            <span>{search.isFetching ? 'Searching the sound map' : 'Analysis engine online'}</span>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(300px,.82fr)]">
        <section className="overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_12px_40px_hsl(244_25%_16%/.06)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-foreground"><FileVideo size={16} /></span>
              <div>
                <h2 className="text-sm font-semibold">Your source clip</h2>
                <p className="text-xs text-muted-foreground">Best with 3–15 seconds of clear movement</p>
              </div>
            </div>
            {(file || recordedUrl) && <button type="button" onClick={resetAnalysis} data-testid="button-clear-clip" className="focus-ring text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Clear clip</button>}
          </div>

          <div className="p-5 sm:p-7">
            <div className="mb-5 flex rounded-xl bg-muted p-1">
              <button type="button" onClick={() => setMode('upload')} data-testid="button-mode-upload" className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm transition', mode === 'upload' ? 'bg-card font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground')}><Upload size={15} />Upload clip</button>
              <button type="button" onClick={() => setMode('record')} data-testid="button-mode-record" className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm transition', mode === 'record' ? 'bg-card font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground')}><Camera size={15} />Record now</button>
            </div>
            <div className={cn('relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-[#eeece4]', (fileUrl || recordedUrl) && 'border-solid bg-foreground')}>
              {(fileUrl || (recordedUrl && recordedUrl !== 'demo')) ? (
                <div className="absolute inset-0">
                  <video src={fileUrl || recordedUrl} controls playsInline className="h-full w-full object-contain" data-testid="video-source-preview" />
                  <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-foreground/75 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.16em] text-background">source / ready</div>
                </div>
              ) : recordedUrl === 'demo' ? (
                <div className="absolute inset-0 overflow-hidden bg-[#28302c] p-6 text-background">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-primary/20" />
                  <div className="absolute -right-20 -top-28 h-64 w-64 rounded-full border-[28px] border-primary/10" />
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between"><span className="rounded-full bg-primary px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.16em] text-foreground">demo / ready</span><span className="font-mono text-xs text-background/50">00:08</span></div>
                    <div className="mx-auto flex items-end gap-1.5" aria-label="Demo movement waveform">{[24, 45, 73, 38, 88, 52, 29, 62, 42, 76, 34, 56, 25].map((height, index) => <span key={index} className="w-1.5 rounded-full bg-primary" style={{ height: `${height}px`, opacity: .35 + index % 3 * .2 }} />)}</div>
                    <div><p className="text-lg font-semibold">studio-demo-hook.mp4</p><p className="mt-1 text-xs text-background/55">A clean full-body sample, ready to analyze</p></div>
                  </div>
                </div>
              ) : mode === 'record' ? (
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className={cn('mb-5 flex h-20 w-20 items-center justify-center rounded-full border-8 border-primary/20 bg-card text-foreground shadow-sm', isRecording && 'animate-pulse')}><Video size={28} /></div>
                  <p className="font-semibold">{isRecording ? 'Recording your hook…' : 'Frame the movement'}</p>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">Give the camera one clean take. Keep the full body in frame.</p>
                  <button type="button" onClick={() => void startRecording()} data-testid="button-record-clip" className={cn('mt-5 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition', isRecording ? 'bg-destructive text-destructive-foreground' : 'bg-foreground text-background hover:-translate-y-0.5')}>
                    {isRecording ? <><Pause size={15} /> Stop recording</> : <><Camera size={15} /> Start camera</>}
                  </button>
                  {!navigator.mediaDevices?.getUserMedia && <p className="mt-3 text-xs text-destructive">Camera access is unavailable in this browser.</p>}
                </div>
              ) : (
                <label className="relative z-10 flex cursor-pointer flex-col items-center text-center">
                  <input type="file" accept="video/*" onChange={(event) => onFile(event.target.files?.[0])} className="sr-only" data-testid="input-upload-clip" />
                  <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-foreground shadow-[4px_4px_0_hsl(244_18%_25%/.2)] transition-transform hover:-translate-y-1"><Upload size={24} /></span>
                  <span className="font-semibold">Drop a dance clip here</span>
                  <span className="mt-1 text-sm text-muted-foreground">or click to browse your camera roll</span>
                  <span className="mt-5 rounded-full border border-border bg-card px-3 py-1 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">MP4, MOV, WEBM / 50 MB max</span>
                </label>
              )}
              {!fileUrl && !recordedUrl && <div className="pointer-events-none absolute inset-0 opacity-40"><div className="absolute left-1/2 top-0 h-full w-px bg-border" /><div className="absolute left-0 top-1/2 h-px w-full bg-border" /></div>}
            </div>
            <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles size={14} className="text-primary-foreground" />
                <span>{file?.name || recordedUrl ? 'Ready for a movement read' : 'Or start with a demo clip'}</span>
              </div>
              <button type="button" onClick={() => { setMode('upload'); setFile({ name: 'studio-demo-hook.mp4' } as File); setFileUrl(''); setRecordedUrl('demo'); }} data-testid="button-load-demo" className="flex items-center gap-1.5 self-start text-xs font-semibold underline decoration-primary decoration-2 underline-offset-4 hover:text-muted-foreground sm:self-auto">Load demo clip <ArrowRight size={13} /></button>
            </div>
          </div>
        </section>

        <AnalysisPanel stage={stage} analyzed={analyzed} onAnalyze={() => void runAnalysis()} disabled={!file && !recordedUrl} onReset={resetAnalysis} error={analysisError} />
      </div>

      <MatchSection
        hookSteps={hookSteps}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        analyzed={analyzed}
        selectedHook={selectedHook}
        motionSignature={motionSignature}
        result={result}
        searchLoading={search.isLoading || search.isFetching}
        searchError={search.isError}
        selectedVideo={selectedVideo}
        showAllCandidates={showAllCandidates}
        onToggleCandidates={() => setShowAllCandidates((open) => !open)}
        onSelectCandidate={(video) => queryClient.setQueryData(getSearchYouTubeQueryKey(searchParams), (old: typeof result) => old ? { ...old, selected: video } : old)}
      />
    </div>
  );
}

function healthDotClass(fetching: boolean) {
  return fetching ? 'animate-pulse text-primary' : 'text-[#4f9892]';
}

function AnalysisPanel({ stage, analyzed, onAnalyze, disabled, onReset, error }: { stage: number; analyzed: boolean; onAnalyze: () => void; disabled: boolean; onReset: () => void; error: string }) {
  return (
    <section className="flex flex-col rounded-[24px] border border-foreground bg-foreground p-5 text-background shadow-[6px_6px_0_hsl(43_99%_59%/.8)] sm:p-7">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Analysis pipeline</div>
          <h2 className="text-2xl font-semibold tracking-[-.04em]">Listen with your eyes.</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-background/60">We compare the movement signature to known hook-steps, then search for the cleanest song match.</p>
        </div>
        <Disc3 size={22} className={cn('text-primary', stage >= 0 && !analyzed && 'animate-spin')} />
      </div>
      <div className="my-8 space-y-4">
        {stageLabels.map((label, index) => {
          const complete = stage > index || analyzed;
          const current = stage === index && !analyzed;
          return (
            <div key={label} className="flex items-center gap-3" data-testid={`status-stage-${index}`}>
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold', complete ? 'border-primary bg-primary text-foreground' : current ? 'border-primary text-primary' : 'border-background/20 text-background/35')}>{complete ? <Check size={14} /> : index + 1}</span>
              <span className={cn('text-sm', complete ? 'text-background' : current ? 'font-semibold text-primary' : 'text-background/40')}>{label}</span>
              {current && <span className="ml-auto font-mono text-[9px] uppercase tracking-[.16em] text-primary">reading</span>}
              {complete && <span className="ml-auto font-mono text-[9px] uppercase tracking-[.16em] text-background/35">done</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-auto">
        {error && <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-5 text-background/80">{error}</p>}
        {analyzed ? (
          <button type="button" onClick={onReset} data-testid="button-new-analysis" className="flex w-full items-center justify-center gap-2 rounded-xl border border-background/20 px-4 py-3 text-sm font-semibold transition hover:border-background/50"><RotateCcw size={15} /> Start another read</button>
        ) : (
          <button type="button" onClick={onAnalyze} disabled={disabled || stage >= 0} data-testid="button-analyze-clip" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-foreground transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_hsl(42_44%_98%/.25)] disabled:cursor-not-allowed disabled:opacity-40">
            {stage >= 0 ? <><LoaderCircle size={16} className="animate-spin" /> Reading movement…</> : <><Sparkles size={16} /> Analyze this clip</>}
          </button>
        )}
        <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[.15em] text-background/35">No account · no training data saved</p>
      </div>
    </section>
  );
}

function MatchSection({ hookSteps, isLoading, isError, refetch, analyzed, selectedHook, motionSignature, result, searchLoading, searchError, selectedVideo, showAllCandidates, onToggleCandidates, onSelectCandidate }: {
  hookSteps: HookStep[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  analyzed: boolean;
  selectedHook: HookStep | null;
  motionSignature: MotionSignature | null;
  result?: { query: string; source: string; selected: YouTubeVideo; candidates: YouTubeVideo[] };
  searchLoading: boolean;
  searchError: boolean;
  selectedVideo?: YouTubeVideo;
  showAllCandidates: boolean;
  onToggleCandidates: () => void;
  onSelectCandidate: (video: YouTubeVideo) => void;
}) {
  return (
    <section className="mt-16">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Result / sound map</div>
          <h2 className="text-2xl font-semibold tracking-[-.04em] sm:text-3xl">The hook-step match</h2>
        </div>
        <Link href="/library" data-testid="link-open-library" className="hidden items-center gap-1.5 text-sm font-semibold underline decoration-primary decoration-2 underline-offset-4 hover:text-muted-foreground sm:flex">Browse all hooks <ArrowRight size={14} /></Link>
      </div>
      {!analyzed ? (
        <div className="grid min-h-[220px] place-items-center rounded-[22px] border border-dashed border-border bg-card/50 p-8 text-center">
          <div><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><AudioLines size={22} /></div><p className="font-semibold">Your sound map is waiting</p><p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Upload a clip above and run the analysis. A confident movement match will land here.</p></div>
        </div>
      ) : selectedHook && result && selectedVideo ? (
        <div className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
           <HookMatchCard hook={selectedHook} signature={motionSignature} />
          <VideoResult result={result} selectedVideo={selectedVideo} searchLoading={searchLoading} searchError={searchError} showAllCandidates={showAllCandidates} onToggleCandidates={onToggleCandidates} onSelectCandidate={onSelectCandidate} />
        </div>
      ) : searchLoading ? (
        <div className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]"><SkeletonMatch /><SkeletonVideo /></div>
      ) : searchError ? (
        <div className="rounded-[22px] border border-destructive/30 bg-destructive/5 p-8 text-center"><p className="font-semibold">The sound search missed a beat.</p><p className="mt-2 text-sm text-muted-foreground">You can run this analysis again when the search service is back.</p></div>
      ) : (
        <div className="rounded-[22px] border border-border bg-card p-8 text-center"><p className="font-semibold">No hook-step match yet</p><p className="mt-2 text-sm text-muted-foreground">Try a clip with more of the signature movement in frame.</p></div>
      )}
      <div className="mt-12 border-t border-border pt-7">
        <div className="mb-4 flex items-center justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Curated signal bank</div><h3 className="mt-1 text-xl font-semibold tracking-[-.03em]">Known hook-steps</h3></div><Link href="/library" data-testid="link-browse-dataset" className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">Open dataset <ArrowRight size={13} /></Link></div>
        {isLoading ? <DatasetSkeleton /> : isError ? <div className="flex items-center justify-between rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm"><span>Could not load the signal bank.</span><button type="button" onClick={() => void refetch()} data-testid="button-retry-hooks" className="flex items-center gap-1 font-semibold text-destructive"><RotateCcw size={14} /> Retry</button></div> : hookSteps.length === 0 ? <EmptyDataset /> : <div className="grid gap-3 md:grid-cols-3">{hookSteps.slice(0, 3).map((hook) => <MiniHookCard key={hook.id} hook={hook} />)}</div>}
      </div>
    </section>
  );
}

function HookMatchCard({ hook, signature }: { hook: HookStep; signature: MotionSignature | null }) {
  return <div className="relative overflow-hidden rounded-[22px] bg-[#d7efbd] p-6 text-foreground sm:p-7">
    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border-[20px] border-[#b5d890]/70" />
    <div className="relative">
      <div className="flex items-center justify-between"><span className="rounded-full bg-foreground px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.15em] text-background">Movement found</span><span className="font-mono text-xs">{signature?.confidence ?? 94.6}%</span></div>
      <div className="mt-12"><div className="mb-2 text-sm text-foreground/60">Signature class</div><h3 className="text-3xl font-semibold leading-none tracking-[-.06em]">{hook.name}</h3><p className="mt-4 max-w-sm text-sm leading-6 text-foreground/70">{hook.description}</p></div>
      <div className="mt-8 border-t border-foreground/15 pt-4"><div className="flex items-center gap-2 text-sm font-semibold"><Music2 size={16} /> {hook.song}</div><p className="mt-1 pl-6 text-xs text-foreground/60">{hook.artist} · {hook.movieOrAlbum}</p></div>
      <div className="mt-5 flex flex-wrap gap-1.5">{hook.tags.map((tag) => <span key={tag} className="rounded-full border border-foreground/15 px-2 py-1 font-mono text-[9px] uppercase tracking-[.1em] text-foreground/60">#{tag}</span>)}</div>
      {signature && <div className="mt-6 grid grid-cols-3 gap-2 border-t border-foreground/15 pt-4 text-[10px] uppercase tracking-[.12em] text-foreground/55"><div><span className="block font-mono text-[9px]">Pose frames</span><strong className="mt-1 block text-sm tracking-normal text-foreground">{signature.trackedFrames}/{signature.framesAnalyzed}</strong></div><div><span className="block font-mono text-[9px]">Motion</span><strong className="mt-1 block text-sm tracking-normal text-foreground">{signature.motionEnergy}%</strong></div><div><span className="block font-mono text-[9px]">Tempo</span><strong className="mt-1 block text-sm tracking-normal text-foreground">{signature.tempo}%</strong></div></div>}
    </div>
  </div>;
}

function VideoResult({ result, selectedVideo, searchLoading, searchError, showAllCandidates, onToggleCandidates, onSelectCandidate }: { result: { source: string; selected: YouTubeVideo; candidates: YouTubeVideo[] }; selectedVideo: YouTubeVideo; searchLoading: boolean; searchError: boolean; showAllCandidates: boolean; onToggleCandidates: () => void; onSelectCandidate: (video: YouTubeVideo) => void }) {
  const candidates = showAllCandidates ? result.candidates : result.candidates.slice(0, 2);
  return <div className="overflow-hidden rounded-[22px] border border-border bg-card">
    <div className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-2 text-sm font-semibold"><Youtube size={17} className="text-[#d94a40]" /> Best listening match</div><span className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">via {result.source || 'YouTube'}</span></div>
    <div className="grid lg:grid-cols-[1.15fr_.85fr]">
      <div className="relative min-h-[235px] bg-foreground">
        {searchLoading ? <div className="grid h-full min-h-[235px] place-items-center text-background/50"><LoaderCircle size={24} className="animate-spin" /></div> : searchError ? <div className="grid min-h-[235px] place-items-center p-6 text-center text-background/70"><p>Video preview unavailable.</p></div> : <iframe title={selectedVideo.title} src={`https://www.youtube.com/embed/${selectedVideo.videoId}?rel=0`} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen data-testid="iframe-youtube-result" />}
      </div>
      <div className="p-5">
        <div className="mb-1 font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">Selected track</div>
        <h3 className="line-clamp-2 text-lg font-semibold leading-snug">{selectedVideo.title}</h3><p className="mt-1 text-sm text-muted-foreground">{selectedVideo.channelTitle}</p>
        <div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-xl bg-muted p-3"><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Relevance</div><div className="mt-1 text-lg font-semibold">{Math.round(selectedVideo.relevanceScore * 100)}%</div></div><div className="rounded-xl bg-muted p-3"><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Views</div><div className="mt-1 text-lg font-semibold">{compactNumber(selectedVideo.viewCount)}</div></div></div>
        <div className="mt-5 flex items-center justify-between"><span className="text-xs text-muted-foreground">Other close reads</span><button type="button" onClick={onToggleCandidates} data-testid="button-toggle-candidates" className="font-mono text-[10px] uppercase tracking-[.1em] underline underline-offset-4">{showAllCandidates ? 'Collapse' : 'View all'}</button></div>
        <div className="mt-3 space-y-2">{candidates.map((candidate) => <button type="button" key={candidate.videoId} onClick={() => onSelectCandidate(candidate)} data-testid={`button-candidate-${candidate.videoId}`} className={cn('flex w-full items-center gap-2 rounded-xl border p-2 text-left transition hover:border-foreground/40', selectedVideo.videoId === candidate.videoId ? 'border-primary bg-primary/10' : 'border-border')}><img src={candidate.thumbnailUrl} alt="" className="h-10 w-14 rounded-lg object-cover" /><span className="line-clamp-2 text-xs font-medium">{candidate.title}</span></button>)}</div>
      </div>
    </div>
  </div>;
}

function MiniHookCard({ hook }: { hook: HookStep }) {
  return <div className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-1 hover:border-foreground/30 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground"><Music2 size={16} /></div><span className="font-mono text-[10px] text-muted-foreground">{hook.popularity} signal</span></div><h4 className="mt-5 font-semibold">{hook.name}</h4><p className="mt-1 text-xs text-muted-foreground">{hook.song} · {hook.artist}</p><div className="mt-4 flex gap-1.5 overflow-hidden">{hook.tags.slice(0, 2).map((tag) => <span key={tag} className="shrink-0 rounded-full bg-muted px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">#{tag}</span>)}</div></div>;
}

function SkeletonMatch() { return <div className="min-h-[300px] animate-pulse rounded-[22px] bg-muted" />; }
function SkeletonVideo() { return <div className="min-h-[300px] animate-pulse rounded-[22px] bg-muted" />; }
function DatasetSkeleton() { return <div className="grid gap-3 md:grid-cols-3"><div className="h-36 animate-pulse rounded-2xl bg-muted" /><div className="h-36 animate-pulse rounded-2xl bg-muted" /><div className="h-36 animate-pulse rounded-2xl bg-muted" /></div>; }
function EmptyDataset() { return <div className="rounded-2xl border border-dashed border-border p-8 text-center"><FolderOpen className="mx-auto text-muted-foreground" size={22} /><p className="mt-3 text-sm font-semibold">The signal bank is empty</p><p className="mt-1 text-xs text-muted-foreground">Curated movement classes will appear here.</p></div>; }

function Library() {
  const { data, isLoading, isError, refetch } = useListHookSteps({ query: { queryKey: getListHookStepsQueryKey(), staleTime: 300_000 } });
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All signals');
  const steps = data ?? [];
  const tags = ['All signals', ...Array.from(new Set(steps.flatMap((step) => step.tags))).slice(0, 8)];
  const filtered = steps.filter((step) => {
    const haystack = `${step.name} ${step.song} ${step.artist} ${step.tags.join(' ')}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (activeTag === 'All signals' || step.tags.includes(activeTag));
  });
  return <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
    <PageHeader eyebrow="Library / curated signals" title="The movement index." description="A living reference of recognizable dance signatures and the songs that made them stick. Use it to explore before you upload." action={<div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground"><Grid2X2 size={14} /> {steps.length || '—'} signal classes</div>} />
    <div className="mb-7 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row">
      <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a move, song, or artist" data-testid="input-search-library" className="focus-ring w-full rounded-xl bg-muted py-3 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground/70" /></div>
      <div className="flex gap-2 overflow-auto pb-1 sm:pb-0">{tags.map((tag) => <button type="button" key={tag} onClick={() => setActiveTag(tag)} data-testid={`button-filter-${tag.replaceAll(' ', '-').toLowerCase()}`} className={cn('shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition', activeTag === tag ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>{tag}</button>)}</div>
    </div>
    {isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><DatasetSkeleton /><DatasetSkeleton /></div> : isError ? <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-10 text-center"><p className="font-semibold">The library is taking a pause.</p><button type="button" onClick={() => void refetch()} data-testid="button-retry-library" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background"><RotateCcw size={14} /> Try again</button></div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-14 text-center"><Search className="mx-auto text-muted-foreground" size={26} /><p className="mt-4 font-semibold">No signals match that search</p><p className="mt-1 text-sm text-muted-foreground">Try a broader movement, song, or artist.</p><button type="button" onClick={() => { setSearch(''); setActiveTag('All signals'); }} data-testid="button-clear-library-filters" className="mt-5 text-sm font-semibold underline decoration-primary decoration-2 underline-offset-4">Clear filters</button></div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((hook, index) => <LibraryCard key={hook.id} hook={hook} index={index} />)}</div>}
  </div>;
}

function LibraryCard({ hook, index }: { hook: HookStep; index: number }) {
  const accents = ['bg-[#d7efbd]', 'bg-[#c8e8e5]', 'bg-[#f7ddb0]', 'bg-[#e4d7ef]'];
  return <article className="animate-rise-in group overflow-hidden rounded-[22px] border border-border bg-card transition hover:-translate-y-1 hover:border-foreground/30 hover:shadow-[0_12px_32px_hsl(244_25%_16%/.08)]" style={{ animationDelay: `${index * 45}ms` }} data-testid={`card-hook-${hook.id}`}>
    <div className={cn('relative flex h-28 items-end justify-between overflow-hidden p-5', accents[index % accents.length])}><div className="absolute -right-5 -top-10 h-32 w-32 rounded-full border-[17px] border-foreground/10" /><div className="absolute right-5 top-6 flex gap-1"><span className="h-10 w-1 rounded-full bg-foreground/25" /><span className="h-16 w-1 rounded-full bg-foreground/35" /><span className="h-7 w-1 rounded-full bg-foreground/20" /><span className="h-12 w-1 rounded-full bg-foreground/35" /></div><span className="relative rounded-full bg-foreground px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.15em] text-background">#{String(index + 1).padStart(2, '0')}</span><span className="relative flex items-center gap-1 font-mono text-[10px] text-foreground/60"><Sparkles size={11} /> {hook.popularity} popularity</span></div>
    <div className="p-5"><h2 className="text-xl font-semibold tracking-[-.04em]">{hook.name}</h2><div className="mt-2 flex items-center gap-2 text-sm"><Music2 size={14} className="text-muted-foreground" /><span className="font-medium">{hook.song}</span><span className="text-muted-foreground">· {hook.artist}</span></div><p className="mt-4 min-h-[48px] text-sm leading-6 text-muted-foreground">{hook.description}</p><div className="mt-5 flex flex-wrap gap-1.5">{hook.tags.map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">#{tag}</span>)}</div><div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground"><span>{hook.movieOrAlbum}</span><span className="flex items-center gap-1 font-semibold text-foreground">Explore <ArrowRight size={13} /></span></div></div>
  </article>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route path="/library" component={Library} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppShell><Router /></AppShell></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

function compactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export default App;