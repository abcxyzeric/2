
export const TAWA_REGEX = {
  // Bắt nội dung trong thẻ <thinking>...</thinking>
  // ([\s\S]*?) để bắt cả xuống dòng, non-greedy
  THINKING: /<thinking>([\s\S]*?)<\/thinking>/,

  // Bắt nội dung trong thẻ <content>...</content>
  CONTENT: /<content>([\s\S]*?)<\/content>/,

  // Dùng để xóa thẻ thinking khỏi chuỗi (replace) - Chỉ match cái đầu tiên
  STRIP_THINKING: /<thinking>[\s\S]*?<\/thinking>/,

  // Dùng để xóa TOÀN BỘ thẻ thinking khỏi chuỗi (Global flag)
  GLOBAL_THINKING_STRIP: /<thinking>[\s\S]*?<\/thinking>/g,

  // Bắt nội dung trong thẻ <choices>...</choices>
  CHOICES: /<choices>([\s\S]*?)<\/choices>/,

  // Dùng để xóa thẻ choices khỏi chuỗi hiển thị chính
  STRIP_CHOICES: /<choices>[\s\S]*?<\/choices>/,

  // Regex để xóa các đoạn kiểm tra tiến độ và bảng trạng thái rác
  ARTIFACTS_REMOVAL: [
    /\[(?:KIỂM TRA|CHECKING|TIẾN ĐỘ|PROGRESS|Hệ thống)[^\]]*\]/gi,
    /^\s*\((?:Tiếp tục|Lưu ý|Note|Chuyển sang|Kết thúc|Giai đoạn)[^)]*\).*$/gm,
    /(?:^\s*\*[^*\n]+:.*\n){2,}/gm, // Bắt bảng trạng thái list > 2 dòng
    /^\s*\*Ngày \d+.*lưu lạc.*\*\s*$/gmi,
    // Bắt các dòng meta-commentary về số từ, tình trạng văn bản, suy nghĩ của AI bị lọt ra ngoài
    /^\s*(?:Tình trạng văn bản|Khối lượng từ|Tôi cần bổ sung|Để đảm bảo chất lượng|Token Limit warning|Mục tiêu:).*$/gmi,
    // --- NEW: Hide System Modules Output ---
    /^seeds:[\s\S]*?(?=\n\n|$)/gim,      // Ẩn module Phục bút
    /^relation:[\s\S]*?(?=\n\n|$)/gim,   // Ẩn module Quan hệ
    /^enigma:[\s\S]*?(?=\n\n|$)/gim,     // Ẩn module Hồ sơ mật
    /^echoes:[\s\S]*?(?=\n\n|$)/gim,      // Ẩn module Echoes
    // --- NEW: Hide Word Count Logic ---
    /<word_count>[\s\S]*?<\/word_count>/gi // Ẩn thẻ đếm từ và nội dung bên trong
  ],

  // Regex xóa ký tự * (để "Sột soạt" hiển thị bình thường thay vì "*Sột soạt*")
  ASTERISK_REMOVAL: /\*/g
};
