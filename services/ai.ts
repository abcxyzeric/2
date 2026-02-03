import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Persona, AIConfig, ThinkingLevel, WorldInfo, PREDEFINED_GENRES } from "../types";

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
 * Tạo toàn bộ nhân vật từ một ý tưởng ngắn
 */
export const generateFullPersonaFromIdea = async (idea: string, aiConfig: AIConfig): Promise<Persona | null> => {
  try {
    const prompt = `Hãy tạo một hồ sơ nhân vật đầy đủ dựa trên ý tưởng sau: "${idea}".
    Trả về kết quả dưới dạng JSON (không dùng Markdown code block) với các trường sau:
    name, age, gender, personality, background, appearance, skills (mảng chuỗi), goals, hobbies.`;

    const config = buildGenerationConfig(aiConfig, "application/json");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: config,
    });

    if (response.text) {
      return JSON.parse(response.text) as Persona;
    }
    return null;
  } catch (error) {
    console.error("Error generating persona from idea:", error);
    throw error;
  }
};

/**
 * Gợi ý nội dung cho một trường nhân vật cụ thể
 */
export const generatePersonaField = async (
  currentPersona: Persona,
  targetField: keyof Persona,
  currentValue: string,
  aiConfig: AIConfig
): Promise<string> => {
  try {
    const context = `
    THÔNG TIN NHÂN VẬT HIỆN TẠI:
    - Tên: ${currentPersona.name}
    - Tuổi: ${currentPersona.age}
    - Giới tính: ${currentPersona.gender}
    ${currentPersona.personality ? `- Tính cách: ${currentPersona.personality}` : ''}
    ${currentPersona.background ? `- Tiền sử: ${currentPersona.background}` : ''}
    
    YÊU CẦU:
    Hãy viết nội dung cho trường: "${targetField}".
    Giá trị hiện tại của người dùng (nếu có): "${currentValue}".
    
    HƯỚNG DẪN:
    - Nếu giá trị hiện tại trống: Hãy sáng tạo nội dung mới phù hợp với Tên, Tuổi, Giới tính đã cung cấp.
    - Nếu giá trị hiện tại có nội dung: Hãy viết lại đoạn đó cho hay hơn, chi tiết hơn, văn phong cuốn hút hơn, nhưng giữ nguyên ý chính.
    - Đối với trường 'skills': Chỉ gợi ý 1 kỹ năng đặc biệt hoặc mô tả ngắn gọn về khả năng.
    `;

    const config = buildGenerationConfig(aiConfig);

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: context,
      config: config,
    });

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
NPC_n - Tên nhân vật:
  Thông tin cơ bản:
    Họ và tên: [Tên]
    Tuổi: [Tuổi]
    Giới tính: [Nam/Nữ/Khác]
    Thân phận: [Nghề nghiệp/Vai trò]
      
  Đặc điểm ngoại hình:
    Ấn tượng tổng thể: [Tóm tắt 1 câu]
    Đặc điểm chính: [1-2 điểm nổi bật]
    Phong cách ăn mặc: [Trang phục]
      
  Tính cách cốt lõi:
    Đặc điểm cốt lõi: [2-3 từ khóa]
    Mô thức hành vi: [Hành động điển hình]

  Định vị quan hệ:
    Quan hệ với {{user}}: [Mối quan hệ cụ thể]
    Thái độ: [Thái độ với user]
    Cách tương tác: [Cách tương tác]
`;

/**
 * Tạo toàn bộ thế giới từ ý tưởng
 */
export const generateWorldFromIdea = async (idea: string, aiConfig: AIConfig): Promise<WorldInfo | null> => {
  try {
    const predefinedGenresStr = PREDEFINED_GENRES.join(", ");
    
    const prompt = `
    Dựa trên ý tưởng thế giới: "${idea}"
    
    Hãy khởi tạo một thế giới hoàn chỉnh.
    Nếu ý tưởng chứa từ khóa thuộc các thể loại sau: [${predefinedGenresStr}], hãy chọn thể loại đó. Nếu không, hãy tự chọn thể loại phù hợp nhất hoặc tạo mới (Custom).
    
    YÊU CẦU ĐẦU RA (JSON format, không Markdown):
    {
      "genre": "Tên thể loại",
      "worldName": "Tên thế giới (ấn tượng, Hán Việt nếu là tiên hiệp/kiếm hiệp)",
      "worldContext": "Mô tả bối cảnh thế giới được bọc trong thẻ <worldview>...</worldview>. Phải bao gồm: Thời đại/Bối cảnh (5-8 dòng liền mạch), Các điểm đặc biệt về hệ thống sức mạnh/văn hóa. KHÔNG gạch đầu dòng.",
      "npcs": ["Nội dung NPC 1 theo template", "Nội dung NPC 2 theo template", "Nội dung NPC 3 theo template", "Nội dung NPC 4 theo template"],
      "entities": ["Mô tả thực thể/thế lực 1 (4-5 dòng)", "Mô tả thực thể/thế lực 2 (4-5 dòng)", "Mô tả thực thể/thế lực 3 (4-5 dòng)", "Mô tả thực thể/thế lực 4 (4-5 dòng)"]
    }

    TEMPLATE NPC BẮT BUỘC (Sử dụng cho mảng npcs):
    ${NPC_TEMPLATE}
    `;

    const config = buildGenerationConfig(aiConfig, "application/json");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: config,
    });

    if (response.text) {
      return JSON.parse(response.text) as WorldInfo;
    }
    return null;

  } catch (error) {
    console.error("Error generating world from idea:", error);
    throw error;
  }
};

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
      - Bao gồm: Thời đại/Bối cảnh lịch sử và Các điểm đặc biệt (Hệ thống sức mạnh, văn hóa, công nghệ...).
      - Độ dài: 5-8 dòng viết liền mạch (paragraph), KHÔNG gạch đầu dòng.
      - Văn phong: ${currentWorld.genre === 'Tiên Hiệp' ? 'Cổ trang, huyền bí' : 'Phù hợp thể loại'}.
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
 * Gợi ý danh sách (NPC hoặc Thực thể)
 */
export const generateWorldList = async (
  currentWorld: WorldInfo,
  type: 'npcs' | 'entities',
  aiConfig: AIConfig
): Promise<string[]> => {
  try {
    const prompt = `
    Thể loại: ${currentWorld.genre}. Tên thế giới: ${currentWorld.worldName}.
    Bối cảnh: ${currentWorld.worldContext}
    
    Hãy tạo ra danh sách 4 ${type === 'npcs' ? 'NPC quan trọng (có chức năng dẫn truyện)' : 'Thực thể / Thế lực / Địa danh quan trọng'}.
    
    YÊU CẦU ĐỊNH DẠNG:
    Trả về kết quả dưới dạng JSON Array các chuỗi string: ["Item 1", "Item 2", "Item 3", "Item 4"].
    
    ${type === 'npcs' ? `SỬ DỤNG TEMPLATE SAU CHO TỪNG NPC: \n${NPC_TEMPLATE}\nBọc mỗi NPC trong thẻ <npc_n> (ví dụ <npc_1>).` : 'Mỗi thực thể viết một đoạn văn mô tả 4-5 dòng liền mạch.'}
    `;

    const config = buildGenerationConfig(aiConfig, "application/json");
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: config,
    });

    if (response.text) {
      return JSON.parse(response.text) as string[];
    }
    return [];

  } catch (error) {
    console.error(`Error generating world list ${type}:`, error);
    throw error;
  }
};