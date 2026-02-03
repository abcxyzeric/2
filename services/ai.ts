import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Persona, AIConfig, ThinkingLevel, WorldInfo, PREDEFINED_GENRES, UniversePayload, DataItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-3-pro-preview';

// Cấu hình an toàn theo yêu cầu (OFF)
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE }
];

const SYSTEM_INSTRUCTION = `Bạn là trợ lý viết sáng tạo cho game nhập vai (RPG). Nhiệm vụ của bạn là giúp người dùng tạo ra hồ sơ nhân vật và thế giới chi tiết.
QUY TẮC TUYỆT ĐỐI:
1. Chỉ xuất ra nội dung văn bản thuần túy bằng tiếng Việt.
2. KHÔNG bao gồm các câu dẫn dắt như "Đây là mô tả...", "Dựa trên ý tưởng của bạn...".
3. Nếu người dùng đã nhập liệu, hãy MỞ RỘNG và TRAU CHUỐT nó, KHÔNG thay thế hoàn toàn ý tưởng gốc.
4. Giữ văn phong huyền bí, thanh lịch hoặc phù hợp với bối cảnh.
5. Chỉ trả về dữ liệu thô (raw data) hoặc JSON khi được yêu cầu.`;

const getThinkingBudget = (level: ThinkingLevel): number => {
  switch (level) {
    case ThinkingLevel.MINIMUM: return 1024;
    case ThinkingLevel.LOW: return 4096;
    case ThinkingLevel.MEDIUM: return 8192;
    case ThinkingLevel.HIGH: return 16384;
    case ThinkingLevel.MAXIMUM: return 32768;
    case ThinkingLevel.AUTO: 
    default: return 0;
  }
};

const buildGenerationConfig = (aiConfig: AIConfig, mimeType: string = "text/plain") => {
  const thinkingBudget = getThinkingBudget(aiConfig.thinkingLevel);
  
  return {
    temperature: aiConfig.temperature,
    topK: aiConfig.topK,
    topP: aiConfig.topP,
    maxOutputTokens: aiConfig.maxOutputTokens,
    responseMimeType: mimeType,
    safetySettings: safetySettings,
    systemInstruction: SYSTEM_INSTRUCTION,
    thinkingConfig: { thinkingBudget: thinkingBudget },
  };
};

/**
 * --- UNIFIED UNIVERSE GENERATION ---
 */

/**
 * Tạo đồng thời cả Nhân vật và Thế giới từ một ý tưởng chung.
 * Đảm bảo tính nhất quán và cấu trúc dữ liệu DataItem.
 */
export const generateUniverseFromIdea = async (idea: string, aiConfig: AIConfig): Promise<UniversePayload | null> => {
  try {
    const predefinedGenresStr = PREDEFINED_GENRES.join(", ");
    
    const prompt = `
    Dựa trên ý tưởng cốt lõi: "${idea}"
    
    Hãy thực hiện quy trình khởi tạo Vũ trụ và Nhân vật.

    BƯỚC 1: Xác định Thể loại & Bối cảnh Thế giới.
    - Chọn thể loại từ [${predefinedGenresStr}] hoặc tạo mới.
    - Viết 'worldContext' trong thẻ <worldview>...</worldview>.

    BƯỚC 2: Tạo Nhân vật chính (Protagonist/User).
    - Tạo 'name' (Tên), 'age', 'gender', 'personality', 'background', 'appearance', 'goals', 'hobbies'.
    - Kỹ năng (skills): Tạo tối đa 1 hoặc 2 kỹ năng. 
      + Định dạng: JSON Object { "name": "...", "description": "..." }.
      + YÊU CẦU MÔ TẢ KỸ NĂNG: Độ dài 20-30 từ. BẮT BUỘC phải chứa nội dung theo format này trong chuỗi description: "tên: [Tên Kỹ Năng]\nmô tả: [Nội dung chi tiết]".

    BƯỚC 3: Tạo danh sách 4 NPC.
    - Định dạng: Mảng các JSON Object { "name": "...", "description": "..." }.
    - Name: Tên NPC.
    - Description: Nội dung NPC.
      + QUY TẮC TAG: Nội dung mô tả PHẢI được bọc trong thẻ XML <npc_n>...</npc_n> (ví dụ <npc_1>, <npc_2>...).
      + QUY TẮC QUAN HỆ: Trong mô tả quan hệ, thay thế "{{user}}" bằng Tên nhân vật ở Bước 2.

    BƯỚC 4: Tạo danh sách 4 Thực thể/Thế lực.
    - Định dạng: Mảng các JSON Object { "name": "...", "description": "..." }.
    - Name: Tên thực thể.
    - Description: Độ dài 20-30 từ.

    YÊU CẦU ĐẦU RA (JSON Format):
    {
      "worldInfo": {
         "genre": "...",
         "worldName": "...",
         "worldContext": "...",
         "npcs": [{ "name": "...", "description": "..." }, ...],
         "entities": [{ "name": "...", "description": "..." }, ...]
      },
      "persona": {
        "name": "...",
        "age": "...",
        "gender": "...",
        "personality": "...",
        "background": "...",
        "appearance": "...",
        "skills": [{ "name": "...", "description": "..." }, ...],
        "goals": "...",
        "hobbies": "..."
      }
    }
    
    TEMPLATE NPC (Sử dụng cho description của NPC):
    ${NPC_TEMPLATE}
    `;

    const config = buildGenerationConfig(aiConfig, "application/json");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: config,
    });

    if (response.text) {
      return JSON.parse(response.text) as UniversePayload;
    }
    return null;

  } catch (error) {
    console.error("Error generating universe:", error);
    throw error;
  }
};

