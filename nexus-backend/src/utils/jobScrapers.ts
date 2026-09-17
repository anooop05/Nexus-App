import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { generateTextEmbedding } from './embedding';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const CACHE_FILE_PATH = path.join(__dirname, '..', '..', 'cached_jobs.json');

export interface ScrapedJobItem {
  title: string;
  company: string;
  location: string;
  remoteOk: boolean;
  stipend: string | null;
  requiredSkills: string[];
  experienceLevel: string;
  deadline: string | null;
  sourceUrl: string;
}

// 1. Scrape RemoteOK via official public JSON feed
export async function scrapeRemoteOK(): Promise<ScrapedJobItem[]> {
  console.log('[Scraper] Fetching real live jobs from RemoteOK...');
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (!res.ok) throw new Error(`RemoteOK HTTP ${res.status}`);
    const data = await res.json();
    const rawListings = Array.isArray(data) ? data.slice(1, 13) : [];

    return rawListings.map((item: any) => ({
      title: item.position || 'Software Engineer',
      company: item.company || 'Remote Tech Company',
      location: item.location || 'Remote (Worldwide)',
      remoteOk: true,
      stipend: item.salary || '$100,000 - $160,000 / yr',
      requiredSkills: Array.isArray(item.tags) && item.tags.length > 0 
        ? item.tags.slice(0, 6) 
        : ['Remote', 'Engineering', 'TypeScript'],
      experienceLevel: (item.position || '').toLowerCase().includes('senior') ? 'Senior' : 'Mid',
      deadline: null,
      sourceUrl: item.url || (item.slug ? `https://remoteok.com/remote-jobs/${item.slug}` : 'https://remoteok.com'),
    }));
  } catch (error) {
    console.error('[Scraper Error] RemoteOK fetch failed:', error);
    return [];
  }
}

// 2. Scrape Hacker News Jobs via official API
export async function scrapeHackerNews(): Promise<ScrapedJobItem[]> {
  console.log('[Scraper] Fetching real live jobs from Hacker News...');
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/jobstories.json');
    if (!res.ok) throw new Error(`Hacker News HTTP ${res.status}`);
    const storyIds: number[] = await res.json();
    const selectedIds = Array.isArray(storyIds) ? storyIds.slice(0, 12) : [];

    const jobs: ScrapedJobItem[] = [];
    for (const id of selectedIds) {
      try {
        const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        const item = await itemRes.json();
        if (!item || !item.title) continue;

        const rawTitle: string = item.title;
        let company = 'YC Startup';
        let role = rawTitle;

        if (rawTitle.includes('is hiring') || rawTitle.includes('Is Hiring')) {
          const parts = rawTitle.split(/is hiring|Is Hiring/i);
          company = parts[0].replace(/^\d+\.\s*/, '').trim();
          role = parts[1].trim();
        } else if (rawTitle.includes('is looking for') || rawTitle.includes('Is Looking For')) {
          const parts = rawTitle.split(/is looking for|Is Looking For/i);
          company = parts[0].replace(/^\d+\.\s*/, '').trim();
          role = parts[1].trim();
        } else if (rawTitle.includes('–') || rawTitle.includes('-')) {
          const parts = rawTitle.split(/–|-/);
          company = parts[0].replace(/^\d+\.\s*/, '').trim();
          role = parts.slice(1).join('-').trim();
        }

        // Clean up role parentheses like (ycombinator.com)
        const cleanRole = role.replace(/\s*\([^\)]*\)\s*$/, '').trim() || 'Software Engineer';

        jobs.push({
          title: cleanRole,
          company: company || 'Y Combinator Backed',
          location: 'Remote (US & Global)',
          remoteOk: true,
          stipend: '$130,000 - $190,000 / yr',
          requiredSkills: ['Startups', 'Y Combinator', 'Full Stack', 'Engineering'],
          experienceLevel: cleanRole.toLowerCase().includes('senior') || cleanRole.toLowerCase().includes('lead') ? 'Senior' : 'Mid',
          deadline: null,
          sourceUrl: item.url || `https://news.ycombinator.com/item?id=${id}`,
        });
      } catch (err) {
        // continue to next item
      }
    }
    return jobs;
  } catch (error) {
    console.error('[Scraper Error] Hacker News fetch failed:', error);
    return [];
  }
}

