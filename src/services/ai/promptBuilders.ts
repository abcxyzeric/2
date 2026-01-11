
import { TAWA_IDENTITY, TAWA_OUTPUT_FORMAT } from '../../constants/tawa_protocol';
import { GameConfig, TawaPresetConfig, PromptModule, PromptPosition } from '../../types';

// --- V2 ARCHITECTURE CONSTANTS ---

// Định nghĩa mức độ ưu tiên dựa trên chiều sâu (Depth)
// Giá trị càng cao -> Càng nằm gần cuối prompt -> LLM càng chú ý (Recency Bias)
const POSITION_PRIORITY: Record<PromptPosition, number> = {
    'top': 0,
    'system': 10,
    'persona': 20,
    'bottom': 30,
    'final': 40 // Mới thêm: Vị trí cuối cùng (cho Seal, Anti-cut)
};

// Interface cho một đoạn prompt đã được xử lý
interface PromptSegment {
    content: string;
    priority: number;
    source?: string; // Để debug
}

// --- HELPER FUNCTIONS ---

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

// Prompt cho World Creation
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
 * Hàm Prompt Gameplay Chính (REFACTORED V2 - TAWA ULTIMATE)
 * Sử dụng kiến trúc Data-Driven Injection & Granular Modules
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
  // --- BƯỚC 1: KHỞI TẠO BIẾN (VARIABLE MAP) ---
  
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

  // Khởi tạo Map biến số với các giá trị mặc định & Config
  const variables: Record<string, string> = {
      'word_min': String(minWords),
      'word_max': String(maxWords),
      'output_language': 'Tiếng Việt',
      // Khởi tạo các key injection phổ biến để tránh lỗi undefined khi replace
      '42': '',
      'Tiên Đề Thế Giới': '',
      '<Writing_Style>': '',
      'POV_rules': '',
      'thinking_chain': '',
      'anti_rules': '',
      'npc_logic': '',
      'Quan hệ nhân vật': '',
      'enigma': '',
      'seeds': '',
      'outside_cot': '',
      'meow_FM': '',
      'nsfw_thinking_chain': ''
  };

  const activeModules = presetConfig.modules.filter(m => m.isActive);
  const segments: PromptSegment[] = [];

  // --- BƯỚC 2: QUÉT MODULE & INJECTION ---
  
  activeModules.forEach(mod => {
      // CASE A: Module có injectKey (Nội dung sẽ được bắn vào biến)
      if (mod.injectKey) {
          const key = mod.injectKey;
          // Nếu biến đã có dữ liệu -> Nối thêm (Append) để xử lý Multiple Injection
          if (variables[key]) {
              variables[key] += "\n" + mod.content;
          } else {
              variables[key] = mod.content;
          }
      } 
      // CASE B: Module đứng độc lập (Đẩy vào mảng Segment)
      else {
          const priority = mod.position ? POSITION_PRIORITY[mod.position] : POSITION_PRIORITY['system'];
          segments.push({
              priority: priority,
              content: mod.content,
              source: `Module:${mod.id}`
          });
      }
  });

  // --- BƯỚC 3: XỬ LÝ SEGMENTS CỐ ĐỊNH (HARDCODED) ---
  
  // 1. Identity & Output Format (System Level)
  segments.push({
      priority: POSITION_PRIORITY['system'],
      content: `${TAWA_IDENTITY}\n${TAWA_OUTPUT_FORMAT}`,
      source: 'Identity & Format'
  });

  // 2. World Context (Persona Level)
  const worldContext = `
  === DỮ LIỆU THẾ GIỚI ===
  - Tên: ${worldSettings.worldName}
  - Thể loại: ${worldSettings.genre}
  - Bối cảnh: ${worldSettings.context}
  `;
  segments.push({ priority: POSITION_PRIORITY['persona'], content: worldContext, source: 'WorldData' });

  // 3. Player Context (Persona Level)
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

  // 4. Lorebook (Persona Level)
  const lorebook = `
  === LOREBOOK (NPC & ĐỊA ĐIỂM) ===
  ${entities.map((e: any) => `> [${e.type}] ${e.name}: ${e.description.substring(0, 300)}...`).join('\n')}
  `;
  segments.push({ priority: POSITION_PRIORITY['persona'], content: lorebook, source: 'Lorebook' });

  // 5. Memories (RAG) (Persona Level)
  segments.push({ 
      priority: POSITION_PRIORITY['persona'], 
      content: `=== KÝ ỨC LIÊN QUAN (RAG) ===\n${relevantMemories || "Chưa có ký ức nào."}`, 
      source: 'Memories' 
  });

  // 6. Difficulty & Perspective (System Level)
  const difficultyPrompt = `=== THIẾT LẬP ĐỘ KHÓ (${gameConfig.difficulty.label}) ===\n${gameConfig.difficulty.prompt}`;
  segments.push({ priority: POSITION_PRIORITY['system'], content: difficultyPrompt, source: 'Difficulty' });

  const perspectivePrompt = `=== GÓC NHÌN KỂ CHUYỆN (BẮT BUỘC) ===\n${getPerspectivePrompt(gameConfig.perspective || 'third', playerProfile.name)}`;
  segments.push({ priority: POSITION_PRIORITY['system'], content: perspectivePrompt, source: 'Perspective' });

  // 7. Mandatory Rules (System Level)
  const rulesContent = gameConfig.rules.length > 0 
      ? gameConfig.rules.map((r: string, idx: number) => `${idx + 1}. ${r}`).join('\n') 
      : "Chưa có quy tắc bổ sung.";
  segments.push({ 
      priority: POSITION_PRIORITY['system'], 
      content: `=== LUẬT BẤT KHẢ KHÁNG (MANDATORY RULES) ===\n${rulesContent}`, 
      source: 'UserRules' 
  });

  // 8. Status (System/Bottom)
  segments.push({
      priority: POSITION_PRIORITY['bottom'] - 5,
      content: `=== TRẠNG THÁI HIỆN TẠI ===\n- Số lượt chơi (Turn): ${turnCount}`,
      source: 'GameStatus'
  });

  // --- BƯỚC 4: THAY THẾ BIẾN (VARIABLE REPLACEMENT) ---
  
  // Hàm replace cục bộ: Thay thế tất cả {{getvar::KEY}} hoặc {{getglobalvar::KEY}} bằng giá trị trong variables
  const replaceVariables = (text: string): string => {
      let processed = text;
      // Regex bắt cả getvar và getglobalvar
      // Group 1: key name
      const regex = /\{\{(?:getvar|getglobalvar)::(.*?)\}\}/g;
      
      processed = processed.replace(regex, (match, key) => {
          const cleanKey = key.trim();
          // Nếu biến tồn tại trong map -> thay thế. Nếu không -> giữ nguyên (hoặc thay bằng rỗng tùy logic, ở đây giữ rỗng cho sạch)
          return variables[cleanKey] !== undefined ? variables[cleanKey] : '';
      });
      return processed;
  };

  // Áp dụng replace cho tất cả Segments
  // Lưu ý: Các module chứa {{getvar}} (như COT hoặc Word Count) sẽ được điền dữ liệu tại đây
  segments.forEach(seg => {
      seg.content = replaceVariables(seg.content);
  });

  // --- BƯỚC 5: SẮP XẾP & KẾT XUẤT ---

  // Sắp xếp mảng segments theo priority tăng dần
  // Top -> System -> Persona -> Bottom -> Final
  segments.sort((a, b) => a.priority - b.priority);

  // Nối chuỗi
  const finalPrompt = segments.map(s => s.content).join('\n\n');

  // Thêm lời nhắc cuối cùng (Safety Net)
  return finalPrompt + `\n\n(NHẮC LẠI: TUÂN THỦ NGHIÊM NGẶT SỐ TỪ TỪ ${minWords} ĐẾN ${maxWords} TỪ TRONG <content>)`;
};
