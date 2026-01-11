
import { TAWA_IDENTITY, TAWA_OUTPUT_FORMAT } from '../../constants/tawa_protocol';
import { GameConfig, TawaPresetConfig } from '../../types';
import { generateWordCountPrompt } from '../../constants/promptTemplates';

// Helper function để thay thế biến trong text
const injectVariables = (text: string, variables: Record<string, any>) => {
  let processedText = text;
  // Thay thế Word Count (Ưu tiên cao nhất)
  processedText = processedText.replace(/\{\{getvar::word_min\}\}/g, variables.minWords || '1000');
  processedText = processedText.replace(/\{\{getvar::word_max\}\}/g, variables.maxWords || '5000');
  
  // Có thể mở rộng để thay thế các biến khác nếu cần (Ví dụ: writing style, nsfw toggle...)
  return processedText;
};

// Helper để tạo Prompt Ngôi kể
const getPerspectivePrompt = (perspective: string, playerName: string) => {
    switch (perspective) {
        case 'first':
            return `GÓC NHÌN: NGÔI THỨ NHẤT (First Person).
            - Xưng hô: "Tôi" (hoặc xưng hô phù hợp với tính cách nhân vật).
            - Trọng tâm: Miêu tả sâu sắc nội tâm, cảm xúc và suy nghĩ chủ quan của nhân vật chính.
            - Giới hạn: Chỉ biết những gì nhân vật thấy và nghe.`;
        case 'second':
            return `GÓC NHÌN: NGÔI THỨ HAI (Second Person).
            - Xưng hô: "Bạn" (hoặc "Ngươi/Cậu/Anh").
            - Trọng tâm: Tạo cảm giác nhập vai trực tiếp, như thể người chơi đang thực sự hành động.
            - Phong cách: Dẫn dắt hành động của người chơi.`;
        case 'third':
        default:
            return `GÓC NHÌN: NGÔI THỨ BA (Third Person).
            - Xưng hô: Gọi tên nhân vật ("${playerName}"), hoặc đại từ ("Hắn", "Y", "Cô ấy", "Nàng").
            - Trọng tâm: Khách quan, điện ảnh, bao quát hành động và môi trường xung quanh.`;
    }
};

// Hàm 1: Prompt cho Kiến Tạo Thế Giới (World Creation)
export const buildWorldCreationPrompt = (fieldName: string, currentContext: any) => {
  return `
  Nhiệm vụ: Sáng tạo nội dung cho trường dữ liệu: "${fieldName}".
  Bối cảnh hiện tại: ${JSON.stringify(currentContext)}
  
  Yêu cầu:
  - Chỉ trả về nội dung của trường đó. Không giải thích, không mở bài kết bài.
  - Sáng tạo, độc đáo, tránh lối mòn.
  - Ngôn ngữ: Tiếng Việt.
  `;
};

