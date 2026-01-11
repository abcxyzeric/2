
import { TAWA_IDENTITY, TAWA_OUTPUT_FORMAT } from '../../constants/tawa_protocol';
import { GameConfig, TawaPresetConfig, PromptModule, PromptPosition } from '../../types';
import { generateWordCountPrompt } from '../../constants/promptTemplates';

// --- V2 ARCHITECTURE CONSTANTS ---

// Định nghĩa mức độ ưu tiên dựa trên chiều sâu (Depth)
// Giá trị càng cao -> Càng nằm gần cuối prompt -> LLM càng chú ý (Recency Bias)
const POSITION_PRIORITY: Record<PromptPosition, number> = {
    'top': 0,
    'system': 10,
    'persona': 20,
    'bottom': 30
};

// Interface cho một đoạn prompt đã được xử lý
interface PromptSegment {
    content: string;
    priority: number;
    source?: string; // Để debug (VD: 'Identity', 'Module: anti_rules')
}

// --- HELPER FUNCTIONS ---

/**
 * Hàm 1: Xử lý Dynamic Variable Injection
 * Quét toàn bộ text và thay thế {{getvar::KEY}} bằng content của module tương ứng HOẶC giá trị số học.
 */
const processDynamicInjection = (
    baseText: string, 
    activeModules: PromptModule[], 
    variables: Record<string, string | number>
): string => {
    let processedText = baseText;

    // 1. Thay thế các biến số học cơ bản (word_min, word_max...)
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{getvar::${key}\\}\\}`, 'g');
        processedText = processedText.replace(regex, String(value));
    }

    // 2. Thay thế các biến module (Dựa trên injectKey)
    // Ví dụ: {{getvar::anti_rules}} sẽ được thay bằng content của module có injectKey='anti_rules'
    activeModules.forEach(mod => {
        if (mod.injectKey) {
            // Escape special chars in key just in case, but usually keys are simple
            const safeKey = mod.injectKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\{\\{getvar::${safeKey}\\}\\}`, 'g');
            
            if (processedText.match(regex)) {
                processedText = processedText.replace(regex, mod.content);
            }
        }
    });

    // 3. Cleanup: Xóa các placeholder không tìm thấy giá trị thay thế (tránh để lại {{getvar::...}} rác)
    // processedText = processedText.replace(/\{\{getvar::.*?\}\}/g, ''); 
    // Comment out cleanup để dễ debug nếu thiếu module

    return processedText;
};

// Helper tạo prompt góc nhìn
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

// --- MAIN BUILDER FUNCTIONS ---

// Prompt cho World Creation (Giữ nguyên logic đơn giản)
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

/**
 * Hàm Prompt Gameplay Chính (REFACTORED V2)
 * Sử dụng kiến trúc Depth-Based Sorting & Dynamic Injection
 */
