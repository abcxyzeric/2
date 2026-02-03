export enum AppView {
  MAIN_MENU = 'MAIN_MENU',
  GAMEPLAY = 'GAMEPLAY',
  WORLD_CREATION = 'WORLD_CREATION',
  SETTINGS = 'SETTINGS',
}

export enum AppTheme {
  DEFAULT = 'DEFAULT',
  MIDNIGHT = 'MIDNIGHT',
  FOREST = 'FOREST',
  CRIMSON = 'CRIMSON',
  AMBER = 'AMBER',
  ROYAL = 'ROYAL',
}

export enum ThinkingLevel {
  AUTO = 'AUTO',
  MINIMUM = 'MINIMUM',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  MAXIMUM = 'MAXIMUM',
}

export enum AIModel {
  GEMINI_3_PRO_PREVIEW = 'gemini-3-pro-preview',
  GEMINI_3_FLASH_PREVIEW = 'gemini-3-flash-preview',
  GEMINI_2_5_PRO = 'gemini-2.0-pro-exp-02-05',
}

export interface AIConfig {
  contextSize: number;
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
  thinkingLevel: ThinkingLevel;
  
  // New Fields
  model: string; 
  proxyName: string;
  proxyUrl: string;
  proxyPassword: string;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  contextSize: 2000000,
  temperature: 1.15,
  topK: 500,
  topP: 0.95,
  maxOutputTokens: 65000,
  thinkingLevel: ThinkingLevel.MAXIMUM,
  
  // Default values for new fields
  model: AIModel.GEMINI_3_PRO_PREVIEW,
  proxyName: 'None',
  proxyUrl: '',
  proxyPassword: '',
};

// New Data Structure for structured items
export interface DataItem {
  name: string;       // Title/Name
  description: string; // Content/Body
}

export interface Persona {
  name: string;
  age: string;
  gender: string;
  personality: string;
  background: string;
  appearance: string;
  skills: DataItem[]; // Changed from string[] to DataItem[]
  goals: string;
  hobbies: string;
}

export const INITIAL_PERSONA: Persona = {
  name: '',
  age: '',
  gender: '',
  personality: '',
  background: '',
  appearance: '',
  skills: [],
  goals: '',
  hobbies: '',
};

export interface WorldInfo {
  genre: string;
  worldName: string;
  worldContext: string;
  npcs: DataItem[];      // Changed from string[] to DataItem[]
  entities: DataItem[];  // Changed from string[] to DataItem[]
}

export interface UniversePayload {
  persona: Persona;
  worldInfo: WorldInfo;
}

// --- Gameplay & Preset Types ---

export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
}

export interface PromptDefinition {
  name: string;
  system_prompt: boolean;
  role: 'system' | 'user' | 'assistant';
  content: string;
  identifier: string;
  injection_position?: number; // 0: Relative, 1: Absolute
  injection_depth?: number;
  injection_order?: number;
  enabled?: boolean;
}

export interface Preset {
  name?: string;
  temperature: number;
  top_p?: number;
  top_k?: number;
  repetition_penalty?: number; // Mapped to frequency_penalty if needed
  prompts: PromptDefinition[];
  prompt_order: { identifier: string; enabled: boolean; character_id?: number; order?: any[] }[]; // Simplified for this app
}

export interface GameSession {
  messages: Message[];
  activePreset: Preset | null;
  persona: Persona;
  worldInfo: WorldInfo;
  isProcessing: boolean;
}

export const PREDEFINED_GENRES = [
  "Huyền Huyễn (Xianxia)", "Kiếm Hiệp (Wuxia)", "Cyberpunk", "Hậu Tận Thế (Post-Apocalyptic)",
  "Kỳ Ảo Phương Tây (Western Fantasy)", "Đô Thị Dị Năng (Urban Fantasy)", 
  "Kinh Dị Lovecraft (Lovecraftian Horror)", "Steampunk", "Khoa Học Viễn Tưởng (Sci-Fi)",
  "Slice of Life (Đời Thường)"
];

export const INITIAL_WORLD_INFO: WorldInfo = {
  genre: '',
  worldName: '',
  worldContext: '',
  npcs: [],
  entities: []
};