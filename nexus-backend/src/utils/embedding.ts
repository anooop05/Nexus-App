import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

function getAIClient() {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
}

export async function generateTextEmbedding(text: string): Promise<number[] | null> {
    try {
        const ai = getAIClient();
        const response = await ai.models.embedContent({
            model: 'gemini-embedding-2',
            contents: text,
            config: {
                outputDimensionality: 768, // Standard vector size for matching with pgvector
            },
        });

        const vectorValues = response.embeddings?.[0]?.values;

        if (!vectorValues) {
            console.error('[Embedding Error] No vector values returned from model.');
            return null;
        }

        return vectorValues;
    } catch (error) {
        console.error('[Embedding API Error] Failed to generate embedding:', error);
        return null;
    }
};