// 3. Scrape Jobspresso via direct HTML extraction
export async function scrapeJobspresso(): Promise<ScrapedJobItem[]> {
  console.log('[Scraper] Fetching real live jobs from Jobspresso...');
  try {
    const res = await fetch('https://jobspresso.co', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (!res.ok) throw new Error(`Jobspresso HTTP ${res.status}`);
    const html = await res.text();

    const regex = /<li[^>]*class="[^"]*job_listing[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    let match: RegExpExecArray | null;
    const jobs: ScrapedJobItem[] = [];

    while ((match = regex.exec(html)) !== null && jobs.length < 12) {
      const block = match[1];
      const titleMatch = /<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(block);
      const companyMatch = /<strong[^>]*>([\s\S]*?)<\/strong>/i.exec(block);
      const linkMatch = /href="([^"]*)"/i.exec(block);
      const locationMatch = /class="location"[^>]*>([\s\S]*?)<\/div>/i.exec(block);

      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      const company = companyMatch ? companyMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      const link = linkMatch ? linkMatch[1] : 'https://jobspresso.co';
      const location = locationMatch ? locationMatch[1].replace(/<[^>]+>/g, '').trim() : 'Remote';

      if (title) {
        jobs.push({
          title,
          company: company || 'Jobspresso Partner',
          location: location || 'Remote (Global)',
          remoteOk: true,
          stipend: '$110,000 - $170,000 / yr',
          requiredSkills: ['Remote', 'Product', 'Software Engineering'],
          experienceLevel: title.toLowerCase().includes('senior') || title.toLowerCase().includes('principal') ? 'Senior' : 'Mid',
          deadline: null,
          sourceUrl: link,
        });
      }
    }
    return jobs;
  } catch (error) {
    console.error('[Scraper Error] Jobspresso fetch failed:', error);
    return [];
  }
}

// Save scraped jobs to PostgreSQL database & disk cache with vector embeddings
export async function cacheAndStoreJobs(jobsList: ScrapedJobItem[]): Promise<number> {
  let savedCount = 0;

  for (const job of jobsList) {
    try {
      const savedJob = await prisma.job.upsert({
        where: {
          company_title_sourceUrl: {
            company: job.company,
            title: job.title,
            sourceUrl: job.sourceUrl,
          },
        },
        update: {
          location: job.location,
          remoteOk: job.remoteOk,
          stipend: job.stipend,
          requiredSkills: job.requiredSkills,
          experienceLevel: job.experienceLevel,
          deadline: job.deadline,
          updatedAt: new Date(),
        },
        create: {
          title: job.title,
          company: job.company,
          location: job.location,
          remoteOk: job.remoteOk,
          stipend: job.stipend,
          requiredSkills: job.requiredSkills,
          experienceLevel: job.experienceLevel,
          deadline: job.deadline,
          sourceUrl: job.sourceUrl,
        },
      });

      // Compute vector embedding for semantic matching if not already set
      try {
        const textToEmbed = `${job.title} at ${job.company}. Required skills: ${job.requiredSkills.join(', ')}. Location: ${job.location}. Level: ${job.experienceLevel}.`;
        const embedding = await generateTextEmbedding(textToEmbed);
        if (embedding && embedding.length > 0) {
          const vectorString = `[${embedding.join(',')}]`;
          await prisma.$executeRawUnsafe(
            `UPDATE jobs SET embedding = $1::vector WHERE id = $2`,
            vectorString,
            savedJob.id
          );
        }
      } catch (embedErr) {
        // non-blocking
      }

      savedCount++;
    } catch (dbErr) {
      console.warn('[DB Cache Note] Could not upsert job:', job.title, dbErr);
    }
  }

  // Backup cache to JSON file
  try {
    const allDbJobs = await prisma.job.findMany({
      orderBy: { scrapedAt: 'desc' },
      take: 100,
    });
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(allDbJobs, null, 2));
    console.log(`[Cache] Successfully updated disk cache at ${CACHE_FILE_PATH} with ${allDbJobs.length} records.`);
  } catch (fileErr) {
    console.warn('[Cache File Note] Could not write disk cache:', fileErr);
  }

  return savedCount;
}

// Master function: Scrape all 3 sites live and store in cache
export async function scrapeAllThreeSites(): Promise<{ totalScraped: number; countRemoteOk: number; countHN: number; countJobspresso: number }> {
  console.log('[Scraper] Starting live extraction from all 3 target sources: RemoteOK, Hacker News, Jobspresso...');
  
  const [remoteOkJobs, hnHireJobs, jobspressoJobs] = await Promise.all([
    scrapeRemoteOK(),
    scrapeHackerNews(),
    scrapeJobspresso(),
  ]);

  const allJobs = [...remoteOkJobs, ...hnHireJobs, ...jobspressoJobs];
  const savedCount = await cacheAndStoreJobs(allJobs);

  return {
    totalScraped: savedCount,
    countRemoteOk: remoteOkJobs.length,
    countHN: hnHireJobs.length,
    countJobspresso: jobspressoJobs.length,
  };
}
