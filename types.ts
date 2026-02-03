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

export interface AIConfig {
  contextSize: number;
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
  thinkingLevel: ThinkingLevel;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  contextSize: 2000000,
  temperature: 1.15,
  topK: 500,
  topP: 0.95,
  maxOutputTokens: 65000,
  thinkingLevel: ThinkingLevel.AUTO,
};

export interface Persona {
  name: string;
  age: string;
  gender: string;
  personality: string;
  background: string;
  appearance: string;
  skills: string[];
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