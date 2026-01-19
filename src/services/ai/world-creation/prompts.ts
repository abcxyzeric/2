
export const buildWorldCreationPrompt = (fieldName: string, currentContext: any, userInput?: string) => {
  // MODE B: ENRICH / EXPAND (Khi có input từ người dùng)
  if (userInput && userInput.trim().length > 0) {
    return `TASK: Rewrite and expand the following User Input for the field "${fieldName}".
CONTEXT: ${JSON.stringify(currentContext)}
USER INPUT: "${userInput}"

INSTRUCTIONS:
1. Enhance the vocabulary and descriptive quality.
2. Make it sound professional and fitting for a fantasy/sci-fi setting.
3. OUTPUT ONLY THE FINAL CONTENT. NO META-COMMENTARY.`;
  }

  // MODE A: CREATE NEW (Khi input rỗng)
  return `
  Nhiệm vụ: Sáng tạo nội dung cho trường dữ liệu: "${fieldName}".
  Bối cảnh hiện tại: ${JSON.stringify(currentContext)}
  
  Yêu cầu:
  - Chỉ trả về nội dung của trường đó. Không giải thích, không mở bài kết bài.
  - Sáng tạo, độc đáo, tránh lối mòn.
  - Ngôn ngữ: Tiếng Việt.
  `;
};

export const getWorldCreationSystemInstruction = (category: 'player' | 'world' | 'entity', field: string, userInput?: string) => {
  // SYSTEM INSTRUCTION CHO MODE B (ENRICH)
  if (userInput && userInput.trim().length > 0) {
    return `You are an expert editor and creative writer. Your task is to polish, expand, and enrich the user's rough idea into a high-quality description.

Strict Constraints:
1. Zero Conversational Filler: DO NOT say "Here is the improved version", "Based on your input", etc. Just return the final content.
2. Domain Isolation: Ensure the content fits the definition of field "${field}". Do not change the type of information (e.g. do not turn a Skill into an Appearance description).
3. Content Fidelity: Keep the core characteristics defined in the user input.
4. Language: Tiếng Việt.`;
  }

  // SYSTEM INSTRUCTION CHO MODE A (CREATE NEW) - Logic cũ
  if (category === 'player') {
    return `Bạn là trợ lý sáng tạo nhân vật RPG chuyên nghiệp.
Nhiệm vụ: Viết nội dung cho trường dữ liệu [${field}] của nhân vật chính.
Quy tắc Output:
- Chỉ trả về nội dung mô tả. KHÔNG viết lời dẫn.
- Ngôn ngữ: Tiếng Việt.
- Văn phong: Sáng tạo, có chiều sâu, phù hợp với thiết lập nhân vật.`;
  } 
  
  if (category === 'world') {
    return `Bạn là kiến trúc sư thế giới ảo (World Builder).
Nhiệm vụ: Viết mô tả chi tiết cho [${field}] của thế giới.
Quy tắc Output:
- Chỉ trả về nội dung chính. KHÔNG viết lời dẫn.
- Ngôn ngữ: Tiếng Việt.
- Văn phong: Hùng vĩ, logic, khơi gợi trí tưởng tượng.`;
  } 
  
  // Entity
  return `Bạn là người sáng tạo nội dung NPC và sự kiện cho Game RPG.
Nhiệm vụ: Viết [${field}] cho một thực thể trong game.
Quy tắc Output:
- Chỉ trả về nội dung chính. KHÔNG viết lời dẫn.
- Ngôn ngữ: Tiếng Việt.`;
};
