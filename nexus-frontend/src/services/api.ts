export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remoteOk: boolean;
  stipend?: string;
  requiredSkills: string[];
  experienceLevel: string;
  deadline?: string;
  sourceUrl: string;
  source?: string;
  scrapedAt?: string;
  matchScore?: number;
  match_score?: number;
  justification?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Briefing {
  id: string;
  userId?: string;
  status: 'PENDING' | 'DONE' | 'FAILED';
  script: string;
  videoUrl?: string;
  createdAt?: string;
}

export interface ShortlistItem {
  id: string;
  userId?: string;
  job: Job;
  matchScore: number;
  justification?: string;
  createdAt: string;
}

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('nexus_token');
  if (token) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }
  return {
    'Content-Type': 'application/json',
  };
}

export const api = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === 'online';
    } catch {
      return false;
    }
  },

  //Auth Endpoints
  async register(email: string, pass: string): Promise<{ token?: string; user?: User; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('nexus_token', data.token);
        localStorage.setItem('nexus_user', JSON.stringify(data.user));
      }
      return data;
    } catch (err: any) {
      return { error: err.message || 'Registration failed' };
    }
  },

  async login(email: string, pass: string): Promise<{ token?: string; user?: User; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('nexus_token', data.token);
        localStorage.setItem('nexus_user', JSON.stringify(data.user));
      }
      return data;
    } catch (err: any) {
      return { error: err.message || 'Login failed' };
    }
  },

  logout() {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
  },

  getCurrentUser(): User | null {
    try {
      const raw = localStorage.getItem('nexus_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  // --- Jobs & Scraper Endpoints ---
  async getJobs(): Promise<Job[]> {
    try {
      const res = await fetch(`${API_BASE}/jobs`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error('Failed to load jobs');
      const data = await res.json();
      return data.jobs || [];
    } catch (err) {
      console.warn('Jobs fetch fallback:', err);
      return [];
    }
  },

  async scrapeUrl(targetUrl: string): Promise<{ message: string; job?: Job }> {
    const res = await fetch(`${API_BASE}/jobs/scrape`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ targetUrl }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Scraping operation failed.');
    }
    return res.json();
  },

  async scrapeAllSources(): Promise<{ message: string; jobs?: Job[] }> {
    const res = await fetch(`${API_BASE}/jobs/scrape/all`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Scraping all sources failed.');
    }
    return res.json();
  },

  async uploadResumePdf(file: File): Promise<{ text: string; numPages?: number }> {
    const formData = new FormData();
    formData.append('resume', file);

    const token = localStorage.getItem('nexus_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/resume/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload and extract PDF resume.');
    }

    return res.json();
  },

  async matchResume(resumeText: string): Promise<Job[]> {
    const res = await fetch(`${API_BASE}/jobs/match`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ resumeText }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Semantic resume matching failed.');
    }
    const data = await res.json();
    return data.matches || [];
  },

  // --- Shortlist Endpoints ---
  async getShortlist(): Promise<ShortlistItem[]> {
    try {
      const res = await fetch(`${API_BASE}/jobs/shortlist`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      return data.shortlist || [];
    } catch {
      return [];
    }
  },

  async saveToShortlist(job: Job, matchScore: number = 0.88, justification?: string): Promise<ShortlistItem> {
    const res = await fetch(`${API_BASE}/jobs/shortlist`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        jobId: job.id,
        job,
        matchScore,
        justification: justification || job.justification || 'Direct fit with candidate skills',
      }),
    });
    const data = await res.json();
    return data.shortlist;
  },

  async removeFromShortlist(id: string): Promise<void> {
    await fetch(`${API_BASE}/jobs/shortlist/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },

  // --- Agent Chat ---
  async chatWithAgent(message: string): Promise<string> {
    const res = await fetch(`${API_BASE}/agent/chat`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Agent request failed.');
    }
    const data = await res.json();
    return data.reply;
  },

  // --- Briefings ---
  async generateBriefing(): Promise<Briefing> {
    const res = await fetch(`${API_BASE}/briefings`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error('Could not initiate briefing generation.');
    }
    return res.json();
  },

  async getBriefings(): Promise<Briefing[]> {
    try {
      const res = await fetch(`${API_BASE}/briefings`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      return data.briefings || [];
    } catch {
      return [];
    }
  },
};