/**
 * Gợi ý nội dung cho một trường nhân vật cụ thể
 * Updated: Hỗ trợ trả về DataItem cho Skills
 */
export const generatePersonaField = async (
  currentPersona: Persona,
  targetField: keyof Persona,
  currentValue: string,
  aiConfig: AIConfig
): Promise<string | DataItem> => {
  try {
    const isSkill = targetField === 'skills';
    const context = `
    THÔNG TIN NHÂN VẬT HIỆN TẠI:
    - Tên: ${currentPersona.name}
    - Tuổi: ${currentPersona.age}
    - Giới tính: ${currentPersona.gender}
    ${currentPersona.personality ? `- Tính cách: ${currentPersona.personality}` : ''}
    ${currentPersona.background ? `- Tiền sử: ${currentPersona.background}` : ''}
    
    YÊU CẦU:
    Hãy viết nội dung cho trường: "${targetField}".
    Giá trị hiện tại (nếu có): "${currentValue}".
    
    ${isSkill ? `
    ĐỊNH DẠNG ĐẶC BIỆT CHO KỸ NĂNG:
    Trả về một JSON Object duy nhất: { "name": "Tên Kỹ Năng", "description": "Mô tả chi tiết" }.
    QUY TẮC MÔ TẢ:
    - Độ dài: 20-30 từ.
    - Nội dung description phải bao gồm format: "tên: [Tên Kỹ Năng]\nmô tả: [Nội dung]"
    ` : `
    HƯỚNG DẪN:
    - Viết lại đoạn văn cho hay hơn, chi tiết hơn, văn phong cuốn hút hơn.
    - Chỉ trả về chuỗi văn bản (String).
    `}
    `;

    const config = buildGenerationConfig(aiConfig, isSkill ? "application/json" : "text/plain");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: context,
      config: config,
    });

    if (isSkill && response.text) {
      return JSON.parse(response.text) as DataItem;
    }

    return response.text || "";
  } catch (error) {
    console.error(`Error generating field ${targetField}:`, error);
    throw error;
  }
};

/**
 * --- WORLD CREATION SERVICES ---
 */

const NPC_TEMPLATE = `
<npc_n>
  Thông tin cơ bản:
    Họ và tên: [Tên]
    Tuổi: [Tuổi]
    Giới tính: [Nam/Nữ/Khác]
    Thân phận: [Nghề nghiệp/Vai trò]
      
  Đặc điểm ngoại hình:
    [Tóm tắt 1 câu]
      
  Tính cách cốt lõi:
    [2-3 từ khóa]

  Định vị quan hệ:
    Quan hệ với {{user}}: [Mối quan hệ cụ thể]
</npc_n>
`;

