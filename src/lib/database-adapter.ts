import { type Property, type HistoryEntry } from '@/lib/types';
import ENV_CONFIG from '@/lib/config';

// Abstract database interface
export interface DatabaseAdapter {
  // Property operations
  getAllProperties(): Promise<Property[]>;
  saveProperties(properties: Property[]): Promise<void>;
  updateProperty(property: Property): Promise<void>;
  deleteProperty(propertyId: string): Promise<void>;
  bulkDeleteProperties(propertyIds: string[]): Promise<{ deletedCount: number; notFoundCount: number }>;
  
  // History operations
  getAllHistory(): Promise<HistoryEntry[]>;
  saveHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'date'>): Promise<void>;
  clearHistory(): Promise<void>;
  
  // Utility operations
  clearAllData(): Promise<void>;
  getStats(): Promise<{ propertyCount: number; historyCount: number }>;
}

// Filesystem adapter (for development)
class FilesystemAdapter implements DatabaseAdapter {
  private dbPath = './data/properties.json';
  private historyPath = './data/history.json';

  async getAllProperties(): Promise<Property[]> {
    if (typeof window !== 'undefined') {
      throw new Error('Filesystem operations not available on client side');
    }
    
    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');
      const fullPath = path.join(process.cwd(), this.dbPath);
      const data = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async saveProperties(properties: Property[]): Promise<void> {
    if (typeof window !== 'undefined') {
      throw new Error('Filesystem operations not available on client side');
    }
    
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const fullPath = path.join(process.cwd(), this.dbPath);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(properties, null, 2), 'utf-8');
  }

  async updateProperty(property: Property): Promise<void> {
    const properties = await this.getAllProperties();
    const index = properties.findIndex(p => p.id === property.id);
    if (index !== -1) {
      properties[index] = property;
      await this.saveProperties(properties);
    } else {
      throw new Error(`Property with id ${property.id} not found`);
    }
  }

  async deleteProperty(propertyId: string): Promise<void> {
    const properties = await this.getAllProperties();
    const filtered = properties.filter(p => p.id !== propertyId);
    await this.saveProperties(filtered);
  }

  async bulkDeleteProperties(propertyIds: string[]): Promise<{ deletedCount: number; notFoundCount: number }> {
    const properties = await this.getAllProperties();
    const idsSet = new Set(propertyIds);
    const filtered = properties.filter(p => !idsSet.has(p.id));
    
    const deletedCount = properties.length - filtered.length;
    const notFoundCount = propertyIds.length - deletedCount;
    
    await this.saveProperties(filtered);
    return { deletedCount, notFoundCount };
  }

  async getAllHistory(): Promise<HistoryEntry[]> {
    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');
      const fullPath = path.join(process.cwd(), this.historyPath);
      const data = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async saveHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'date'>): Promise<void> {
    const history = await this.getAllHistory();
    const newEntry: HistoryEntry = {
      ...entry,
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString()
    };
    history.push(newEntry);
    
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const fullPath = path.join(process.cwd(), this.historyPath);
    
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(history, null, 2), 'utf-8');
  }

  async clearHistory(): Promise<void> {
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const fullPath = path.join(process.cwd(), this.historyPath);
    
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify([], null, 2), 'utf-8');
  }

  async clearAllData(): Promise<void> {
    await this.saveProperties([]);
    await this.saveHistoryEntry({
      type: 'BULK',
      propertyCount: 0,
      details: 'All data cleared'
    });
  }

  async getStats(): Promise<{ propertyCount: number; historyCount: number }> {
    const [properties, history] = await Promise.all([
      this.getAllProperties(),
      this.getAllHistory()
    ]);
    return {
      propertyCount: properties.length,
      historyCount: history.length
    };
  }
}

// In-memory adapter (for serverless/production without database)
class InMemoryAdapter implements DatabaseAdapter {
  private properties: Property[] = [];
  private history: HistoryEntry[] = [];
  private initialized = false;

  private async initialize() {
    if (this.initialized) return;
    
    // Try to load initial data from environment or API
    try {
      if (typeof window !== 'undefined') {
        // Client-side: load from localStorage
        const storedProps = localStorage.getItem('freerooom_properties');
        const storedHistory = localStorage.getItem('freerooom_history');
        
        if (storedProps) this.properties = JSON.parse(storedProps);
        if (storedHistory) this.history = JSON.parse(storedHistory);
      }
    } catch (error) {
      console.warn('Could not load initial data:', error);
    }
    
    this.initialized = true;
  }

  private async persist() {
    if (typeof window !== 'undefined') {
      // Client-side: save to localStorage
      localStorage.setItem('freerooom_properties', JSON.stringify(this.properties));
      localStorage.setItem('freerooom_history', JSON.stringify(this.history));
    }
  }

  async getAllProperties(): Promise<Property[]> {
    await this.initialize();
    return [...this.properties];
  }

  async saveProperties(properties: Property[]): Promise<void> {
    await this.initialize();
    this.properties = [...properties];
    await this.persist();
  }

  async updateProperty(property: Property): Promise<void> {
    await this.initialize();
    const index = this.properties.findIndex(p => p.id === property.id);
    if (index !== -1) {
      this.properties[index] = property;
    } else {
      this.properties.push(property);
    }
    await this.persist();
  }

  async deleteProperty(propertyId: string): Promise<void> {
    await this.initialize();
    this.properties = this.properties.filter(p => p.id !== propertyId);
    await this.persist();
  }

  async bulkDeleteProperties(propertyIds: string[]): Promise<{ deletedCount: number; notFoundCount: number }> {
    await this.initialize();
    const idsSet = new Set(propertyIds);
    const beforeCount = this.properties.length;
    this.properties = this.properties.filter(p => !idsSet.has(p.id));
    
    const deletedCount = beforeCount - this.properties.length;
    const notFoundCount = propertyIds.length - deletedCount;
    
    await this.persist();
    return { deletedCount, notFoundCount };
  }

  async getAllHistory(): Promise<HistoryEntry[]> {
    await this.initialize();
    return [...this.history];
  }

  async saveHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'date'>): Promise<void> {
    await this.initialize();
    const newEntry: HistoryEntry = {
      ...entry,
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString()
    };
    this.history.push(newEntry);
    await this.persist();
  }

  async clearHistory(): Promise<void> {
    await this.initialize();
    this.history = [];
    await this.persist();
  }

  async clearAllData(): Promise<void> {
    await this.initialize();
    this.properties = [];
    this.history = [];
    await this.persist();
  }

  async getStats(): Promise<{ propertyCount: number; historyCount: number }> {
    await this.initialize();
    return {
      propertyCount: this.properties.length,
      historyCount: this.history.length
    };
  }
}

// Database adapter factory
export function createDatabaseAdapter(): DatabaseAdapter {
  if (ENV_CONFIG.isServerless() || ENV_CONFIG.STORAGE_TYPE === 'memory') {
    console.log('📁 Using In-Memory database adapter');
    return new InMemoryAdapter();
  }
  
  if (ENV_CONFIG.STORAGE_TYPE === 'filesystem' || ENV_CONFIG.isDevelopment()) {
    console.log('📁 Using Filesystem database adapter');
    return new FilesystemAdapter();
  }
  
  // TODO: Add MongoDB, PostgreSQL, Firebase adapters here
  throw new Error(`Unsupported storage type: ${ENV_CONFIG.STORAGE_TYPE}`);
}

// Singleton instance
let dbInstance: DatabaseAdapter | null = null;

export function getDatabase(): DatabaseAdapter {
  if (!dbInstance) {
    dbInstance = createDatabaseAdapter();
  }
  return dbInstance;
}
