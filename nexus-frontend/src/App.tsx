import { useState, useEffect } from 'react';
import Navbar, { type TabType } from './components/navbar';
import JobsSection from './components/JobsSection';
import ResumeMatcher from './components/ResumeMatcher';
import AgentChat from './components/AgentChat';
import ShortlistSection from './components/ShortlistSection';
import BriefingSection from './components/BriefingSection';
import AuthModal from './components/AuthModal';
import { api, type Job, type ShortlistItem, type User } from './services/api';
import { browserStorage, storageKeys } from './services/storage';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import './App.css';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function App() {
  const [activeTab, setActiveTabState] = useState<TabType>(() =>
    browserStorage.get<TabType>(storageKeys.ACTIVE_TAB, 'jobs')
  );
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Initialize jobs and shortlist directly from browser storage for instant zero-latency loading
  const [jobs, setJobsState] = useState<Job[]>(() =>
    browserStorage.get<Job[]>(storageKeys.CACHED_JOBS, [])
  );
  const [jobsLoading, setJobsLoading] = useState<boolean>(() => jobs.length === 0);
  const [shortlist, setShortlistState] = useState<ShortlistItem[]>(() =>
    browserStorage.get<ShortlistItem[]>(storageKeys.SHORTLIST, [])
  );
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Track running background tasks across tabs
  const [runningTasks, setRunningTasks] = useState<Record<string, string>>({});

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    browserStorage.set(storageKeys.ACTIVE_TAB, tab);
  };

  const setJobs = (data: Job[]) => {
    setJobsState(data);
    browserStorage.set(storageKeys.CACHED_JOBS, data);
  };

  const setShortlist = (action: React.SetStateAction<ShortlistItem[]>) => {
    setShortlistState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      browserStorage.set(storageKeys.SHORTLIST, next);
      return next;
    });
  };

  const setTaskStatus = (task: string, message: string | null) => {
    setRunningTasks((prev) => {
      const updated = { ...prev };
      if (!message) {
        delete updated[task];
      } else {
        updated[task] = message;
      }
      return updated;
    });
  };

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = 'toast-' + Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Initial load
  useEffect(() => {
    // Check local auth
    const savedUser = api.getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
      setIsAuthenticated(true);
    }

    // Ping backend health
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 12000);

    // Load initial jobs & shortlist
    loadJobs();
    loadShortlist();

    return () => clearInterval(interval);
  }, []);

  const checkBackendHealth = async () => {
    const ok = await api.checkHealth();
    setIsBackendConnected(ok);
  };

  const loadJobs = async () => {
    if (jobs.length === 0) {
      setJobsLoading(true);
    }
    try {
      const data = await api.getJobs();
      setJobs(data);
    } catch {
      if (jobs.length === 0) {
        addToast('error', 'Could not fetch jobs from server.');
      }
    } finally {
      setJobsLoading(false);
    }
  };

  const loadShortlist = async () => {
    try {
      const data = await api.getShortlist();
      if (data) {
        setShortlist(data);
      }
    } catch {
      // ignore
    }
  };

  // Handle Scraper Trigger with background task tracking
  const handleScrape = async (url: string) => {
    const isAll = url === 'ALL_3_SOURCES';
    const taskMsg = isAll
      ? 'Scraping RemoteOK, Hacker News & Jobspresso in background...'
      : `Scraping ${url} in background...`;

    setTaskStatus('jobs', taskMsg);
    try {
      if (isAll) {
        const res = await api.scrapeAllSources();
        addToast('success', res.message || 'Scraped all 3 platforms and updated cache!');
      } else {
        const res = await api.scrapeUrl(url);
        addToast('success', res.message || 'Scrape completed and jobs structured.');
      }
      await loadJobs();
    } catch (err: any) {
      addToast('error', err.message || 'Scrape request encountered an issue.');
    } finally {
      setTaskStatus('jobs', null);
    }
  };

  // Handle Resume Matching with background task tracking
  const handleMatchResume = async (resumeText: string): Promise<Job[]> => {
    setTaskStatus('resume', 'Computing semantic cosine matches with pgvector...');
    try {
      const results = await api.matchResume(resumeText);
      addToast('success', `Ranked ${results.length} jobs by semantic cosine distance.`);
      return results;
    } catch (err: any) {
      addToast('error', err.message || 'Semantic matching failed.');
      throw err;
    } finally {
      setTaskStatus('resume', null);
    }
  };

  // Toggle Shortlist item
  const handleToggleShortlist = async (job: Job) => {
    const existing = shortlist.find(
      (item) => item.job.id === job.id || item.job.title === job.title
    );

    if (existing) {
      // Remove
      try {
        await api.removeFromShortlist(existing.id);
        setShortlist((prev) => prev.filter((i) => i.id !== existing.id));
        addToast('info', `Removed "${job.title}" from shortlist.`);
      } catch {
        addToast('error', 'Failed to remove from shortlist.');
      }
    } else {
      // Save
      try {
        const saved = await api.saveToShortlist(
          job,
          job.matchScore || 0.88,
          job.justification
        );
        setShortlist((prev) => [saved, ...prev]);
        addToast('success', `Saved "${job.title}" to shortlist.`);
      } catch {
        addToast('error', 'Failed to save to shortlist.');
      }
    }
  };

  const handleRemoveShortlist = async (id: string) => {
    try {
      await api.removeFromShortlist(id);
      setShortlist((prev) => prev.filter((i) => i.id !== id));
      addToast('info', 'Item removed from shortlist.');
    } catch {
      addToast('error', 'Failed to remove item.');
    }
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setIsAuthenticated(true);
    addToast('success', `Welcome back, ${authenticatedUser.email}!`);
    loadShortlist();
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setIsAuthenticated(false);
    addToast('info', 'You have been signed out.');
  };

  const shortlistJobIds = new Set(shortlist.map((item) => item.job.id));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl shadow-lg border text-xs font-medium animate-fadeIn ${
              t.type === 'success'
                ? 'bg-white border-emerald-200 text-emerald-800'
                : t.type === 'error'
                ? 'bg-white border-rose-200 text-rose-800'
                : 'bg-white border-blue-200 text-blue-800'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : t.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            )}
            <span className="flex-1 leading-snug">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Floating Background Task Indicator if user navigated away from working tab */}
      {Object.entries(runningTasks).some(([tab]) => tab !== activeTab) && (
        <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-2 pointer-events-auto animate-fadeIn">
          {Object.entries(runningTasks).map(([taskTab, taskDescription]) => {
            if (taskTab === activeTab || !taskDescription) return null;
            const tabName =
              taskTab === 'jobs'
                ? 'Jobs & Scraper'
                : taskTab === 'resume'
                ? 'Resume Matcher'
                : taskTab === 'agent'
                ? 'AI Agent Chat'
                : taskTab === 'briefings'
                ? 'Video Career Briefings'
                : taskTab;
            return (
              <button
                key={taskTab}
                type="button"
                onClick={() => setActiveTab(taskTab as TabType)}
                className="bg-slate-900/95 backdrop-blur-md text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700/80 flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition transform hover:-translate-y-0.5 text-left group"
                title={`Click to switch to ${tabName}`}
              >
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                <div className="flex flex-col">
                  <span className="font-bold text-blue-300 flex items-center gap-1">
                    <span>Task Running in Background ({tabName})</span>
                  </span>
                  <span className="text-[11px] text-slate-300 font-normal">
                    {taskDescription}
                  </span>
                </div>
                <span className="text-[10px] text-blue-400 group-hover:text-blue-300 font-semibold underline shrink-0 ml-1">
                  Switch &rarr;
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        isAuthenticated={isAuthenticated}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isBackendConnected={isBackendConnected}
        shortlistCount={shortlist.length}
        runningTasks={runningTasks}
      />

      {/* Main Content View - Kept mounted in DOM so background tasks continue running and state is never lost */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className={activeTab === 'jobs' ? 'block' : 'hidden'}>
          <JobsSection
            jobs={jobs}
            loading={jobsLoading}
            onScrape={handleScrape}
            onToggleShortlist={handleToggleShortlist}
            shortlistJobIds={shortlistJobIds}
            isScrapingGlobal={Boolean(runningTasks.jobs)}
          />
        </div>

        <div className={activeTab === 'resume' ? 'block' : 'hidden'}>
          <ResumeMatcher
            onMatch={handleMatchResume}
            onToggleShortlist={handleToggleShortlist}
            shortlistJobIds={shortlistJobIds}
            onTaskChange={(msg) => setTaskStatus('resume', msg)}
          />
        </div>

        <div className={activeTab === 'agent' ? 'block' : 'hidden'}>
          <AgentChat onTaskChange={(msg) => setTaskStatus('agent', msg)} />
        </div>

        <div className={activeTab === 'shortlist' ? 'block' : 'hidden'}>
          <ShortlistSection
            shortlist={shortlist}
            onRemove={handleRemoveShortlist}
            onGoToBriefing={() => setActiveTab('briefings')}
            onGoToJobs={() => setActiveTab('jobs')}
          />
        </div>

        <div className={activeTab === 'briefings' ? 'block' : 'hidden'}>
          <BriefingSection onTaskChange={(msg) => setTaskStatus('briefings', msg)} />
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
