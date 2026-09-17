import { useState } from 'react';
import { 
  Search, 
  Globe, 
  MapPin, 
  DollarSign, 
  Bookmark, 
  BookmarkCheck, 
  ExternalLink, 
  Filter,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { type Job } from '../services/api';
import { browserStorage } from '../services/storage';

interface JobsSectionProps {
  jobs: Job[];
  loading: boolean;
  onScrape: (url: string) => Promise<void>;
  onToggleShortlist: (job: Job) => void;
  shortlistJobIds: Set<string>;
  onSelectForMatching?: (job: Job) => void;
  isScrapingGlobal?: boolean;
}

interface ScraperSuggestion {
  name: string;
  url: string;
  description: string;
  tag: string;
  dotColor: string;
}

const SCRAPER_SUGGESTIONS: ScraperSuggestion[] = [
  {
    name: 'RemoteOK',
    url: 'https://remoteok.com/api',
    description: 'Tech & software engineering roles',
    tag: 'Official Feed',
    dotColor: 'bg-rose-500',
  },
  {
    name: 'Jobspresso',
    url: 'https://jobspresso.co/remote-work/',
    description: 'Curated remote tech & design jobs',
    tag: 'Curated Tech',
    dotColor: 'bg-emerald-500',
  },
  {
    name: 'Hacker News',
    url: 'https://news.ycombinator.com/jobs',
    description: 'YC startups & engineering openings',
    tag: 'YC & Startups',
    dotColor: 'bg-amber-500',
  },
];

export default function JobsSection({
  jobs,
  loading,
  onScrape,
  onToggleShortlist,
  shortlistJobIds,
  isScrapingGlobal,
}: JobsSectionProps) {
  const [targetUrl, setTargetUrlState] = useState<string>(() =>
    browserStorage.getString('nexus_job_url', '')
  );
  const [scraping, setScraping] = useState(false);
  const [searchQuery, setSearchQueryState] = useState<string>(() =>
    browserStorage.getString('nexus_job_search', '')
  );
  const [remoteOnly, setRemoteOnlyState] = useState<boolean>(() =>
    browserStorage.get<boolean>('nexus_job_remote', false)
  );
  const [expFilter, setExpFilterState] = useState<string>(() =>
    browserStorage.getString('nexus_job_exp', 'ALL')
  );
  const [sourceFilter, setSourceFilterState] = useState<string>(() =>
    browserStorage.getString('nexus_job_source', 'ALL')
  );

  const setTargetUrl = (val: string) => {
    setTargetUrlState(val);
    browserStorage.set('nexus_job_url', val);
  };
  const setSearchQuery = (val: string) => {
    setSearchQueryState(val);
    browserStorage.set('nexus_job_search', val);
  };
  const setRemoteOnly = (val: boolean) => {
    setRemoteOnlyState(val);
    browserStorage.set('nexus_job_remote', val);
  };
  const setExpFilter = (val: string) => {
    setExpFilterState(val);
    browserStorage.set('nexus_job_exp', val);
  };
  const setSourceFilter = (val: string) => {
    setSourceFilterState(val);
    browserStorage.set('nexus_job_source', val);
  };

  const isScrapingActive = scraping || Boolean(isScrapingGlobal);

  const decodeHtml = (html: string) => {
    if (!html) return '';
    return html
      .replace(/&#038;/g, '&')
      .replace(/&#8211;/g, '–')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  };

  const getJobSource = (job: Job): string => {
    if (job.source) return job.source;
    const url = (job.sourceUrl || '').toLowerCase();
    const comp = (job.company || '').toLowerCase();
    if (url.includes('remoteok')) return 'RemoteOK';
    if (url.includes('jobspresso')) return 'Jobspresso';
    if (
      url.includes('ycombinator') ||
      url.includes('hackernews') ||
      comp.includes('(yc ') ||
      comp.includes('y combinator') ||
      url.includes('#hn')
    ) {
      return 'Hacker News';
    }
    return 'Direct Web';
  };

  const getSourceBadge = (job: Job) => {
    const src = getJobSource(job);
    if (src === 'RemoteOK') {
      return { name: 'RemoteOK', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (src === 'Hacker News') {
      return { name: 'Hacker News', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (src === 'Jobspresso') {
      return { name: 'Jobspresso', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    return { name: 'Direct Web', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
  };

  const handleScrapeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;
    setScraping(true);
    try {
      await onScrape(targetUrl.trim());
    } finally {
      setScraping(false);
    }
  };

  const handleScrapeAll = async () => {
    setScraping(true);
    try {
      await onScrape('ALL_3_SOURCES');
    } finally {
      setScraping(false);
    }
  };

  const countRemoteOK = jobs.filter((j) => getJobSource(j) === 'RemoteOK').length;
  const countHN = jobs.filter((j) => getJobSource(j) === 'Hacker News').length;
  const countJobspresso = jobs.filter((j) => getJobSource(j) === 'Jobspresso').length;

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      searchQuery === '' ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.requiredSkills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRemote = !remoteOnly || job.remoteOk;
    const matchesExp =
      expFilter === 'ALL' ||
      job.experienceLevel.toLowerCase().includes(expFilter.toLowerCase());

    const jobSource = getJobSource(job);
    const matchesSource =
      sourceFilter === 'ALL' ||
      jobSource === sourceFilter;

    return matchesSearch && matchesRemote && matchesExp && matchesSource;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Scraper Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Autonomous Web Ingestion & Scraper
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Extract, structure, and cache real live jobs from RemoteOK, Hacker News, Jobspresso & custom URLs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleScrapeAll}
              disabled={isScrapingActive}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              title="Scrape and cache live jobs from RemoteOK, Hacker News, and Jobspresso simultaneously"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScrapingActive ? 'animate-spin' : ''}`} />
              <span>{isScrapingActive ? 'Scraping Live...' : '⚡ Scrape All 3 Boards'}</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{jobs.length} Real Records in Cache</span>
            </div>
          </div>
        </div>

        {/* Scrape Input Form */}
        <form onSubmit={handleScrapeSubmit} className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              list="scraper-url-suggestions"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="Paste public job board URL or select from suggested boards below..."
              className="w-full pl-3.5 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
            {/* Native browser dropdown suggestion support */}
            <datalist id="scraper-url-suggestions">
              {SCRAPER_SUGGESTIONS.map((sug) => (
                <option key={sug.name} value={sug.url}>
                  {sug.name} - {sug.description}
                </option>
              ))}
            </datalist>
          </div>
          <button
            type="submit"
            disabled={isScrapingActive || !targetUrl.trim()}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isScrapingActive ? 'animate-spin' : ''}`} />
            <span>{isScrapingActive ? 'Scraping Live...' : 'Ingest URL'}</span>
          </button>
        </form>

        {/* Scraper Suggestions with 1-Click Fill & Instant Scrape */}
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Suggested Live Job Boards (Click card to autofill, or click Scrape):</span>
            </span>
            {targetUrl && (
              <button
                type="button"
                onClick={() => setTargetUrl('')}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
              >
                Clear URL
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SCRAPER_SUGGESTIONS.map((sug) => {
              const isActive = targetUrl === sug.url;
              return (
                <div
                  key={sug.name}
                  onClick={() => setTargetUrl(sug.url)}
                  className={`group p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'bg-blue-50 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-white hover:bg-slate-50 hover:border-blue-300 border-slate-200 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-2 text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sug.dotColor}`} />
                      {sug.name}
                    </span>
                    <button
                      type="button"
                      disabled={isScrapingActive}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetUrl(sug.url);
                        onScrape(sug.url);
                      }}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 transition shrink-0 cursor-pointer"
                    >
                      Scrape Live
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {sug.description}
                  </p>
                  <span className="text-[11px] font-mono text-blue-600/80 mt-1.5 truncate">
                    {sug.url}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col gap-3">
        {/* Source Pills Filter */}
        <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-500 mr-1.5">Filter Source:</span>
          {[
            { id: 'ALL', label: 'All Sources', count: jobs.length },
            { id: 'RemoteOK', label: 'RemoteOK', count: countRemoteOK },
            { id: 'Hacker News', label: 'Hacker News', count: countHN },
            { id: 'Jobspresso', label: 'Jobspresso', count: countJobspresso },
          ].map((src) => (
            <button
              key={src.id}
              type="button"
              onClick={() => setSourceFilter(src.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                sourceFilter === src.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>{src.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                sourceFilter === src.id ? 'bg-slate-700 text-white' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {src.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by role, company, or skills (e.g. TypeScript, React, Python)..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span>Remote Only</span>
            </label>

            <div className="flex items-center space-x-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={expFilter}
                onChange={(e) => setExpFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs outline-none focus:border-blue-500 font-medium"
              >
                <option value="ALL">All Levels</option>
                <option value="Senior">Senior</option>
                <option value="Mid">Mid Level</option>
                <option value="Internship">Internship / Entry</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">Loading live jobs from cache...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm font-semibold text-slate-800">No jobs match your filter criteria.</p>
          <p className="text-xs text-slate-500 mt-1">Click "⚡ Scrape All 3 Boards" above to refresh the live job cache.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => {
            const isShortlisted = shortlistJobIds.has(job.id);
            const sourceBadge = getSourceBadge(job);
            return (
              <div
                key={job.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition duration-200 p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Company, Remote Pill, Source Badge, Bookmark */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                          {decodeHtml(job.company)}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sourceBadge.bg}`}>
                          {sourceBadge.name}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug">
                        {decodeHtml(job.title)}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleShortlist(job)}
                      title={isShortlisted ? 'Remove from shortlist' : 'Save to shortlist'}
                      className={`p-2 rounded-lg border transition cursor-pointer ${
                        isShortlisted
                          ? 'bg-blue-50 border-blue-200 text-blue-600'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isShortlisted ? (
                        <BookmarkCheck className="w-4 h-4 fill-blue-600" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {job.location}
                    </span>

                    {job.remoteOk && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-medium text-[11px]">
                        Remote OK
                      </span>
                    )}

                    {job.stipend && (
                      <span className="flex items-center gap-0.5 text-slate-700 font-semibold">
                        <DollarSign className="w-3 h-3 text-slate-400" />
                        {job.stipend}
                      </span>
                    )}

                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium">
                      {job.experienceLevel}
                    </span>
                  </div>

                  {/* Skills Tags */}
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {job.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.8 bg-slate-100 text-slate-700 border border-slate-200/80 rounded-md text-[11px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer: Source URL Link */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-slate-400">
                    {job.deadline ? `Closes: ${job.deadline}` : 'Live Listing'}
                  </span>

                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium hover:underline"
                  >
                    <span>View on {sourceBadge.name}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
