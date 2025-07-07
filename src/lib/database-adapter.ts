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

// Firebase Firestore adapter (for production)
class FirestoreAdapter implements DatabaseAdapter {
  private collectionName = 'properties';
  private historyCollectionName = 'history';
  private db: any = null;

  private async getFirestore() {
    if (!this.db) {
      try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        this.db = getFirebaseFirestore();
        console.log('✅ Firestore initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Firestore:', error);
        throw error;
      }
    }
    return this.db;
  }

  async getAllProperties(): Promise<Property[]> {
    try {
      const db = await this.getFirestore();
      const { collection, getDocs } = await import('firebase/firestore');
      
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      const properties: Property[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        properties.push({
          ...data,
          id: doc.id
        } as Property);
      });
      
      console.log(`✅ Loaded ${properties.length} properties from Firestore`);
      return properties;
    } catch (error) {
      console.error('❌ Error loading properties from Firestore:', error);
      return [];
    }
  }

  async saveProperties(properties: Property[]): Promise<void> {
    if (properties.length === 0) return;
    
    console.log(`🔍 FirestoreAdapter.saveProperties called with ${properties.length} properties`);
    
    try {
      const db = await this.getFirestore();
      const { collection, doc, setDoc } = await import('firebase/firestore');
      
      console.log(`📝 Starting to save ${properties.length} properties to Firestore...`);
      
      const batch = [];
      for (const property of properties) {
        console.log(`📝 Preparing to save property: ${property.id} - "${property.title}"`);
        const docRef = doc(collection(db, this.collectionName), property.id);
        batch.push(setDoc(docRef, property));
      }
      
      console.log(`🚀 Executing ${batch.length} Firestore operations...`);
      await Promise.all(batch);
      console.log(`✅ Successfully saved ${properties.length} properties to Firestore`);
    } catch (error) {
      console.error('❌ Error saving properties to Firestore:', error);
      throw error;
    }
  }

  async updateProperty(property: Property): Promise<void> {
    try {
      const db = await this.getFirestore();
      const { collection, doc, setDoc } = await import('firebase/firestore');
      
      const docRef = doc(collection(db, this.collectionName), property.id);
      await setDoc(docRef, property);
      
      console.log(`✅ Updated property ${property.id} in Firestore`);
    } catch (error) {
      console.error('❌ Error updating property in Firestore:', error);
      throw error;
    }
  }

  async deleteProperty(propertyId: string): Promise<void> {
    try {
      const db = await this.getFirestore();
      const { collection, doc, deleteDoc } = await import('firebase/firestore');
      
      const docRef = doc(collection(db, this.collectionName), propertyId);
      await deleteDoc(docRef);
      
      console.log(`✅ Deleted property ${propertyId} from Firestore`);
    } catch (error) {
      console.error('❌ Error deleting property from Firestore:', error);
      throw error;
    }
  }

  async bulkDeleteProperties(propertyIds: string[]): Promise<{ deletedCount: number; notFoundCount: number }> {
    if (propertyIds.length === 0) {
      return { deletedCount: 0, notFoundCount: 0 };
    }
    
    try {
      const db = await this.getFirestore();
      const { collection, doc, deleteDoc } = await import('firebase/firestore');
      
      let deletedCount = 0;
      let notFoundCount = 0;
      
      const deletePromises = propertyIds.map(async (propertyId) => {
        try {
          const docRef = doc(collection(db, this.collectionName), propertyId);
          await deleteDoc(docRef);
          deletedCount++;
        } catch (error) {
          console.error(`❌ Error deleting property ${propertyId}:`, error);
          notFoundCount++;
        }
      });
      
      await Promise.all(deletePromises);
      
      console.log(`✅ Bulk delete completed: ${deletedCount} deleted, ${notFoundCount} not found`);
      return { deletedCount, notFoundCount };
    } catch (error) {
      console.error('❌ Error in bulk delete from Firestore:', error);
      return { deletedCount: 0, notFoundCount: propertyIds.length };
    }
  }

  async getAllHistory(): Promise<HistoryEntry[]> {
    try {
      const db = await this.getFirestore();
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
      
      const q = query(collection(db, this.historyCollectionName), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const history: HistoryEntry[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          ...data,
          id: doc.id,
          date: data.date.toDate() // Convert Firestore timestamp to Date
        } as HistoryEntry);
      });
      
      console.log(`✅ Loaded ${history.length} history entries from Firestore`);
      return history;
    } catch (error) {
      console.error('❌ Error loading history from Firestore:', error);
      return [];
    }
  }

  async saveHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'date'>): Promise<void> {
    try {
      const db = await this.getFirestore();
      const { collection, addDoc, Timestamp } = await import('firebase/firestore');
      
      const historyEntry = {
        ...entry,
        date: Timestamp.now()
      };
      
      await addDoc(collection(db, this.historyCollectionName), historyEntry);
      console.log(`✅ Saved history entry to Firestore`);
    } catch (error) {
      console.error('❌ Error saving history entry to Firestore:', error);
      throw error;
    }
  }

  async clearHistory(): Promise<void> {
    try {
      const db = await this.getFirestore();
      const { collection, getDocs, deleteDoc } = await import('firebase/firestore');
      
      const querySnapshot = await getDocs(collection(db, this.historyCollectionName));
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      
      await Promise.all(deletePromises);
      console.log(`✅ Cleared ${querySnapshot.size} history entries from Firestore`);
    } catch (error) {
      console.error('❌ Error clearing history from Firestore:', error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      const db = await this.getFirestore();
      const { collection, getDocs, deleteDoc } = await import('firebase/firestore');
      
      // Clear properties
      const propertiesSnapshot = await getDocs(collection(db, this.collectionName));
      const propertiesDeletePromises = propertiesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      
      // Clear history
      const historySnapshot = await getDocs(collection(db, this.historyCollectionName));
      const historyDeletePromises = historySnapshot.docs.map(doc => deleteDoc(doc.ref));
      
      await Promise.all([...propertiesDeletePromises, ...historyDeletePromises]);
      
      console.log(`✅ Cleared all data from Firestore (${propertiesSnapshot.size} properties, ${historySnapshot.size} history entries)`);
    } catch (error) {
      console.error('❌ Error clearing all data from Firestore:', error);
      throw error;
    }
  }

  async getStats(): Promise<{ propertyCount: number; historyCount: number }> {
    try {
      const db = await this.getFirestore();
      const { collection, getCountFromServer } = await import('firebase/firestore');
      
      const [propertiesCount, historyCount] = await Promise.all([
        getCountFromServer(collection(db, this.collectionName)),
        getCountFromServer(collection(db, this.historyCollectionName))
      ]);
      
      const stats = {
        propertyCount: propertiesCount.data().count,
        historyCount: historyCount.data().count
      };
      
      console.log(`✅ Firestore stats: ${stats.propertyCount} properties, ${stats.historyCount} history entries`);
      return stats;
    } catch (error) {
      console.error('❌ Error getting stats from Firestore:', error);
      return { propertyCount: 0, historyCount: 0 };
    }
  }
}

