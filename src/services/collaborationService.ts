import { 
  doc, 
  updateDoc, 
  onSnapshot, 
  arrayUnion, 
  arrayRemove,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from './firebase';
import { authService } from './auth';
import type { 
  MindMapData, 
  Collaborator, 
  Comment, 
  User 
} from '../types';

interface CollaborationEvent {
  type: 'cursor' | 'selection' | 'edit' | 'comment' | 'presence';
  userId: string;
  userName: string;
  userColor: string;
  timestamp: number;
  data: any;
}

interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  cursor?: { x: number; y: number };
  selection?: string[];
  lastSeen: number;
}

class CollaborationService {
  private mindMapId: string | null = null;
  private presenceRef: any = null;
  private collaborationListeners: Map<string, () => void> = new Map();
  private userPresence: Map<string, UserPresence> = new Map();
  private eventCallbacks: Map<string, (event: CollaborationEvent) => void> = new Map();
  private userColors: string[] = [
    '#e53e3e', '#38a169', '#3182ce', '#d69e2e', 
    '#805ad5', '#dd6b20', '#319795', '#e53e3e'
  ];
  private currentUserColor: string = '';

  constructor() {
    this.currentUserColor = this.getUserColor();
  }

  async startCollaboration(mindMapId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated for collaboration');
    }

    this.mindMapId = mindMapId;
    
    // Add user as collaborator if not already added
    await this.addCollaborator(mindMapId, user.uid, 'editor');
    
    // Start presence tracking
    await this.startPresenceTracking();
    
    // Listen for collaboration events
    this.listenForCollaborationEvents();
    