export const buildGameplaySystemPrompt = (
  worldSettings: any,
  playerProfile: any,
  entities: any[],
  relevantMemories: string,
  turnCount: number,
  presetConfig: TawaPresetConfig,
  gameConfig: GameConfig
) => {
  // --- BƯỚC 1: CHUẨN BỊ DỮ LIỆU ---
  
  // Xác định số từ
  let minWords = 1000;
  let maxWords = 5000;
  if (gameConfig.outputLength.id === 'custom') {
      minWords = gameConfig.customMinWords || 1000;
      maxWords = gameConfig.customMaxWords || (minWords + 2000);
  } else {
      minWords = gameConfig.outputLength.minWords;
      maxWords = minWords + 4000; 
  }

  // Lọc danh sách module đang hoạt động
  const activeModules = presetConfig.modules.filter(m => m.isActive);

  // Tạo Dictionary biến số cơ bản
  const baseVariables = {
      word_min: minWords,
      word_max: maxWords
  };

  // --- BƯỚC 2: XỬ LÝ DYNAMIC INJECTION CHO COT ---
  // Core COT thường chứa nhiều biến placeholders, cần xử lý trước tiên
  const rawCOT = presetConfig.cot.content;
  const processedCOT = processDynamicInjection(rawCOT, activeModules, baseVariables);

  // --- BƯỚC 3: XÂY DỰNG CÁC MẢNH PROMPT (SEGMENTS) ---
  const segments: PromptSegment[] = [];

  // A. HARDCODED SEGMENTS (Các thành phần cố định của hệ thống)

  // 1. Word Count (Top Priority - Luôn ở đầu để định hình format)
  segments.push({
      priority: -10, // Siêu ưu tiên (Top of Top)
      content: generateWordCountPrompt(minWords, maxWords),
      source: 'WordCountProtocol'
  });

  // 2. Identity & Output Format (System Level)
  segments.push({
      priority: POSITION_PRIORITY['system'],
      content: `${TAWA_IDENTITY}\n${TAWA_OUTPUT_FORMAT}`,
      source: 'Identity & Format'
  });

  // 3. World Context (Persona/Context Level)
  const worldContext = `
  === DỮ LIỆU THẾ GIỚI ===
  - Tên: ${worldSettings.worldName}
  - Thể loại: ${worldSettings.genre}
  - Bối cảnh: ${worldSettings.context}
  `;
  segments.push({ priority: POSITION_PRIORITY['persona'], content: worldContext, source: 'WorldData' });

  // 4. Player Context (Persona/Context Level)
  const playerContext = `
  === HỒ SƠ NHÂN VẬT CHÍNH (<user>) ===
  - Tên: ${playerProfile.name}
  - Tuổi: ${playerProfile.age}
  - Tính cách: ${playerProfile.personality}
  - Tiểu sử: ${playerProfile.background}
  - Kỹ năng: ${playerProfile.skills || "Chưa rõ"}
  - Mục tiêu: ${playerProfile.goal || "Sinh tồn"}
  `;
  segments.push({ priority: POSITION_PRIORITY['persona'], content: playerContext, source: 'PlayerData' });

  // 5. Lorebook (Persona/Context Level)
  const lorebook = `
  === LOREBOOK (NPC & ĐỊA ĐIỂM) ===
  ${entities.map((e: any) => `> [${e.type}] ${e.name}: ${e.description.substring(0, 300)}...`).join('\n')}
  `;
  segments.push({ priority: POSITION_PRIORITY['persona'], content: lorebook, source: 'Lorebook' });

  // 6. Memories (RAG) (Persona Level)
  segments.push({ 
      priority: POSITION_PRIORITY['persona'], 
      content: `=== KÝ ỨC LIÊN QUAN (RAG) ===\n${relevantMemories || "Chưa có ký ức nào."}`, 
      source: 'Memories' 
  });

  // 7. Difficulty & Perspective (System Level - Cần AI nhớ để điều chỉnh giọng văn)
  const difficultyPrompt = `=== THIẾT LẬP ĐỘ KHÓ (${gameConfig.difficulty.label}) ===\n${gameConfig.difficulty.prompt}`;
  segments.push({ priority: POSITION_PRIORITY['system'], content: difficultyPrompt, source: 'Difficulty' });

  const perspectivePrompt = `=== GÓC NHÌN KỂ CHUYỆN (BẮT BUỘC) ===\n${getPerspectivePrompt(gameConfig.perspective || 'third', playerProfile.name)}`;
  segments.push({ priority: POSITION_PRIORITY['system'], content: perspectivePrompt, source: 'Perspective' });

  // 8. Mandatory Rules (System Level - Override)
  const rulesContent = gameConfig.rules.length > 0 
      ? gameConfig.rules.map((r: string, idx: number) => `${idx + 1}. ${r}`).join('\n') 
      : "Chưa có quy tắc bổ sung.";
  segments.push({ 
      priority: POSITION_PRIORITY['system'], 
      content: `=== LUẬT BẤT KHẢ KHÁNG (MANDATORY RULES) ===\n${rulesContent}`, 
      source: 'UserRules' 
  });

  // 9. Status (System/Bottom)
  segments.push({
      priority: POSITION_PRIORITY['bottom'] - 5, // Gần cuối
      content: `=== TRẠNG THÁI HIỆN TẠI ===\n- Số lượt chơi (Turn): ${turnCount}`,
      source: 'GameStatus'
  });

  // B. DYNAMIC MODULE SEGMENTS (Các module bổ sung)
  
  activeModules.forEach(mod => {
      // Chỉ thêm các module KHÔNG có injectKey (vì module có injectKey đã được tiêm vào COT rồi)
      if (!mod.injectKey) {
          const priority = mod.position ? POSITION_PRIORITY[mod.position] : POSITION_PRIORITY['system'];
          segments.push({
              priority: priority,
              content: `\n=== MODULE: ${mod.label} ===\n${mod.content}`,
              source: `Module:${mod.id}`
          });
      }
  });

  // C. CORE COT (ABSOLUTE LAST PRIORITY)
  // COT chứa logic xử lý quan trọng nhất, cần nằm cuối cùng để AI "nhớ" và thực hiện ngay lập tức
  segments.push({
      priority: 100, // Max Priority
      content: `=== QUY TRÌNH TƯ DUY BẮT BUỘC (COT - EXECUTION CORE) ===\n${processedCOT}`,
      source: 'CoreCOT'
  });

  // --- BƯỚC 4: SẮP XẾP & GHÉP CHUỖI (DEPTH-BASED SORTING) ---

  // Sắp xếp mảng segments theo priority tăng dần
  // (Priority thấp = Đầu prompt, Priority cao = Cuối prompt)
  segments.sort((a, b) => a.priority - b.priority);

  // Nối chuỗi
  const finalPrompt = segments.map(s => s.content).join('\n\n');

  // Thêm lời nhắc cuối cùng (Safety Net)
  return finalPrompt + `\n\n(NHẮC LẠI: Output phải là JSON hoặc cấu trúc XML hợp lệ như đã định nghĩa. TUÂN THỦ NGHIÊM NGẶT SỐ TỪ TỪ ${minWords} ĐẾN ${maxWords} TỪ TRONG <content>)`;
};