// In-memory adapter (for fallback/testing)
class InMemoryAdapter implements DatabaseAdapter {
  private properties: Property[] = [];
  private history: HistoryEntry[] = [];

  async getAllProperties(): Promise<Property[]> {
    return [...this.properties];
  }

  async saveProperties(properties: Property[]): Promise<void> {
    this.properties = [...properties];
  }

  async updateProperty(property: Property): Promise<void> {
    const index = this.properties.findIndex(p => p.id === property.id);
    if (index >= 0) {
      this.properties[index] = property;
    } else {
      this.properties.push(property);
    }
  }

  async deleteProperty(propertyId: string): Promise<void> {
    this.properties = this.properties.filter(p => p.id !== propertyId);
  }

  async bulkDeleteProperties(propertyIds: string[]): Promise<{ deletedCount: number; notFoundCount: number }> {
    let deletedCount = 0;
    propertyIds.forEach(id => {
      const index = this.properties.findIndex(p => p.id === id);
      if (index >= 0) {
        this.properties.splice(index, 1);
        deletedCount++;
      }
    });
    return { deletedCount, notFoundCount: propertyIds.length - deletedCount };
  }

  async getAllHistory(): Promise<HistoryEntry[]> {
    return [...this.history];
  }

  async saveHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'date'>): Promise<void> {
    const historyEntry: HistoryEntry = {
      ...entry,
      id: `hist-${Date.now()}`,
      date: new Date().toISOString(),
    };
    this.history.unshift(historyEntry);
  }

  async clearHistory(): Promise<void> {
    this.history = [];
  }

  async clearAllData(): Promise<void> {
    this.properties = [];
    this.history = [];
  }

  async getStats(): Promise<{ propertyCount: number; historyCount: number }> {
    return {
      propertyCount: this.properties.length,
      historyCount: this.history.length
    };
  }
}

// Database adapter factory
export function createDatabaseAdapter(): DatabaseAdapter {
  console.log(`🔍 Creating database adapter with ENV_CONFIG:`, {
    NODE_ENV: ENV_CONFIG.NODE_ENV,
    STORAGE_TYPE: ENV_CONFIG.STORAGE_TYPE,
    isServerless: ENV_CONFIG.isServerless(),
    isDevelopment: ENV_CONFIG.isDevelopment(),
    FIREBASE_PROJECT_ID: ENV_CONFIG.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  });
  
  if (ENV_CONFIG.isServerless() || ENV_CONFIG.STORAGE_TYPE === 'memory') {
    console.log('📁 Using In-Memory database adapter');
    return new InMemoryAdapter();
  }
  
  if (ENV_CONFIG.STORAGE_TYPE === 'filesystem' || ENV_CONFIG.isDevelopment()) {
    console.log('📁 Using Filesystem database adapter');
    return new FilesystemAdapter();
  }
  
  // Add database storage types
  if (ENV_CONFIG.STORAGE_TYPE === 'database' || ENV_CONFIG.STORAGE_TYPE === 'firestore') {
    if (ENV_CONFIG.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.log('📁 Using Firestore database adapter');
      return new FirestoreAdapter();
    }
    console.log('⚠️ Database storage requested but no Firebase configured, using in-memory');
    return new InMemoryAdapter();
  }
  
  console.log(`⚠️ Unknown storage type: ${ENV_CONFIG.STORAGE_TYPE}, using in-memory adapter`);
  return new InMemoryAdapter();
}

// Singleton instance
let dbInstance: DatabaseAdapter | null = null;

export function getDatabase(): DatabaseAdapter {
  console.log('🔍 getDatabase() called');
  if (!dbInstance) {
    console.log('🏗️ Creating new database adapter instance...');
    dbInstance = createDatabaseAdapter();
    console.log('✅ Database adapter instance created');
  } else {
    console.log('♻️ Reusing existing database adapter instance');
  }
  return dbInstance;
}