    console.log('Collaboration started for mind map:', mindMapId);
  }

  async stopCollaboration(): Promise<void> {
    if (!this.mindMapId) return;

    // Remove presence
    await this.removePresence();
    
    // Clean up listeners
    this.collaborationListeners.forEach(unsubscribe => unsubscribe());
    this.collaborationListeners.clear();
    
    this.mindMapId = null;
    console.log('Collaboration stopped');
  }

  async addCollaborator(
    mindMapId: string, 
    userId: string, 
    role: 'viewer' | 'editor' | 'admin'
  ): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      const mindMapRef = doc(db, 'mindmaps', mindMapId);
      const collaborator: Collaborator = {
        userId,
        email: '', // Would be fetched from user service
        role,
        joinedAt: new Date().toISOString()
      };

      await updateDoc(mindMapRef, {
        'metadata.collaborators': arrayUnion(collaborator),
        'metadata.modified': new Date().toISOString()
      });

      console.log('Collaborator added:', userId, role);
    } catch (error) {
      console.error('Error adding collaborator:', error);
      throw new Error('Failed to add collaborator');
    }
  }

  async removeCollaborator(mindMapId: string, userId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      const mindMapRef = doc(db, 'mindmaps', mindMapId);
      
      // Note: This is simplified - in practice, you'd need to fetch the exact collaborator object
      await updateDoc(mindMapRef, {
        'metadata.modified': new Date().toISOString()
      });

      console.log('Collaborator removed:', userId);
    } catch (error) {
      console.error('Error removing collaborator:', error);
      throw new Error('Failed to remove collaborator');
    }
  }

  async updateCollaboratorRole(
    mindMapId: string, 
    userId: string, 
    newRole: 'viewer' | 'editor' | 'admin'
  ): Promise<void> {
    // Implementation would involve removing and re-adding with new role
    console.log('Updating collaborator role:', userId, newRole);
  }

  private async startPresenceTracking(): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user || !this.mindMapId) return;

    const presenceData: UserPresence = {
      userId: user.uid,
      userName: user.displayName || user.email,
      userColor: this.currentUserColor,
      lastSeen: Date.now()
    };

    // Create presence document
    const presenceRef = doc(db, 'presence', `${this.mindMapId}_${user.uid}`);
    this.presenceRef = presenceRef;

    try {
      await updateDoc(presenceRef, {
        ...presenceData,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      // Document doesn't exist, create it
      await addDoc(collection(db, 'presence'), {
        ...presenceData,
        mindMapId: this.mindMapId,
        lastSeen: serverTimestamp()
      });
    }

    // Update presence every 30 seconds
    setInterval(() => {
      if (this.presenceRef) {
        updateDoc(this.presenceRef, {
          lastSeen: serverTimestamp()
        });
      }
    }, 30000);
  }

  private async removePresence(): Promise<void> {
    if (this.presenceRef) {
      try {
        await updateDoc(this.presenceRef, {
          lastSeen: serverTimestamp(),
          offline: true
        });
      } catch (error) {
        console.error('Error removing presence:', error);
      }
    }
  }

  private listenForCollaborationEvents(): void {
    if (!this.mindMapId) return;

    // Listen for presence changes
    const presenceQuery = query(
      collection(db, 'presence'),
      where('mindMapId', '==', this.mindMapId),
      where('offline', '!=', true)
    );

    const unsubscribePresence = onSnapshot(presenceQuery, (snapshot) => {
      this.userPresence.clear();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as UserPresence;
        if (data.userId !== authService.getCurrentUser()?.uid) {
          this.userPresence.set(data.userId, data);
        }
      });

      this.notifyPresenceChange();
    });

    this.collaborationListeners.set('presence', unsubscribePresence);

    // Listen for real-time edits
    const mindMapRef = doc(db, 'mindmaps', this.mindMapId);
    const unsubscribeMindMap = onSnapshot(mindMapRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as MindMapData;
        this.notifyMindMapChange(data);
      }
    });

    this.collaborationListeners.set('mindmap', unsubscribeMindMap);
  }

  updateCursor(x: number, y: number): void {
    if (!this.presenceRef) return;

    updateDoc(this.presenceRef, {
      cursor: { x, y },
      lastSeen: serverTimestamp()
    });
  }

  updateSelection(nodeIds: string[]): void {
    if (!this.presenceRef) return;

    updateDoc(this.presenceRef, {
      selection: nodeIds,
      lastSeen: serverTimestamp()
    });
  }

  async addComment(
    nodeId: string, 
    content: string, 
    parentCommentId?: string
  ): Promise<string> {
    const user = authService.getCurrentUser();
    if (!user || !this.mindMapId) {
      throw new Error('User must be authenticated');
    }

    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      author: user.displayName || user.email,
      content,
      created: new Date().toISOString(),
      replies: []
    };

    try {
      const commentDoc = await addDoc(collection(db, 'comments'), {
        ...comment,
        mindMapId: this.mindMapId,
        nodeId,
        parentCommentId: parentCommentId || null,
        authorId: user.uid
      });

      return commentDoc.id;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }
  }

  async getComments(nodeId: string): Promise<Comment[]> {
    if (!this.mindMapId) return [];

    try {
      const commentsQuery = query(
        collection(db, 'comments'),
        where('mindMapId', '==', this.mindMapId),
        where('nodeId', '==', nodeId),
        where('parentCommentId', '==', null),
        orderBy('created', 'asc')
      );

      const snapshot = await getDocs(commentsQuery);
      const comments: Comment[] = [];

      for (const doc of snapshot.docs) {
        const commentData = doc.data();
        const comment: Comment = {
          id: doc.id,
          author: commentData.author,
          content: commentData.content,
          created: commentData.created,
          replies: await this.getCommentReplies(doc.id)
        };
        comments.push(comment);
      }

      return comments;
    } catch (error) {
      console.error('Error getting comments:', error);
      return [];
    }
  }

  private async getCommentReplies(parentCommentId: string): Promise<Comment[]> {
    try {
      const repliesQuery = query(
        collection(db, 'comments'),
        where('parentCommentId', '==', parentCommentId),
        orderBy('created', 'asc')
      );

      const snapshot = await getDocs(repliesQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        author: doc.data().author,
        content: doc.data().content,
        created: doc.data().created,
        replies: []
      }));
    } catch (error) {
      console.error('Error getting comment replies:', error);
      return [];
    }
  }

  getActiveUsers(): UserPresence[] {
    return Array.from(this.userPresence.values());
  }

  onPresenceChange(callback: (users: UserPresence[]) => void): () => void {
    const id = Math.random().toString(36);
    this.eventCallbacks.set(`presence_${id}`, (event) => {
      if (event.type === 'presence') {
        callback(this.getActiveUsers());
      }
    });

    return () => {
      this.eventCallbacks.delete(`presence_${id}`);
    };
  }

  onMindMapChange(callback: (mindMap: MindMapData) => void): () => void {
    const id = Math.random().toString(36);
    this.eventCallbacks.set(`mindmap_${id}`, (event) => {
      if (event.type === 'edit') {
        callback(event.data);
      }
    });

    return () => {
      this.eventCallbacks.delete(`mindmap_${id}`);
    };
  }

  private notifyPresenceChange(): void {
    const event: CollaborationEvent = {
      type: 'presence',
      userId: '',
      userName: '',
      userColor: '',
      timestamp: Date.now(),
      data: this.getActiveUsers()
    };

    this.eventCallbacks.forEach(callback => {
      if (callback) callback(event);
    });
  }

  private notifyMindMapChange(mindMap: MindMapData): void {
    const user = authService.getCurrentUser();
    if (!user) return;

    const event: CollaborationEvent = {
      type: 'edit',
      userId: user.uid,
      userName: user.displayName || user.email,
      userColor: this.currentUserColor,
      timestamp: Date.now(),
      data: mindMap
    };

    this.eventCallbacks.forEach(callback => {
      if (callback) callback(event);
    });
  }

  private getUserColor(): string {
    const user = authService.getCurrentUser();
    if (!user) return this.userColors[0];

    // Generate consistent color based on user ID
    const hash = user.uid.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    return this.userColors[Math.abs(hash) % this.userColors.length];
  }

  async resolveConflict(
    localVersion: MindMapData, 
    remoteVersion: MindMapData
  ): Promise<MindMapData> {
    // Simple conflict resolution - merge based on timestamps
    const mergedNodes = [...localVersion.nodes];
    
    // Add any new nodes from remote version
    remoteVersion.nodes.forEach(remoteNode => {
      const localNode = mergedNodes.find(n => n.key === remoteNode.key);
      if (!localNode) {
        mergedNodes.push(remoteNode);
      } else {
        // Keep the most recently modified version
        const localModified = new Date(localNode.metadata?.modified || 0);
        const remoteModified = new Date(remoteNode.metadata?.modified || 0);
        
        if (remoteModified > localModified) {
          const index = mergedNodes.findIndex(n => n.key === remoteNode.key);
          mergedNodes[index] = remoteNode;
        }
      }
    });

    return {
      ...localVersion,
      nodes: mergedNodes,
      metadata: {
        ...localVersion.metadata,
        modified: new Date().toISOString(),
        version: Math.max(localVersion.metadata.version, remoteVersion.metadata.version) + 1
      }
    };
  }
}

export const collaborationService = new CollaborationService();
export default collaborationService;
