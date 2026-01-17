
import { AppSettings, ChatMessage, WorldData, TawaPresetConfig } from "../../../types";
import { buildGameplaySystemPrompt } from "./prompts";
import { DEFAULT_PRESET_CONFIG } from "../../../constants/tawa_modules";
import { ai } from "../client";
import { GenerateContentResponse } from "@google/genai";
import { vectorService } from "../vectorService";

// Map thinking levels to token counts
const THINKING_BUDGET_MAP = {
    'auto': 0,
    'low': 4096,
    'medium': 16384,
    'high': 32768
};

// Task 3.3 Step 2: History Slicing Constant
const MAX_HISTORY_CONTEXT = 200;

export const gameplayAiService = {
  // --- GAMEPLAY STORY GENERATION (With Tawa Protocol) ---

  async generateStoryTurn(
    input: string, 
    history: ChatMessage[], 
    worldData: WorldData, 
    settings: AppSettings,
    presetConfig?: TawaPresetConfig 
  ): Promise<string> {
    try {
        const currentTurn = Math.floor(history.length / 2) + 1;
        
        // Task 3.3 Step 1: Vector Search (RAG)
        // Find relevant memories from the distant past
        const similarVectors = await vectorService.searchSimilarVectors(input, 5);
        const relevantMemories = similarVectors
            .map(v => `[${new Date(v.timestamp).toLocaleString()}] ${v.role === 'user' ? 'User' : 'AI'}: ${v.text}`)
            .join('\n\n');

        // Task 3.3 Step 2: Slice History
        // Keep only the last 200 messages for immediate context to save tokens
        const slicedHistory = history.slice(-MAX_HISTORY_CONTEXT);

        // Use provided config or fallback to default
        const activeConfig = presetConfig || DEFAULT_PRESET_CONFIG;

        const systemInstruction = buildGameplaySystemPrompt(
          worldData.world,
          worldData.player,
          worldData.entities,
          relevantMemories, // Task 3.3 Step 3: Inject Memories
          currentTurn,
          activeConfig, 
          worldData.config,
          input 
        );

        // 2. Prepare Config (High Creativity for Tawa)
        const thinkingBudget = THINKING_BUDGET_MAP[settings.thinkingBudgetLevel] || 0;
        
        const generationConfig: any = {
            temperature: settings.temperature,
            topK: settings.topK,
            topP: settings.topP,
            maxOutputTokens: settings.maxOutputTokens,
        };

        if (thinkingBudget > 0 && settings.aiModel.includes('pro')) {
             generationConfig.thinkingConfig = { thinkingBudget };
        }

        // 3. Prepare Contents (Using sliced history)
        const contents = slicedHistory.map(msg => {
            let text = msg.text;
            if (msg.role === 'user' && !text.includes('<user_input>')) {
                text = `<user_input>${text}</user_input>`;
            }
            return {
                role: msg.role,
                parts: [{ text: text }]
            };
        });

        contents.push({
            role: 'user',
            parts: [{ text: `<user_input>${input}</user_input>` }]
        });

        // 4. Assistant Prefill Logic
        const prefillModule = activeConfig.modules.find(m => m.id === 'sys_prefill_trigger');
        const prefillContent = (prefillModule && prefillModule.isActive) ? prefillModule.content : '';

        if (prefillContent) {
            contents.push({
                role: 'model',
                parts: [{ text: prefillContent }]
            });
        }

        // 5. Call AI
        const response = await ai.models.generateContent({
            model: settings.aiModel,
            contents: contents,
            config: {
                ...generationConfig,
                systemInstruction: systemInstruction
            }
        });

        let fullResponse = response.text || "";

        if (prefillContent) {
            fullResponse = prefillContent + fullResponse;
        }

        // Task 3.3 Step 4: Save Vectors Async (Fire and forget)
        (async () => {
             const userMsgId = `msg-${Date.now()}-user`;
             const aiMsgId = `msg-${Date.now() + 1}-model`;
             await vectorService.saveVector(userMsgId, input, 'user');
             if (fullResponse) {
                 await vectorService.saveVector(aiMsgId, fullResponse, 'model');
             }
        })();

        return fullResponse || "Hệ thống không phản hồi. Vui lòng thử lại.";

    } catch (error) {
        console.error("Generate Story Error:", error);
        return `<span style="color: #ef4444;">[LỖI HỆ THỐNG: Không thể kết nối với AI Server. Chi tiết: ${error instanceof Error ? error.message : String(error)}]</span>`;
    }
  },

  // --- STREAMING STORY GENERATION ---
  async *generateStoryTurnStream(
    input: string, 
    history: ChatMessage[], 
    worldData: WorldData, 
    settings: AppSettings,
    presetConfig?: TawaPresetConfig
  ): AsyncGenerator<string, void, unknown> {
    try {
        const currentTurn = Math.floor(history.length / 2) + 1;
        const activeConfig = presetConfig || DEFAULT_PRESET_CONFIG;

        // Task 3.3 Step 1: Vector Search (RAG)
        const similarVectors = await vectorService.searchSimilarVectors(input, 5);
        const relevantMemories = similarVectors
            .map(v => `[${new Date(v.timestamp).toLocaleString()}] ${v.role === 'user' ? 'User' : 'AI'}: ${v.text}`)
            .join('\n\n');

        // Task 3.3 Step 2: Slice History
        const slicedHistory = history.slice(-MAX_HISTORY_CONTEXT);

        const systemInstruction = buildGameplaySystemPrompt(
          worldData.world,
          worldData.player,
          worldData.entities,
          relevantMemories, // Inject Memories
          currentTurn,
          activeConfig, 
          worldData.config,
          input 
        );

        const thinkingBudget = THINKING_BUDGET_MAP[settings.thinkingBudgetLevel] || 0;
        
        const generationConfig: any = {
            temperature: settings.temperature,
            topK: settings.topK,
            topP: settings.topP,
            maxOutputTokens: settings.maxOutputTokens,
        };

        if (thinkingBudget > 0 && settings.aiModel.includes('pro')) {
             generationConfig.thinkingConfig = { thinkingBudget };
        }

        const contents = slicedHistory.map(msg => {
            let text = msg.text;
            if (msg.role === 'user' && !text.includes('<user_input>')) {
                text = `<user_input>${text}</user_input>`;
            }
            return {
                role: msg.role,
                parts: [{ text: text }]
            };
        });

        contents.push({
            role: 'user',
            parts: [{ text: `<user_input>${input}</user_input>` }]
        });

        // Handle Prefill
        const prefillModule = activeConfig.modules.find(m => m.id === 'sys_prefill_trigger');
        const prefillContent = (prefillModule && prefillModule.isActive) ? prefillModule.content : '';

        if (prefillContent) {
            yield prefillContent;
            contents.push({
                role: 'model',
                parts: [{ text: prefillContent }]
            });
        }

        const streamResponse = await ai.models.generateContentStream({
            model: settings.aiModel,
            contents: contents,
            config: {
                ...generationConfig,
                systemInstruction: systemInstruction
            }
        });

        let accumulatedFullText = prefillContent;

        for await (const chunk of streamResponse) {
             const c = chunk as GenerateContentResponse;
             if (c.text) {
                 accumulatedFullText += c.text;
                 yield c.text;
             }
        }

        // Task 3.3 Step 4: Save Vectors Async after stream completes
        (async () => {
             const userMsgId = `msg-${Date.now()}-user`;
             const aiMsgId = `msg-${Date.now() + 1}-model`;
             await vectorService.saveVector(userMsgId, input, 'user');
             if (accumulatedFullText) {
                 await vectorService.saveVector(aiMsgId, accumulatedFullText, 'model');
             }
        })();

    } catch (error) {
        console.error("Generate Story Stream Error:", error);
        yield `<span style="color: #ef4444;">[LỖI HỆ THỐNG: ${error instanceof Error ? error.message : String(error)}]</span>`;
    }
  }
};
