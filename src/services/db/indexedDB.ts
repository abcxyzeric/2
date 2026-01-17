
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AppSettings, SaveFile, SystemLog } from '../../types';
import { DEFAULT_SAFETY_SETTINGS } from '../../constants/promptTemplates';

export interface VectorData {
  id: string;
  text: string;
  embedding: number[];
  timestamp: number;
  role: 'user' | 'model'; // Added to distinguish who said what
}

interface RPGDatabase extends DBSchema {
  saves: {
    key: string;
    value: SaveFile;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  logs: {
    key: number;
    value: SystemLog;
    autoIncrement: true;
  };
  vectors: {
    key: string;
    value: VectorData;
  };
}

const DB_NAME = 'aetheria-rpg-db';
const DB_VERSION = 2; // Upgraded version

class DatabaseService {
  private dbPromise: Promise<IDBPDatabase<RPGDatabase>>;

  constructor() {
    this.dbPromise = openDB<RPGDatabase>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('logs')) {
          db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
        }
        // Task 3.1: Add vectors store
        if (!db.objectStoreNames.contains('vectors')) {
          const vectorStore = db.createObjectStore('vectors', { keyPath: 'id' });
          // Optional: Add index for timestamp if needed for cleanup later
          vectorStore.createIndex('timestamp', 'timestamp');
        }
      },
    });
  }

  async checkConnection(): Promise<boolean> {
    try {
      const db = await this.dbPromise;
      return !!db;
    } catch (error) {
      console.error("DB Connection Failed:", error);
      return false;
    }
  }

  async logEvent(message: string, type: 'info' | 'error' | 'warning' = 'info') {
    const db = await this.dbPromise;
    await db.add('logs', {
      timestamp: Date.now(),
      message,
      type
    } as SystemLog);
  }

  async getSettings(): Promise<AppSettings> {
    const db = await this.dbPromise;
    const settings = await db.get('settings', 'user_settings');
    
    const defaults: AppSettings = {
        soundVolume: 50,
        musicVolume: 50,
        theme: 'dark',
        fontSize: 'medium',
        safetySettings: DEFAULT_SAFETY_SETTINGS,
        aiModel: 'gemini-3-pro-preview',
        // Task 1: Ensure defaults support high context
        contextSize: 2000000, 
        maxOutputTokens: 65000, 
        temperature: 1.15,
        topK: 500,
        topP: 0.95,
        thinkingBudgetLevel: 'high',
        streamResponse: false 
    };

    if (!settings) {
        return defaults;
    }

    // Merge defaults with saved settings to ensure new fields exist
    return { ...defaults, ...settings };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.dbPromise;
    await db.put('settings', settings, 'user_settings');
  }

  async hasSaves(): Promise<boolean> {
    const db = await this.dbPromise;
    const count = await db.count('saves');
    return count > 0;
  }

  async saveGameState(saveData: SaveFile): Promise<void> {
    const db = await this.dbPromise;
    await db.put('saves', saveData);
  }

  async getAllSaves(): Promise<SaveFile[]> {
    const db = await this.dbPromise;
    return db.getAll('saves');
  }

  async deleteSave(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('saves', id);
  }

  // --- Vector Operations ---

  async saveVector(vectorData: VectorData): Promise<void> {
    const db = await this.dbPromise;
    await db.put('vectors', vectorData);
  }

  async getVector(id: string): Promise<VectorData | undefined> {
    const db = await this.dbPromise;
    return db.get('vectors', id);
  }

  async getAllVectors(): Promise<VectorData[]> {
    const db = await this.dbPromise;
    return db.getAll('vectors');
  }

  async hasVector(id: string): Promise<boolean> {
     const db = await this.dbPromise;
     const key = await db.getKey('vectors', id);
     return !!key;
  }
}

export const dbService = new DatabaseService();
