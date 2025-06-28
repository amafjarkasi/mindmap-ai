import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { authService } from './auth';
import type { MindMapData, MindMapMetadata, FilterOptions, SearchOptions } from '@types/index';

class MindMapStorageService {
  private readonly COLLECTION_NAME = 'mindmaps';
  private autoSaveTimeouts: Map<string, NodeJS.Timeout> = new Map();

  async saveMindMap(mindMapData: Omit<MindMapData, 'id'>): Promise<string> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated to save mind maps');
    }

    try {
      const now = new Date().toISOString();
      const dataToSave = {
        ...mindMapData,
        metadata: {
          ...mindMapData.metadata,
          author: user.uid,
          created: mindMapData.metadata.created || now,
          modified: now,
          version: (mindMapData.metadata.version || 0) + 1
        }
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), dataToSave);
      return docRef.id;
    } catch (error) {
      console.error('Error saving mind map:', error);
      throw new Error('Failed to save mind map. Please try again.');
    }
  }

  async updateMindMap(id: string, updates: Partial<MindMapData>): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated to update mind maps');
    }

    try {
      const mindMapRef = doc(db, this.COLLECTION_NAME, id);
      const mindMapDoc = await getDoc(mindMapRef);
      
      if (!mindMapDoc.exists()) {
        throw new Error('Mind map not found');
      }

      const mindMapData = mindMapDoc.data() as MindMapData;
      
      // Check if user has permission to edit
      if (mindMapData.metadata.author !== user.uid && 
          !mindMapData.metadata.collaborators?.some(c => c.userId === user.uid && c.role !== 'viewer')) {
        throw new Error('You do not have permission to edit this mind map');
      }

      const updateData = {
        ...updates,
        metadata: {
          ...mindMapData.metadata,
          ...updates.metadata,
          modified: new Date().toISOString(),
          version: mindMapData.metadata.version + 1
        }
      };

      await updateDoc(mindMapRef, updateData);
    } catch (error) {
      console.error('Error updating mind map:', error);
      throw new Error('Failed to update mind map. Please try again.');
    }
  }

  async deleteMindMap(id: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated to delete mind maps');
    }

    try {
      const mindMapRef = doc(db, this.COLLECTION_NAME, id);
      const mindMapDoc = await getDoc(mindMapRef);
      
      if (!mindMapDoc.exists()) {
        throw new Error('Mind map not found');
      }

      const mindMapData = mindMapDoc.data() as MindMapData;
      
      // Only author can delete
      if (mindMapData.metadata.author !== user.uid) {
        throw new Error('You do not have permission to delete this mind map');
      }

      await deleteDoc(mindMapRef);
    } catch (error) {
      console.error('Error deleting mind map:', error);
      throw new Error('Failed to delete mind map. Please try again.');
    }
  }

  async getMindMap(id: string): Promise<MindMapData | null> {
    try {
      const mindMapRef = doc(db, this.COLLECTION_NAME, id);
      const mindMapDoc = await getDoc(mindMapRef);
      
      if (!mindMapDoc.exists()) {
        return null;
      }

      const data = mindMapDoc.data() as Omit<MindMapData, 'id'>;
      return { id: mindMapDoc.id, ...data };
    } catch (error) {
      console.error('Error getting mind map:', error);
      throw new Error('Failed to load mind map. Please try again.');
    }
  }

  async getUserMindMaps(userId?: string): Promise<MindMapData[]> {
    const user = authService.getCurrentUser();
    const targetUserId = userId || user?.uid;
    
    if (!targetUserId) {
      throw new Error('User ID is required');
    }

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('metadata.author', '==', targetUserId),
        orderBy('metadata.modified', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MindMapData));
    } catch (error) {
      console.error('Error getting user mind maps:', error);
      throw new Error('Failed to load mind maps. Please try again.');
    }
  }

  async getSharedMindMaps(): Promise<MindMapData[]> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('metadata.collaborators', 'array-contains', {
          userId: user.uid,
          role: 'editor'
        }),
        orderBy('metadata.modified', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MindMapData));
    } catch (error) {
      console.error('Error getting shared mind maps:', error);
      throw new Error('Failed to load shared mind maps. Please try again.');
    }
  }

  async getPublicMindMaps(limitCount: number = 20): Promise<MindMapData[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('metadata.isPublic', '==', true),
        orderBy('metadata.modified', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MindMapData));
    } catch (error) {
      console.error('Error getting public mind maps:', error);
      throw new Error('Failed to load public mind maps. Please try again.');
    }
  }

  async searchMindMaps(searchOptions: SearchOptions, filterOptions?: FilterOptions): Promise<MindMapData[]> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      let q = query(collection(db, this.COLLECTION_NAME));

      // Apply scope filter
      switch (searchOptions.scope) {
        case 'current':
          q = query(q, where('metadata.author', '==', user.uid));
          break;
        case 'shared':
          q = query(q, where('metadata.collaborators', 'array-contains', {
            userId: user.uid
          }));
          break;
        case 'all':
          // Include both owned and shared
          break;
      }

      // Apply additional filters
      if (filterOptions) {
        if (filterOptions.tags.length > 0) {
          q = query(q, where('metadata.tags', 'array-contains-any', filterOptions.tags));
        }
        
        if (filterOptions.isPublic !== undefined) {
          q = query(q, where('metadata.isPublic', '==', filterOptions.isPublic));
        }
      }

      q = query(q, orderBy('metadata.modified', 'desc'));

      const querySnapshot = await getDocs(q);
      let results = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MindMapData));

      // Apply text search filter (client-side for now)
      if (searchOptions.query) {
        const searchQuery = searchOptions.caseSensitive 
          ? searchOptions.query 
          : searchOptions.query.toLowerCase();

        results = results.filter(mindMap => {
          const searchText = searchOptions.caseSensitive
            ? `${mindMap.title} ${mindMap.description || ''} ${mindMap.nodes.map(n => n.text).join(' ')}`
            : `${mindMap.title} ${mindMap.description || ''} ${mindMap.nodes.map(n => n.text).join(' ')}`.toLowerCase();

          if (searchOptions.regex) {
            try {
              const regex = new RegExp(searchQuery, searchOptions.caseSensitive ? 'g' : 'gi');
              return regex.test(searchText);
            } catch {
              return false;
            }
          } else if (searchOptions.wholeWord) {
            const regex = new RegExp(`\\b${searchQuery}\\b`, searchOptions.caseSensitive ? 'g' : 'gi');
            return regex.test(searchText);
          } else {
            return searchText.includes(searchQuery);
          }
        });
      }

      return results;
    } catch (error) {
      console.error('Error searching mind maps:', error);
      throw new Error('Failed to search mind maps. Please try again.');
    }
  }

  async enableAutoSave(mindMapId: string, mindMapData: MindMapData, intervalMs: number = 30000): Promise<void> {
    // Clear existing auto-save for this mind map
    this.disableAutoSave(mindMapId);

    const autoSaveFunction = async () => {
      try {
        await this.updateMindMap(mindMapId, mindMapData);
        console.log(`Auto-saved mind map ${mindMapId}`);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    };

    const timeoutId = setInterval(autoSaveFunction, intervalMs);
    this.autoSaveTimeouts.set(mindMapId, timeoutId);
  }

  disableAutoSave(mindMapId: string): void {
    const timeoutId = this.autoSaveTimeouts.get(mindMapId);
    if (timeoutId) {
      clearInterval(timeoutId);
      this.autoSaveTimeouts.delete(mindMapId);
    }
  }

  subscribeToMindMap(id: string, callback: (mindMap: MindMapData | null) => void): () => void {
    const mindMapRef = doc(db, this.COLLECTION_NAME, id);
    
    return onSnapshot(mindMapRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Omit<MindMapData, 'id'>;
        callback({ id: doc.id, ...data });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error in mind map subscription:', error);
      callback(null);
    });
  }

  subscribeToUserMindMaps(userId: string, callback: (mindMaps: MindMapData[]) => void): () => void {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('metadata.author', '==', userId),
      orderBy('metadata.modified', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const mindMaps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MindMapData));
      callback(mindMaps);
    }, (error) => {
      console.error('Error in user mind maps subscription:', error);
      callback([]);
    });
  }
}

export const mindMapStorageService = new MindMapStorageService();
export default mindMapStorageService;
