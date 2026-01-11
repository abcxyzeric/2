
import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, ChatMessage, WorldData, TawaPresetConfig } from "../../types";
import { buildWorldCreationPrompt, buildGameplaySystemPrompt } from "./promptBuilders";
import { DEFAULT_PRESET_CONFIG } from "../../constants/tawa_modules";

// Initialize AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Map thinking levels to token counts
const THINKING_BUDGET_MAP = {
    'auto': 0,
    'low': 4096,
    'medium': 16384,
    'high': 32768
};

export const aiService = {
  // helper methods for World Creation
  async generateFieldContent(contextType: string, fieldName: string, modelName: string = 'gemini-3-pro-preview'): Promise<string> {
    try {
      // Sử dụng builder mới
      const prompt = buildWorldCreationPrompt(fieldName, { contextType });

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.85,
          topK: 40,
          topP: 0.95,
        }
      });

      return response.text?.trim() || "";
    } catch (error) {
      console.error("AI generateFieldContent Error:", error);
      return "Không thể kết nối với AI. Vui lòng kiểm tra API Key hoặc thử lại sau.";
    }
  },

  async generateFullWorld(concept: string, modelName: string = 'gemini-3-pro-preview'): Promise<any> {
    try {
      const prompt = `
        Bạn là một kiến trúc sư thế giới ảo (World Builder).
        Dựa trên ý tưởng cốt lõi: "${concept}", hãy xây dựng một bản thiết lập thế giới RPG hoàn chỉnh.
        
        Yêu cầu output:
        1. Ngôn ngữ: Tiếng Việt.
        2. Trả về đúng định dạng JSON theo Schema.
        3. Nội dung phải sáng tạo, logic và có chiều sâu văn học.
        4. Bao gồm:
           - 1 Nhân vật chính (Player): Có tiểu sử, tính cách, mục tiêu rõ ràng liên quan đến ý tưởng cốt lõi.
           - Bối cảnh thế giới (World): Tên, thể loại, và mô tả bối cảnh/lịch sử chi tiết.
           - 4 Thực thể (Entities): Bao gồm ít nhất 1 NPC, 1 Địa điểm (Location).
      `;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              player: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Tên nhân vật" },
                  gender: { type: Type.STRING, description: "Giới tính" },
                  age: { type: Type.STRING, description: "Tuổi" },
                  personality: { type: Type.STRING, description: "Tính cách nổi bật" },
                  background: { type: Type.STRING, description: "Tiểu sử và xuất thân" },
                  appearance: { type: Type.STRING, description: "Mô tả ngoại hình" },
                  skills: { type: Type.STRING, description: "Kỹ năng đặc biệt" },
                  goal: { type: Type.STRING, description: "Mục tiêu chính" },
                },
                required: ['name', 'gender', 'age', 'personality', 'background', 'appearance', 'skills', 'goal']
              },
              world: {
                type: Type.OBJECT,
                properties: {
                  worldName: { type: Type.STRING, description: "Tên thế giới" },
                  genre: { type: Type.STRING, description: "Thể loại" },
                  context: { type: Type.STRING, description: "Bối cảnh lịch sử, xã hội" },
                },
                required: ['worldName', 'genre', 'context']
              },
              entities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['NPC', 'LOCATION', 'CUSTOM'] },
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    personality: { type: Type.STRING, nullable: true },
                    customType: { type: Type.STRING, nullable: true },
                  },
                  required: ['type', 'name', 'description']
                }
              }
            },
            required: ['player', 'world', 'entities']
          },
          temperature: 0.9
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        if (data.entities && Array.isArray(data.entities)) {
            data.entities = data.entities.map((ent: any, idx: number) => ({
                ...ent,
                id: ent.id || `ai-ent-${Date.now()}-${idx}`
            }));
        }
        return data;
      }
      throw new Error("AI trả về phản hồi rỗng.");
    } catch (error) {
      console.error("AI generateFullWorld Error:", error);
      throw error;
    }
  },

  // --- NEW: GAMEPLAY STORY GENERATION (With Tawa Protocol) ---

  async generateStoryTurn(
    input: string, 
    history: ChatMessage[], 
    worldData: WorldData, 
    settings: AppSettings,
    presetConfig?: TawaPresetConfig // Updated to accept config object
  ): Promise<string> {
    try {
        // 1. Construct System Instruction using Tawa Builder
        const currentTurn = Math.floor(history.length / 2) + 1;
        
        // Use provided config or fallback to default
        const activeConfig = presetConfig || DEFAULT_PRESET_CONFIG;

        const systemInstruction = buildGameplaySystemPrompt(
          worldData.world,
          worldData.player,
          worldData.entities,
          "", // Placeholder for RAG memories
          currentTurn,
          activeConfig, 
          worldData.config 
        );

        // 2. Prepare Config (High Creativity for Tawa)
        const thinkingBudget = THINKING_BUDGET_MAP[settings.thinkingBudgetLevel] || 0;
        
        const generationConfig: any = {
            temperature: settings.temperature,
            topK: settings.topK,
            topP: settings.topP,
            maxOutputTokens: settings.maxOutputTokens,
        };

        // Only add thinking budget if model supports it and budget > 0
        if (thinkingBudget > 0 && settings.aiModel.includes('pro')) {
             generationConfig.thinkingConfig = { thinkingBudget };
        }

        // 3. Prepare Contents (History + Current Input)
        const contents = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        // Add current user input
        contents.push({
            role: 'user',
            parts: [{ text: input }]
        });

        // 4. Call AI
        const response = await ai.models.generateContent({
            model: settings.aiModel,
            contents: contents,
            config: {
                ...generationConfig,
                systemInstruction: systemInstruction
            }
        });

        return response.text || "Hệ thống không phản hồi. Vui lòng thử lại.";

    } catch (error) {
        console.error("Generate Story Error:", error);
        return `<span style="color: #ef4444;">[LỖI HỆ THỐNG: Không thể kết nối với AI Server. Chi tiết: ${error instanceof Error ? error.message : String(error)}]</span>`;
    }
  }
};
