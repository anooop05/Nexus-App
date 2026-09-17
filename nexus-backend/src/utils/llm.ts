import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI, Type } from "@google/genai";

function getAIClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
}

const JobNormalizationSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    company: { type: Type.STRING },
    location: { type: Type.STRING },
    remote_ok: { type: Type.BOOLEAN },
    stipend: { type: Type.STRING, nullable: true },
    required_skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    experience_level: { type: Type.STRING },
    deadline: { type: Type.STRING, nullable: true },
  },
  required: [
    "title",
    "company",
    "location",
    "remote_ok",
    "required_skills",
    "experience_level",
  ],
};

export interface NormalizedJob {
  title: string;
  company: string;
  location: string;
  remote_ok: boolean;
  stipend: string | null;
  required_skills: string[];
  experience_level: string;
  deadline: string | null;
}

export async function normalizeJobText(rawText: string): Promise<NormalizedJob | null> {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Extract the job or internship role from this raw webpage dump. If the text does not contain a job posting, fill fields conservatively:\n\n${rawText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: JobNormalizationSchema,
        temperature: 0.1, // keeps randomness near 0, minimize hallucintaions
      },
    });

    if (!response.text) return null;
    return JSON.parse(response.text) as NormalizedJob;
  } catch (error) {
    console.error("[LLM Error] Failed to parse content:", error);
    return null;
  }
}