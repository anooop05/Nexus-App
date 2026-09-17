import { PrismaClient } from '@prisma/client';
import { generateTextEmbedding } from './embedding'
const prisma = new PrismaClient();


export async function findMatchingJobsForResume(resumeText: string) {
    const resumeVector = await generateTextEmbedding(resumeText);
    if (!resumeVector) {
        throw new Error('Failed to generate embedding for the resume.');
    }

    const vectorString = `[${resumeVector.join(',')}]`;

    try {
        const rankedJobs = await prisma.$queryRaw`
      SELECT 
        id, 
        title, 
        company, 
        location, 
        stipend, 
        "requiredSkills", 
        "sourceUrl",
        1 - (embedding <=> ${vectorString}::vector) AS match_score
      FROM jobs
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorString}::vector ASC
      LIMIT 10;
    `;

        return rankedJobs;
    } catch (error) {
        console.error('[Semantic Search Error] Database query failed:', error);
        throw error;
    }
};