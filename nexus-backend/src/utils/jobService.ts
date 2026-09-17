import { normalizeJobText } from './llm';
import { generateTextEmbedding } from './embedding';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleScrapedItem(rawText: string, sourceUrl: string) {
    const normalizedJob = await normalizeJobText(rawText);

    if (!normalizedJob) {
        console.log('[Skipped] Could not extract valid job data from text.');
        return;
    }

    try {
        const savedJob = await prisma.job.upsert({
            where: {
                company_title_sourceUrl: {
                    company: normalizedJob.company,
                    title: normalizedJob.title,
                    sourceUrl: sourceUrl,
                },
            },
            update: {
                location: normalizedJob.location,
                remoteOk: normalizedJob.remote_ok,
                stipend: normalizedJob.stipend,
                requiredSkills: normalizedJob.required_skills,
                experienceLevel: normalizedJob.experience_level,
                deadline: normalizedJob.deadline,
                updatedAt: new Date(),
            },
            create: {
                title: normalizedJob.title,
                company: normalizedJob.company,
                location: normalizedJob.location,
                remoteOk: normalizedJob.remote_ok,
                stipend: normalizedJob.stipend,
                requiredSkills: normalizedJob.required_skills,
                experienceLevel: normalizedJob.experience_level,
                deadline: normalizedJob.deadline,
                sourceUrl: sourceUrl,
            },
        });

        // Generate and store 768-dim vector embedding for semantic matching
        try {
            const textToEmbed = `${normalizedJob.title} at ${normalizedJob.company}. Required skills: ${normalizedJob.required_skills.join(', ')}. Location: ${normalizedJob.location}. Level: ${normalizedJob.experience_level}.`;
            const embedding = await generateTextEmbedding(textToEmbed);
            if (embedding && embedding.length > 0) {
                const vectorString = `[${embedding.join(',')}]`;
                await prisma.$executeRawUnsafe(
                    `UPDATE jobs SET embedding = $1::vector WHERE id = $2`,
                    vectorString,
                    savedJob.id
                );
            }
        } catch (embedError) {
            console.warn('[Embedding Warning] Could not store embedding for job:', embedError);
        }

        console.log(`[Success] Saved real job with vector embedding: ${normalizedJob.title} at ${normalizedJob.company}`);
    } catch (error) {
        console.error('[DB Error] Failed to save job:', error);
    }
}