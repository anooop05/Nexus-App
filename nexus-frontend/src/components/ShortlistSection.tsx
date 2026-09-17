import { 
  BookmarkCheck, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  DollarSign, 
  Calendar, 
  Video,
  ArrowRight
} from 'lucide-react';
import { type ShortlistItem } from '../services/api';

interface ShortlistSectionProps {
  shortlist: ShortlistItem[];
  onRemove: (id: string) => void;
  onGoToBriefing: () => void;
  onGoToJobs: () => void;
}

export default function ShortlistSection({
  shortlist,
  onRemove,
  onGoToBriefing,
  onGoToJobs,
}: ShortlistSectionProps) {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-blue-600" />
            My Saved Shortlist ({shortlist.length} Roles)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Curated roles saved for your application cycle and weekly intelligence briefings.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToBriefing}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition"
        >
          <Video className="w-4 h-4" />
          <span>Generate Briefing Script</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Shortlist Items */}
      {shortlist.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <BookmarkCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Your shortlist is empty</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Browse ingested jobs or run the semantic resume matcher to bookmark roles you'd like to track.
          </p>
          <button
            type="button"
            onClick={onGoToJobs}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            Explore Jobs & Ingest
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {shortlist.map((item) => {
            const job = item.job;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-5 shadow-xs transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
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
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {job.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {(item.matchScore || job.matchScore) ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
                          {Math.round((item.matchScore || job.matchScore || 0) * 100)}% Fit
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Remove from shortlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Justification */}
                  {(item.justification || job.justification) && (
                    <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-700 font-medium">
                        {item.justification || job.justification}
                      </p>
                    </div>
                  )}

                  {/* Metadata & Skills */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    {job.stipend && (
                      <span className="flex items-center gap-0.5 font-semibold text-slate-800">
                        <DollarSign className="w-3 h-3 text-slate-400" />
                        {job.stipend}
                      </span>
                    )}
                    {job.deadline && (
                      <span className="flex items-center gap-1 text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                        <Calendar className="w-3.5 h-3.5" />
                        Deadline: {job.deadline}
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {job.requiredSkills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer link */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                  >
                    <span>Go to Application Page</span>
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
