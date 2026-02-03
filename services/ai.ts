import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Persona } from "../types";

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

const SYSTEM_INSTRUCTION = `Bạn là trợ lý viết sáng tạo cho game nhập vai (RPG). Nhiệm vụ của bạn là giúp người dùng tạo ra hồ sơ nhân vật chi tiết và hấp dẫn.
QUY TẮC TUYỆT ĐỐI:
1. Chỉ xuất ra nội dung văn bản thuần túy bằng tiếng Việt.
2. KHÔNG bao gồm các câu dẫn dắt như "Đây là mô tả...", "Dựa trên ý tưởng của bạn...".
3. Nếu người dùng đã nhập liệu, hãy MỞ RỘNG và TRAU CHUỐT nó, KHÔNG thay thế hoàn toàn ý tưởng gốc.
4. Giữ văn phong huyền bí, thanh lịch hoặc phù hợp với bối cảnh nhân vật.`;

/**
 * Tạo toàn bộ nhân vật từ một ý tưởng ngắn
 */
export const generateFullPersonaFromIdea = async (idea: string): Promise<Persona | null> => {
  try {
    const prompt = `Hãy tạo một hồ sơ nhân vật đầy đủ dựa trên ý tưởng sau: "${idea}".
    Trả về kết quả dưới dạng JSON (không dùng Markdown code block) với các trường sau:
    name, age, gender, personality, background, appearance, skills (mảng chuỗi), goals, hobbies.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        safetySettings: safetySettings,
      },
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
 * Gợi ý nội dung cho một trường cụ thể
 */
export const generatePersonaField = async (
  currentPersona: Persona,
  targetField: keyof Persona,
  currentValue: string
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

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: context,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        safetySettings: safetySettings,
      },
    });

    return response.text || "";
  } catch (error) {
    console.error(`Error generating field ${targetField}:`, error);
    throw error;
  }
};