import { Router, Request, Response } from 'express';
import { runNexusScraper } from '../utils/scraper';
import { findMatchingJobsForResume } from '../utils/matching';
import { verifyAuthToken } from '../utils/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

import { 
  scrapeAllThreeSites, 
  scrapeRemoteOK, 
  scrapeHackerNews, 
  scrapeJobspresso, 
  cacheAndStoreJobs 
} from '../utils/jobScrapers';

export function enrichJobWithSource(job: any) {
  const url = (job.sourceUrl || '').toLowerCase();
  const comp = (job.company || '').toLowerCase();
  let source = 'Direct Web';
  if (url.includes('remoteok')) {
    source = 'RemoteOK';
  } else if (url.includes('jobspresso')) {
    source = 'Jobspresso';
  } else if (
    url.includes('ycombinator') ||
    url.includes('hackernews') ||
    comp.includes('(yc ') ||
    comp.includes('y combinator') ||
    url.includes('#hn')
  ) {
    source = 'Hacker News';
  }
  return {
    ...job,
    source,
  };
}

// GET /api/jobs - List all scraped jobs directly from the database cache
router.get('/', async (_req: Request, res: Response) => {
  try {
    let jobs = await prisma.job.findMany({
      orderBy: { scrapedAt: 'desc' },
      take: 60,
    });

    // If database has 0 jobs on first run, auto-populate live from all 3 target sources
    if (jobs.length === 0) {
      console.log('[Jobs Route] Database cache is empty. Auto-scraping from RemoteOK, Hacker News, and Jobspresso...');
      await scrapeAllThreeSites();
      jobs = await prisma.job.findMany({
        orderBy: { scrapedAt: 'desc' },
        take: 60,
      });
    }

    const enriched = (jobs || []).map(enrichJobWithSource);
    return res.json({ jobs: enriched });
  } catch (error: any) {
    console.error('[Jobs Route Error] Failed to fetch jobs:', error);
    return res.status(500).json({ error: error.message || 'Database query failed' });
  }
});

// POST /api/jobs/scrape/all - Trigger live scrape across RemoteOK, Hacker News, and Jobspresso
router.post('/scrape/all', async (_req: Request, res: Response) => {
  try {
    console.log('[API] Starting full scrape batch across all 3 platforms...');
    const result = await scrapeAllThreeSites();
    const updatedJobs = await prisma.job.findMany({
      orderBy: { scrapedAt: 'desc' },
      take: 60,
    });
    const enriched = (updatedJobs || []).map(enrichJobWithSource);
    return res.json({
      message: `Successfully scraped ${result.totalScraped} live jobs from RemoteOK, Hacker News, and Jobspresso!`,
      result,
      jobs: enriched,
    });
  } catch (error: any) {
    console.error('[API Error] Full scrape failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to scrape all sources.' });
  }
});

// POST /api/jobs/scrape - Scrape and structure jobs from target URL
router.post('/scrape', async (req: Request, res: Response) => {
  const { targetUrl } = req.body;
  if (!targetUrl) {
    return res.status(400).json({ error: 'targetUrl is required in request body.' });
  }

  const cleanUrl = targetUrl.toLowerCase().trim();

  try {
    console.log(`[API] Starting scrape job for: ${targetUrl}`);

    if (cleanUrl === 'all' || cleanUrl === 'all-sources') {
      const result = await scrapeAllThreeSites();
      return res.json({ message: `Successfully scraped ${result.totalScraped} live jobs from all 3 platforms!` });
    }

    if (cleanUrl.includes('remoteok')) {
      const items = await scrapeRemoteOK();
      const saved = await cacheAndStoreJobs(items);
      return res.json({ message: `Extracted and cached ${saved} live jobs from RemoteOK.` });
    }

    if (cleanUrl.includes('ycombinator') || cleanUrl.includes('hackernews') || cleanUrl.includes('hacker news')) {
      const items = await scrapeHackerNews();
      const saved = await cacheAndStoreJobs(items);
      return res.json({ message: `Extracted and cached ${saved} live jobs from Hacker News.` });
    }

    if (cleanUrl.includes('jobspresso')) {
      const items = await scrapeJobspresso();
      const saved = await cacheAndStoreJobs(items);
      return res.json({ message: `Extracted and cached ${saved} live jobs from Jobspresso.` });
    }

    // Default: use universal browser scraper for arbitrary custom URLs
    await runNexusScraper(targetUrl);
    return res.json({ message: 'Scraping and ingestion session completed successfully.' });
  } catch (error: any) {
    console.error('[API Error] Scraping failed:', error);
    return res.status(500).json({ error: error.message || 'Internal server error during scraping.' });
  }
});

// POST /api/jobs/match - Semantic resume matching
router.post('/match', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const userId = verifyAuthToken(authHeader);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or missing token.' });
  }

  const { resumeText } = req.body;
  if (!resumeText) {
    return res.status(400).json({ error: 'resumeText is required.' });
  }

  try {
    const matchedJobs = await findMatchingJobsForResume(resumeText);
    return res.json({ userId, matches: matchedJobs || [] });
  } catch (error: any) {
    console.error('[API Error] Semantic matching failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to process semantic search matching.' });
  }
});

// GET /api/jobs/shortlist - Get user saved jobs from database
router.get('/shortlist', async (req: Request, res: Response) => {
  const userId = verifyAuthToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Token required.' });
  }

  try {
    const shortlist = await prisma.shortlist.findMany({
      where: { userId },
      include: { job: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ shortlist: shortlist || [] });
  } catch (error: any) {
    console.error('[Shortlist Error] Failed to fetch shortlist:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve shortlist.' });
  }
});

// POST /api/jobs/shortlist - Save a job to user's shortlist in database
router.post('/shortlist', async (req: Request, res: Response) => {
  const userId = verifyAuthToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Token required.' });
  }

  const { jobId, matchScore, justification } = req.body;
  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required.' });
  }

  try {
    const saved = await prisma.shortlist.upsert({
      where: {
        userId_jobId: { userId, jobId },
      },
      update: {
        matchScore: Number(matchScore || 0),
        justification: justification || '',
      },
      create: {
        userId,
        jobId,
        matchScore: Number(matchScore || 0),
        justification: justification || '',
      },
      include: { job: true },
    });
    return res.json({ shortlist: saved });
  } catch (error: any) {
    console.error('[Shortlist Error] Failed to save shortlist:', error);
    return res.status(500).json({ error: error.message || 'Failed to save to shortlist.' });
  }
});

// DELETE /api/jobs/shortlist/:id - Remove job from user shortlist
router.delete('/shortlist/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = verifyAuthToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Token required.' });
  }

  try {
    await prisma.shortlist.deleteMany({
      where: { id: id as string, userId },
    });
    return res.json({ message: 'Removed from shortlist' });
  } catch (error: any) {
    console.error('[Shortlist Error] Failed to delete item:', error);
    return res.status(500).json({ error: error.message || 'Failed to remove from shortlist.' });
  }
});

export default router;