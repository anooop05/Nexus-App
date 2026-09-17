import { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Bookmark, 
  BookmarkCheck, 
  UploadCloud, 
  FileCheck, 
  AlertCircle 
} from 'lucide-react';
import { api, type Job } from '../services/api';
import { browserStorage, storageKeys } from '../services/storage';

interface ResumeMatcherProps {
  onMatch: (resumeText: string) => Promise<Job[]>;
  onToggleShortlist: (job: Job) => void;
  shortlistJobIds: Set<string>;
  onTaskChange?: (msg: string | null) => void;
}

export default function ResumeMatcher({
  onMatch,
  onToggleShortlist,
  shortlistJobIds,
  onTaskChange,
}: ResumeMatcherProps) {
  const [resumeText, setResumeTextState] = useState<string>(() =>
    browserStorage.getString(storageKeys.RESUME_TEXT, '')
  );
  const [matching, setMatching] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [matchedResults, setMatchedResultsState] = useState<Job[] | null>(() =>
    browserStorage.get<Job[] | null>(storageKeys.MATCHED_RESULTS, null)
  );
  const [error, setError] = useState<string | null>(null);

  const setResumeText = (val: string) => {
    setResumeTextState(val);
    browserStorage.set(storageKeys.RESUME_TEXT, val);
  };

  const setMatchedResults = (val: Job[] | null) => {
    setMatchedResultsState(val);
    browserStorage.set(storageKeys.MATCHED_RESULTS, val);
  };

  const handleClear = () => {
    setResumeText('');
    setMatchedResults(null);
    browserStorage.remove(storageKeys.RESUME_TEXT);
    browserStorage.remove(storageKeys.MATCHED_RESULTS);
    setError(null);
  };

  const handleRunMatch = async () => {
    if (!resumeText.trim()) {
      setError('Please paste or upload resume text to run semantic search.');
      return;
    }
    setError(null);
    setMatching(true);
    onTaskChange?.('Computing semantic match & LLM justifications in background...');
    try {
      const results = await onMatch(resumeText.trim());
      setMatchedResults(results);
    } catch (err: any) {
      setError(err.message || 'Matching process failed');
    } finally {
      setMatching(false);
      onTaskChange?.(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // If PDF, upload to backend to extract text natively via pdf-parse
    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      setUploadingPdf(true);
      try {
        const res = await api.uploadResumePdf(file);
        if (res.text) {
          setResumeText(res.text);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to extract text from PDF resume.');
      } finally {
        setUploadingPdf(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setResumeText(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Semantic Resume Matcher
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Computes vector cosine similarity between your resume and ingested roles, complete with LLM-generated justifications.
            </p>
          </div>
          <span className="self-start sm:self-auto px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
            PGVector & Cosine Similarity
          </span>
        </div>

        {/* Resume Input Area */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Candidate Resume / Background Text
            </label>
            <label className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline cursor-pointer">
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{uploadingPdf ? 'Extracting PDF...' : 'Upload PDF / TXT'}</span>
              <input
                type="file"
                accept=".pdf,.txt,.md,.json"
                onChange={handleFileUpload}
                disabled={uploadingPdf}
                className="hidden"
              />
            </label>
          </div>
          <textarea
            rows={5}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your skills, past experiences, and engineering background here..."
            className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition resize-y font-mono"
          />
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {resumeText.trim().split(/\s+/).filter(Boolean).length} words
            </span>
            {(resumeText || matchedResults) && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-slate-500 hover:text-rose-600 underline font-medium cursor-pointer"
              >
                Clear Resume & Matches
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleRunMatch}
            disabled={matching || !resumeText.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm rounded-xl shadow-xs transition cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 ${matching ? 'animate-spin' : ''}`} />
            <span>{matching ? 'Calculating Cosine Distance...' : 'Run Semantic Match'}</span>
          </button>
        </div>
      </div>

      {/* Results Section */}
      {matchedResults && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Ranked Matches ({matchedResults.length} Roles Found)
            </h3>
            <span className="text-xs text-slate-500">
              Ranked by similarity score (high to low)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {matchedResults.map((job, idx) => {
              const scorePercent = Math.round(((job.matchScore || job.match_score || 0.75)) * 100);
              const isShortlisted = shortlistJobIds.has(job.id);

              return (
                <div
                  key={job.id || idx}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600 uppercase">
                          {job.company}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">{job.location}</span>
                        {job.remoteOk && (
                          <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold">
                            Remote
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5">
                        {job.title}
                      </h4>
                    </div>

                    {/* Match Score Badge */}
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-medium">Match</span>
                          <span className={`text-base font-black ${
                            scorePercent >= 85 ? 'text-emerald-600' : scorePercent >= 70 ? 'text-blue-600' : 'text-slate-600'
                          }`}>
                            {scorePercent}%
                          </span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              scorePercent >= 85 ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${scorePercent}%` }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleShortlist(job)}
                        className={`p-2 rounded-lg border transition ${
                          isShortlisted
                            ? 'bg-blue-50 border-blue-200 text-blue-600'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                        }`}
                        title={isShortlisted ? 'Saved in shortlist' : 'Save to shortlist'}
                      >
                        {isShortlisted ? (
                          <BookmarkCheck className="w-4 h-4 fill-blue-600" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* LLM Justification Pill */}
                  {job.justification && (
                    <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        <span className="font-semibold text-slate-900">LLM Match Reason: </span>
                        {job.justification}
                      </p>
                    </div>
                  )}

                  {/* Skills tags */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-medium mr-1">Required Skills:</span>
                    {job.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
