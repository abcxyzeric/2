
import { ai } from "./client";
import { dbService, VectorData } from "../db/indexedDB";
import { ChatMessage } from "../../types";

// Task 3.2: Vector Service Implementation

export const vectorService = {
    /**
     * Calculates Cosine Similarity between two vectors
     */
    cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    },

    /**
     * Generates embedding for a given text using gemini text-embedding-004
     */
    async getEmbedding(text: string): Promise<number[] | null> {
        try {
            if (!text || text.trim().length === 0) return null;
            
            const result = await ai.models.embedContent({
                model: 'text-embedding-004',
                contents: {
                    parts: [{ text }]
                }
            });
            return result.embeddings?.[0]?.values || null;
        } catch (error) {
            console.error("Error generating embedding:", error);
            return null;
        }
    },

    /**
     * Saves a message (user or model) to Vector DB with World ID Isolation
     */
    async saveVector(id: string, text: string, role: 'user' | 'model', worldId: string): Promise<void> {
        // Avoid re-saving if exists
        const exists = await dbService.hasVector(id);
        if (exists) return;

        if (!worldId) {
            console.warn("Cannot save vector without worldId");
            return;
        }

        const embedding = await this.getEmbedding(text);
        if (embedding) {
            const vectorData: VectorData = {
                id,
                worldId, // Isolate by World ID
                text,
                embedding,
                timestamp: Date.now(),
                role
            };
            await dbService.saveVector(vectorData);
            console.log(`[VectorService] Saved vector for message: ${id.substring(0, 8)}... (World: ${worldId})`);
        }
    },

    /**
     * Searches for semantically similar text from the vector database, FILTERED by worldId
     */
    async searchSimilarVectors(queryText: string, worldId: string, limit: number = 10): Promise<VectorData[]> {
        const queryEmbedding = await this.getEmbedding(queryText);
        if (!queryEmbedding) return [];

        const allVectors = await dbService.getAllVectors();
        
        // Strict Isolation: Only use vectors belonging to this worldId
        const worldVectors = allVectors.filter(v => v.worldId === worldId);

        // Calculate similarity for each vector
        const scoredVectors = worldVectors.map(vec => ({
            ...vec,
            score: this.cosineSimilarity(queryEmbedding, vec.embedding)
        }));

        // Sort by score descending and take top 'limit'
        // Filter out very low similarity to avoid noise (e.g. < 0.35)
        return scoredVectors
            .filter(v => v.score > 0.35) 
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    },

    /**
     * Task 3.4: Process old history and vectorize missing messages
     */
    async vectorizeAllHistory(history: ChatMessage[], worldId: string): Promise<void> {
        if (!worldId) {
            console.error("[VectorService] Cannot vectorize history without worldId");
            return;
        }
        
        console.log(`[VectorService] Starting batch vectorization for World: ${worldId}...`);
        let processedCount = 0;
        
        for (let i = 0; i < history.length; i++) {
            const msg = history[i];
            // Use timestamp as ID if no explicit ID exists in ChatMessage
            const msgId = `msg-${msg.timestamp}-${msg.role}`;
            
            const exists = await dbService.hasVector(msgId);
            if (!exists && msg.text) {
                // Rate limit protection: simple delay
                await new Promise(r => setTimeout(r, 200)); 
                await this.saveVector(msgId, msg.text, msg.role, worldId);
                processedCount++;
            }
        }
        console.log(`[VectorService] Batch vectorization complete. Processed ${processedCount} messages.`);
    }
};