// Hàm 2: Prompt cho Gameplay (Tawa Engine - Optimized Architecture)
export const buildGameplaySystemPrompt = (
  worldSettings: any,
  playerProfile: any,
  entities: any[],
  relevantMemories: string,
  turnCount: number,
  presetConfig: TawaPresetConfig,
  gameConfig: GameConfig
) => {
  // 1. Xác định số từ mục tiêu (Logic xử lý Custom và Preset)
  let minWords = 1000;
  let maxWords = 5000;

  if (gameConfig.outputLength.id === 'custom') {
      // Trường hợp người dùng nhập tay (Custom)
      minWords = gameConfig.customMinWords || 1000;
      maxWords = gameConfig.customMaxWords || (minWords + 2000);
  } else {
      // Trường hợp người dùng chọn Preset (Ngắn/Dài/Trung bình)
      minWords = gameConfig.outputLength.minWords;
      // Tự động cộng thêm buffer an toàn
      maxWords = minWords + 4000; 
  }

  // 2. TẠO PROMPT KIỂM SOÁT SỐ TỪ (HEADER PRIORITY - TOPMOST)
  const strictWordCountPrompt = generateWordCountPrompt(minWords, maxWords);

  // 3. Xử lý COT (Lõi tư duy) - TIÊM BIẾN SỐ VÀO (Dynamic Injection)
  let rawCOT = presetConfig.cot.content;
  const processedCOT = injectVariables(rawCOT, { minWords, maxWords });

  // 4. Xử lý Modules Injection (Source of Truth từ presetConfig)
  let activeModulesPrompt = "";
  // Duyệt qua mảng modules (đã sắp xếp đúng thứ tự trong tawa_modules.ts)
  presetConfig.modules.forEach(mod => {
    if (mod.isActive) {
      activeModulesPrompt += `\n\n=== MODULE: ${mod.label} ===\n${mod.content}`;
    }
  });

  // 5. Xây dựng Context (Identity & Data)
  const worldContext = `
  === DỮ LIỆU THẾ GIỚI ===
  - Tên: ${worldSettings.worldName}
  - Thể loại: ${worldSettings.genre}
  - Bối cảnh: ${worldSettings.context}
  `;

  const playerContext = `
  === HỒ SƠ NHÂN VẬT CHÍNH (<user>) ===
  - Tên: ${playerProfile.name}
  - Tuổi: ${playerProfile.age}
  - Tính cách: ${playerProfile.personality}
  - Tiểu sử: ${playerProfile.background}
  - Kỹ năng: ${playerProfile.skills || "Chưa rõ"}
  - Mục tiêu: ${playerProfile.goal || "Sinh tồn"}
  `;

  // Lorebook - Rút gọn mô tả để tiết kiệm token nhưng vẫn đủ context
  const lorebook = `
  === LOREBOOK (NPC & ĐỊA ĐIỂM) ===
  ${entities.map((e: any) => `> [${e.type}] ${e.name}: ${e.description.substring(0, 300)}...`).join('\n')}
  `;

  // 7. Perspective Prompt
  const perspectivePrompt = getPerspectivePrompt(gameConfig.perspective || 'third', playerProfile.name);

  // 8. GHÉP PROMPT HOÀN CHỈNH (THEO THỨ TỰ CHIẾN LƯỢC MỚI V2)
  return `
  ${strictWordCountPrompt}
  
  ${TAWA_IDENTITY}
  ${TAWA_OUTPUT_FORMAT}
  
  ${worldContext}
  ${playerContext}
  ${lorebook}

  === KÝ ỨC LIÊN QUAN (RAG) ===
  ${relevantMemories || "Chưa có ký ức nào."}

  === THIẾT LẬP ĐỘ KHÓ (${gameConfig.difficulty.label}) ===
  ${gameConfig.difficulty.prompt}

  === GÓC NHÌN KỂ CHUYỆN (BẮT BUỘC) ===
  ${perspectivePrompt}

  === MODULES HỆ THỐNG KÍCH HOẠT ===
  ${activeModulesPrompt}

  === TRẠNG THÁI HIỆN TẠI ===
  - Số lượt chơi (Turn): ${turnCount}

  === LUẬT BẤT KHẢ KHÁNG (MANDATORY RULES) ===
  (Những quy tắc này có độ ưu tiên TUYỆT ĐỐI, ghi đè lên các chỉ dẫn khác)
  ${gameConfig.rules.length > 0 ? gameConfig.rules.map((r: string, idx: number) => `${idx + 1}. ${r}`).join('\n') : "Chưa có quy tắc bổ sung."}

  === QUY TRÌNH TƯ DUY BẮT BUỘC (COT - EXECUTION CORE) ===
  ${processedCOT}

  (NHẮC LẠI: Output phải là JSON hoặc cấu trúc XML hợp lệ như đã định nghĩa. TUÂN THỦ NGHIÊM NGẶT SỐ TỪ TỪ ${minWords} ĐẾN ${maxWords} TỪ TRONG <content>)
  `;
};
