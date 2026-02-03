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