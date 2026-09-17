import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
function getAIClient() {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
}
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';


async function generateBriefingScript(userId: string): Promise<string> {

    const topMatches = await prisma.shortlist.findMany({
        where: { userId },
        include: { job: true },
        orderBy: { matchScore: 'desc' },
        take: 3,
    });

    if (topMatches.length === 0) {
        return "Hello! You currently have no saved job matches this week. Run a scrape and upload your resume to get started.";
    }

    const jobSummaries = topMatches.map((m: any, i: any) =>
        `Match ${i + 1}: ${m.job.title} at ${m.job.company}. Location: ${m.job.location}. Match justification: ${m.justification}`
    ).join('\n');

    const prompt = `
    You are an AI career intelligence agent for Nexus. Write a script for a 60 to 90-second video briefing speaking directly to the candidate.
    Summarize their top matches for the week based on the following details:
    ${jobSummaries}

    Keep the tone professional, encouraging, and clear. Do not include markdown formatting or visual cues, just output the spoken script text.
  `;

    const ai = getAIClient();
    const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
    });

    return response.text || "Here is your weekly job match briefing.";
}


async function triggerAsyncVideoGeneration(scriptText: string): Promise<string | null> {
    try {
        const response = await fetch('https://api.heygen.com/v3/video-agents', {
            method: 'POST',
            headers: {
                'X-Api-Key': HEYGEN_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: `Present this career briefing script naturally as an avatar: ${scriptText}`,
            }),
        });

        const data = await response.json();
        // Returns the session/job ID to poll later asynchronously
        return data?.data?.session_id || null;
    } catch (error) {
        console.error('[Video API Error] Failed to start async generation job:', error);
        return null;
    }
}

export async function createVideoBriefing(userId: string) {
    // Step 1: LLM writes the script
    const script = await generateBriefingScript(userId);

    const briefing = await prisma.briefing.create({
        data: {
            userId,
            script,
            status: 'PENDING',
        },
    });

    // Step 3: Trigger external async job
    const externalJobSessionId = await triggerAsyncVideoGeneration(script);

    if (!externalJobSessionId) {
        await prisma.briefing.update({
            where: { id: briefing.id },
            data: { status: 'FAILED' },
        });
        throw new Error('Failed to initiate asynchronous video generation.');
    }

    // Background worker loop or webhook would typically poll and update videoUrl once complete.
    return {
        briefingId: briefing.id,
        status: 'PENDING',
        message: 'Briefing script generated and video rendering task queued successfully.',
    };
}