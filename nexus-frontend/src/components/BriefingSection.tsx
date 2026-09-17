import { useState, useEffect } from 'react';
import { 
  Video, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  FileText,
  ExternalLink
} from 'lucide-react';
import { api, type Briefing } from '../services/api';
import { browserStorage, storageKeys } from '../services/storage';

interface BriefingSectionProps {
  onTaskChange?: (msg: string | null) => void;
}

export default function BriefingSection({ onTaskChange }: BriefingSectionProps = {}) {
  const [briefings, setBriefingsState] = useState<Briefing[]>(() =>
    browserStorage.get<Briefing[]>(storageKeys.BRIEFINGS, [])
  );
  const [generating, setGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState<'IDLE' | 'QUEUED' | 'PROCESSING' | 'PENDING' | 'DONE' | 'FAILED'>('IDLE');
  const [activeBriefing, setActiveBriefingState] = useState<Briefing | null>(() =>
    browserStorage.get<Briefing | null>(storageKeys.ACTIVE_BRIEFING, null)
  );
  const [error, setError] = useState<string | null>(null);

  const setBriefings = (action: React.SetStateAction<Briefing[]>) => {
    setBriefingsState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      browserStorage.set(storageKeys.BRIEFINGS, next);
      return next;
    });
  };

  const setActiveBriefing = (b: Briefing | null) => {
    setActiveBriefingState(b);
    browserStorage.set(storageKeys.ACTIVE_BRIEFING, b);
  };

  useEffect(() => {
    loadBriefings();
  }, []);

  const loadBriefings = async () => {
    try {
      const list = await api.getBriefings();
      if (list && list.length > 0) {
        setBriefings(list);
        if (!activeBriefing) {
          setActiveBriefing(list[0]);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setJobStatus('QUEUED');
    onTaskChange?.('Generating video avatar career briefing in background...');

    try {
      const res = await api.generateBriefing();
      setJobStatus(res.status || 'DONE');

      const newBriefing: Briefing = {
        id: res.id || 'briefing-' + Date.now(),
        status: res.status || 'DONE',
        script: res.script,
        videoUrl: res.videoUrl,
        createdAt: res.createdAt || new Date().toISOString(),
      };

      setActiveBriefing(newBriefing);
      setBriefings((prev) => [newBriefing, ...prev.filter((b) => b.id !== newBriefing.id)]);
    } catch (err: any) {
      setError(err.message || 'Failed to start briefing generation');
      setJobStatus('IDLE');
    } finally {
      setGenerating(false);
      onTaskChange?.(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            Autonomous Video Career Briefing
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Synthesizes your top 3 weekly matches into a 60–90 second presenter script and delivers an asynchronous video avatar briefing.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-98 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-xs transition shrink-0"
        >
          <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          <span>{generating ? 'Generating Briefing...' : 'Generate My Briefing'}</span>
        </button>
      </div>

      {/* Async Status Progress Bar (Requirement: Handling async job lifecycle) */}
      {jobStatus !== 'IDLE' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs animate-fadeIn">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-700">Async Generation Pipeline:</span>
            <span className="font-mono text-blue-600 font-bold uppercase">{jobStatus}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className={`p-2 rounded-lg border ${
              jobStatus === 'QUEUED' || jobStatus === 'PROCESSING' || jobStatus === 'DONE'
                ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              1. LLM Writes Script
            </div>
            <div className={`p-2 rounded-lg border ${
              jobStatus === 'PROCESSING' || jobStatus === 'DONE'
                ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              2. Async Video Render
            </div>
            <div className={`p-2 rounded-lg border ${
              jobStatus === 'DONE'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              3. Ready in App
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Briefing Display */}
      {activeBriefing ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Player */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Avatar Video Briefing Ready
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(activeBriefing.createdAt || Date.now()).toLocaleDateString()}
                </span>
              </div>

              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner">
                {activeBriefing.videoUrl ? (
                  <video
                    src={activeBriefing.videoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <Video className="w-10 h-10 mb-2 text-slate-300" />
                    <p className="text-xs text-slate-400">No video rendering URL returned yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-slate-400" />
                {activeBriefing.videoUrl ? 'Video media attached' : 'Script-only mode'}
              </span>
              {activeBriefing.videoUrl && (
                <a
                  href={activeBriefing.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Open Video</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Generated Spoken Script */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Synthesized Briefing Script (60–90s)
                </h3>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed font-serif max-h-[320px] overflow-y-auto">
                {activeBriefing.script}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Duration: ~75 seconds</span>
              <span className="font-mono text-emerald-600 font-semibold">Status: Completed</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Video className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Briefings Generated Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Click "Generate My Briefing" above to produce your personalized 60-90 second weekly video breakdown.
          </p>
        </div>
      )}

      {/* Past Briefings History */}
      {briefings.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Past Briefings Archive</h3>
          <div className="space-y-2">
            {briefings.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setActiveBriefing(b)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center justify-between ${
                  activeBriefing?.id === b.id
                    ? 'bg-blue-50 border-blue-200 text-blue-900 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="truncate max-w-[80%]">
                  <span className="font-bold">{new Date(b.createdAt || Date.now()).toLocaleDateString()}</span>
                  <span className="text-slate-400 mx-2">—</span>
                  <span className="truncate">{b.script.slice(0, 70)}...</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-[10px]">
                  {b.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

