// Safe browser storage helper for persistence across tab navigation and refreshes

export const storageKeys = {
  ACTIVE_TAB: 'nexus_active_tab',
  CACHED_JOBS: 'nexus_cached_jobs',
  RESUME_TEXT: 'nexus_resume_text',
  MATCHED_RESULTS: 'nexus_matched_results',
  AGENT_MESSAGES: 'nexus_agent_messages',
  BRIEFINGS: 'nexus_briefings',
  ACTIVE_BRIEFING: 'nexus_active_briefing',
  SHORTLIST: 'nexus_shortlist',
  JOB_FILTERS: 'nexus_job_filters',
} as const;

export const browserStorage = {
  get<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback;
      return JSON.parse(item) as T;
    } catch {
      return fallback;
    }
  },

  getString(key: string, fallback: string = ''): string {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? item : fallback;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn(`[browserStorage] Failed to write key ${key} to localStorage:`, e);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[browserStorage] Failed to remove key ${key} from localStorage:`, e);
    }
  },
};
