import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
function getAIClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
}

// 1. Tool 1: Get roles closing soon or within a certain timeframe
async function getRolesClosingSoon(userId: string) {
  return await prisma.shortlist.findMany({
    where: { userId },
    include: {
      job: {
        select: { title: true, company: true, deadline: true, location: true },
      },
    },
    take: 5,
  });
}

// 2. Tool 2: Find most frequent skills required across matches[cite: 1]
async function getTopRequiredSkills(userId: string) {
  const shortlists = await prisma.shortlist.findMany({
    where: { userId },
    include: { job: { select: { requiredSkills: true } } },
  });

  const skillCounts: Record<string, number> = {};
  for (const item of shortlists) {
    for (const skill of item.job.requiredSkills) {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    }
  }

  return Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([skill, count]) => ({ skill, count }));
}

// 3. Tool 3: Get user's top matches filtered by minimum match score[cite: 1]
async function getTopMatchesByScore(userId: string, minScore: number = 0.7) {
  return await prisma.shortlist.findMany({
    where: {
      userId,
      matchScore: { gte: minScore },
    },
    include: {
      job: {
        select: { title: true, company: true, stipend: true, location: true },
      },
    },
    orderBy: { matchScore: 'desc' },
    take: 5,
  });
}

// Tool Declarations for Gemini Tool Calling[cite: 1]
const tools: FunctionDeclaration[] = [
  {
    name: 'getRolesClosingSoon',
    description: 'Retrieves saved job roles with upcoming deadlines for the user[cite: 1].',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'getTopRequiredSkills',
    description: 'Finds the most frequently required skills across the user matched jobs[cite: 1].',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'getTopMatchesByScore',
    description: 'Retrieves top job matches that meet a minimum similarity score threshold[cite: 1].',
    parameters: {
      type: Type.OBJECT,
      properties: {
        minScore: {
          type: Type.NUMBER,
          description: 'Minimum match score threshold between 0.0 and 1.0 (defaults to 0.7)',
        },
      },
    },
  },
];

// Agent Chat Handler with Tool Calling Loop[cite: 1]
export async function chatWithAgent(userId: string, userMessage: string): Promise<string> {
  const model = 'gemini-3.8-flash';
  const ai = getAIClient();

  const response = await ai.models.generateContent({
    model,
    contents: userMessage,
    config: {
      tools: [{ functionDeclarations: tools }],
      systemInstruction: 'You are Nexus Agent, an autonomous career assistant. Answer user questions about their saved jobs by using the provided database tools[cite: 1]. Do not make up database information[cite: 1].',
    },
  });

  const functionCalls = response.functionCalls;

  // If Gemini does not call a tool, return the direct text response
  if (!functionCalls || functionCalls.length === 0) {
    return response.text || 'I could not process your query.';
  }

  // Execute the requested tool against the database[cite: 1]
  const call = functionCalls[0];
  let toolResult: any;

  if (call.name === 'getRolesClosingSoon') {
    toolResult = await getRolesClosingSoon(userId);
  } else if (call.name === 'getTopRequiredSkills') {
    toolResult = await getTopRequiredSkills(userId);
  } else if (call.name === 'getTopMatchesByScore') {
    const minScore = (call.args as any)?.minScore ?? 0.7;
    toolResult = await getTopMatchesByScore(userId, minScore);
  }

  // Send tool output back to the model to formulate the final answer[cite: 1]
  const finalResponse = await ai.models.generateContent({
    model,
    contents: [
      { role: 'user', parts: [{ text: userMessage }] },
      { role: 'model', parts: [{ functionCall: call }] },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: call.name,
              response: { result: toolResult },
            },
          },
        ],
      },
    ],
  });

  return finalResponse.text || 'Unable to generate answer from database results.';
}