/**
 * Tạo toàn bộ thế giới từ ý tưởng (Legacy function support removed for brevity in this specific refactor as Universe handles it, keeping minimal needed)
 * Replaced/Updated by generateUniverseFromIdea for major flows.
 */

/**
 * Gợi ý tên thế giới hoặc bối cảnh
 */
export const generateWorldField = async (
  currentWorld: WorldInfo,
  field: 'worldName' | 'worldContext',
  aiConfig: AIConfig
): Promise<string> => {
  try {
    let prompt = "";
    if (field === 'worldName') {
      prompt = `Thể loại: ${currentWorld.genre}. Ý tưởng bối cảnh: ${currentWorld.worldContext}. Hãy gợi ý một cái tên thế giới thật ấn tượng, ngắn gọn. Chỉ trả về Tên.`;
    } else if (field === 'worldContext') {
      prompt = `
      Thể loại: ${currentWorld.genre}. Tên thế giới: ${currentWorld.worldName}.
      Hãy viết một đoạn mô tả bối cảnh thế giới (World Context).
      YÊU CẦU:
      - Nội dung PHẢI được bọc trong thẻ <worldview>...</worldview>.
      - Bao gồm: Thời đại/Bối cảnh lịch sử và Các điểm đặc biệt.
      - Độ dài: 5-8 dòng viết liền mạch.
      `;
    }

    const config = buildGenerationConfig(aiConfig);
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: config,
    });

    return response.text || "";

  } catch (error) {
    console.error(`Error generating world field ${field}:`, error);
    throw error;
  }
};

/**
 * Tạo MỘT item (NPC hoặc Thực thể) duy nhất.
 * Thay thế cho generateWorldList.
 */
export const generateSingleWorldItem = async (
  currentWorld: WorldInfo,
  type: 'npcs' | 'entities',
  personaName: string,
  nextIndex: number, // Index để gắn tag npc_n
  aiConfig: AIConfig
): Promise<DataItem | null> => {
  try {
    const prompt = `
    Thể loại: ${currentWorld.genre}. Tên thế giới: ${currentWorld.worldName}.
    Bối cảnh: ${currentWorld.worldContext}
    Tên Nhân Vật Chính (User): "${personaName}"
    
    HÃY TẠO DUY NHẤT 1 ${type === 'npcs' ? 'NPC' : 'Thực thể/Địa danh'} MỚI.
    
    YÊU CẦU ĐỊNH DẠNG:
    Trả về JSON Object: { "name": "...", "description": "..." }

    ${type === 'npcs' ? `
    TEMPLATE DESCRIPTION CHO NPC:
    Bắt buộc bọc nội dung trong thẻ <npc_${nextIndex}>...</npc_${nextIndex}>.
    ${NPC_TEMPLATE.replace('<npc_n>', `<npc_${nextIndex}>`).replace('</npc_n>', `</npc_${nextIndex}>`)}
    
    QUY TẮC:
    1. Quan hệ: Thay {{user}} bằng "${personaName}".
    2. Name: Tên riêng của NPC.
    ` : `
    QUY TẮC THỰC THỂ:
    1. Name: Tên thực thể/địa danh.
    2. Description: Độ dài khoảng 20-30 từ.
    `}
    `;

    const config = buildGenerationConfig(aiConfig, "application/json");
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: config,
    });

    if (response.text) {
      return JSON.parse(response.text) as DataItem;
    }
    return null;

  } catch (error) {
    console.error(`Error generating single item ${type}:`, error);
    throw error;
  }
};

// Legacy Placeholder to satisfy imports if needed elsewhere (though mostly replaced)
export const generateFullPersonaFromIdea = async (idea: string, aiConfig: AIConfig): Promise<Persona | null> => {
    return null; 
};
export const generateWorldFromIdea = async (idea: string, aiConfig: AIConfig): Promise<WorldInfo | null> => {
    return null;
};
export const generateWorldList = async (currentWorld: WorldInfo, type: 'npcs' | 'entities', personaName: string, aiConfig: AIConfig): Promise<string[]> => {
    return [];
};