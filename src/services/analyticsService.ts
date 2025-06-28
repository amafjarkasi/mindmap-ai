import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { authService } from './auth';
import type { 
  AnalyticsData, 
  UsagePattern, 
  CollaborationStats,
  MindMapData 
} from '../types';

interface AnalyticsEvent {
  type: 'mindmap_created' | 'mindmap_opened' | 'mindmap_exported' | 'collaboration_started' | 'template_used' | 'search_performed';
  userId: string;
  mindMapId?: string;
  templateId?: string;
  exportFormat?: string;
  searchQuery?: string;
  metadata?: any;
  timestamp: number;
}

interface SessionData {
  sessionId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  mindMapsCreated: number;
  mindMapsOpened: number;
  timeSpent: number;
  featuresUsed: string[];
}

class AnalyticsService {
  private currentSession: SessionData | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.initializeSession();
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  private initializeSession(): void {
    const user = authService.getCurrentUser();
    if (!user) return;

    this.currentSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.uid,
      startTime: Date.now(),
      mindMapsCreated: 0,
      mindMapsOpened: 0,
      timeSpent: 0,
      featuresUsed: []
    };

    console.log('Analytics session started:', this.currentSession.sessionId);
  }

  private setupEventListeners(): void {
    // Track online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncQueuedEvents();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Track page visibility for session time
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseSession();
      } else {
        this.resumeSession();
      }
    });

    // Track session end
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }

  private startPeriodicSync(): void {
    // Sync events every 30 seconds
    setInterval(() => {
      if (this.isOnline && this.eventQueue.length > 0) {
        this.syncQueuedEvents();
      }
    }, 30000);
  }

  async trackEvent(event: Omit<AnalyticsEvent, 'userId' | 'timestamp'>): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const fullEvent: AnalyticsEvent = {
      ...event,
      userId: user.uid,
      timestamp: Date.now()
    };

    // Update current session
    this.updateSessionForEvent(fullEvent);

    // Add to queue
    this.eventQueue.push(fullEvent);

    // Try to sync immediately if online
    if (this.isOnline) {
      await this.syncQueuedEvents();
    }
  }

  private updateSessionForEvent(event: AnalyticsEvent): void {
    if (!this.currentSession) return;

    switch (event.type) {
      case 'mindmap_created':
        this.currentSession.mindMapsCreated++;
        break;
      case 'mindmap_opened':
        this.currentSession.mindMapsOpened++;
        break;
    }

    if (!this.currentSession.featuresUsed.includes(event.type)) {
      this.currentSession.featuresUsed.push(event.type);
    }
  }

  private async syncQueuedEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      const batch = [...this.eventQueue];
      this.eventQueue = [];

      // Send events to Firestore
      for (const event of batch) {
        await addDoc(collection(db, 'analytics_events'), {
          ...event,
          timestamp: serverTimestamp()
        });
      }

      console.log(`Synced ${batch.length} analytics events`);
    } catch (error) {
      console.error('Failed to sync analytics events:', error);
      // Re-add events to queue for retry
      this.eventQueue.unshift(...this.eventQueue);
    }
  }

  private pauseSession(): void {
    if (!this.currentSession) return;
    
    this.currentSession.timeSpent += Date.now() - this.currentSession.startTime;
  }

  private resumeSession(): void {
    if (!this.currentSession) return;
    
    this.currentSession.startTime = Date.now();
  }

  private async endSession(): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();
    this.currentSession.timeSpent += this.currentSession.endTime - this.currentSession.startTime;

    try {
      await addDoc(collection(db, 'analytics_sessions'), {
        ...this.currentSession,
        endTime: serverTimestamp()
      });

      // Sync any remaining events
      await this.syncQueuedEvents();
    } catch (error) {
      console.error('Failed to save session data:', error);
    }
  }

  async getAnalyticsData(userId?: string): Promise<AnalyticsData> {
    const user = authService.getCurrentUser();
    const targetUserId = userId || user?.uid;

    if (!targetUserId) {
      throw new Error('User ID is required');
    }

    try {
      // Get basic stats
      const mindMapCount = await this.getMindMapCount(targetUserId);
      const totalNodes = await this.getTotalNodes(targetUserId);
      const averageComplexity = await this.getAverageComplexity(targetUserId);
      const mostUsedTemplates = await this.getMostUsedTemplates(targetUserId);
      const collaborationStats = await this.getCollaborationStats(targetUserId);
      const usagePatterns = await this.getUsagePatterns(targetUserId);

      return {
        mindMapCount,
        totalNodes,
        averageComplexity,
        mostUsedTemplates,
        collaborationStats,
        usagePatterns
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      throw new Error('Failed to load analytics data');
    }
  }

  private async getMindMapCount(userId: string): Promise<number> {
    const q = query(
      collection(db, 'mindmaps'),
      where('metadata.author', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  private async getTotalNodes(userId: string): Promise<number> {
    const q = query(
      collection(db, 'mindmaps'),
      where('metadata.author', '==', userId)
    );
    const snapshot = await getDocs(q);
    
    let totalNodes = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data() as MindMapData;
      totalNodes += data.nodes.length;
    });

    return totalNodes;
  }

  private async getAverageComplexity(userId: string): Promise<number> {
    const q = query(
      collection(db, 'mindmaps'),
      where('metadata.author', '==', userId)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return 0;

    let totalComplexity = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data() as MindMapData;
      totalComplexity += this.calculateComplexity(data);
    });

    return totalComplexity / snapshot.size;
  }

  private calculateComplexity(mindMap: MindMapData): number {
    const nodeCount = mindMap.nodes.length;
    const maxDepth = this.getMaxDepth(mindMap.nodes);
    const branchingFactor = this.getAverageBranchingFactor(mindMap.nodes);
    
    // Complexity formula: weighted combination of factors
    return (nodeCount * 0.4) + (maxDepth * 0.3) + (branchingFactor * 0.3);
  }

  private getMaxDepth(nodes: any[]): number {
    const nodeMap = new Map(nodes.map(node => [node.key, node]));
    let maxDepth = 0;

    const calculateDepth = (node: any, depth: number = 0): number => {
      const children = nodes.filter(n => n.parent === node.key);
      if (children.length === 0) return depth;

      return Math.max(...children.map(child => calculateDepth(child, depth + 1)));
    };

    const rootNodes = nodes.filter(node => !node.parent);
    rootNodes.forEach(root => {
      maxDepth = Math.max(maxDepth, calculateDepth(root));
    });

    return maxDepth;
  }

  private getAverageBranchingFactor(nodes: any[]): number {
    const parentCounts = new Map<string, number>();
    
    nodes.forEach(node => {
      if (node.parent) {
        parentCounts.set(node.parent, (parentCounts.get(node.parent) || 0) + 1);
      }
    });

    if (parentCounts.size === 0) return 0;

    const totalChildren = Array.from(parentCounts.values()).reduce((sum, count) => sum + count, 0);
    return totalChildren / parentCounts.size;
  }

  private async getMostUsedTemplates(userId: string): Promise<string[]> {
    const q = query(
      collection(db, 'analytics_events'),
      where('userId', '==', userId),
      where('type', '==', 'template_used'),
      orderBy('timestamp', 'desc'),
      firestoreLimit(100)
    );

    const snapshot = await getDocs(q);
    const templateCounts = new Map<string, number>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const templateId = data.templateId;
      if (templateId) {
        templateCounts.set(templateId, (templateCounts.get(templateId) || 0) + 1);
      }
    });

    return Array.from(templateCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([templateId]) => templateId);
  }

  private async getCollaborationStats(userId: string): Promise<CollaborationStats> {
    // Get shared mind maps
    const sharedMindMapsQuery = query(
      collection(db, 'mindmaps'),
      where('metadata.collaborators', 'array-contains', { userId })
    );
    const sharedSnapshot = await getDocs(sharedMindMapsQuery);

    // Get collaboration events
    const collaborationQuery = query(
      collection(db, 'analytics_events'),
      where('userId', '==', userId),
      where('type', '==', 'collaboration_started'),
      orderBy('timestamp', 'desc'),
      firestoreLimit(100)
    );
    const collaborationSnapshot = await getDocs(collaborationQuery);

    // Get comments count
    const commentsQuery = query(
      collection(db, 'comments'),
      where('authorId', '==', userId)
    );
    const commentsSnapshot = await getDocs(commentsQuery);

    return {
      sharedMindMaps: sharedSnapshot.size,
      collaborators: this.getUniqueCollaborators(sharedSnapshot.docs),
      commentsCount: commentsSnapshot.size,
      averageResponseTime: 0 // Would need more complex calculation
    };
  }

  private getUniqueCollaborators(docs: any[]): number {
    const collaborators = new Set<string>();
    
    docs.forEach(doc => {
      const data = doc.data() as MindMapData;
      data.metadata.collaborators?.forEach(collab => {
        collaborators.add(collab.userId);
      });
    });

    return collaborators.size;
  }

  private async getUsagePatterns(userId: string): Promise<UsagePattern[]> {
    const q = query(
      collection(db, 'analytics_sessions'),
      where('userId', '==', userId),
      orderBy('startTime', 'desc'),
      firestoreLimit(30)
    );

    const snapshot = await getDocs(q);
    const patterns: UsagePattern[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data() as SessionData;
      const date = new Date(data.startTime).toISOString().split('T')[0];
      
      patterns.push({
        date,
        mindMapsCreated: data.mindMapsCreated,
        timeSpent: data.timeSpent,
        featuresUsed: data.featuresUsed
      });
    });

    return patterns;
  }

  async generateInsights(analyticsData: AnalyticsData): Promise<string[]> {
    const insights: string[] = [];

    // Productivity insights
    if (analyticsData.mindMapCount > 10) {
      insights.push(`You're a power user with ${analyticsData.mindMapCount} mind maps created!`);
    }

    // Complexity insights
    if (analyticsData.averageComplexity > 20) {
      insights.push('Your mind maps are quite detailed with high complexity scores.');
    } else if (analyticsData.averageComplexity < 5) {
      insights.push('Consider adding more detail to your mind maps for better insights.');
    }

    // Collaboration insights
    if (analyticsData.collaborationStats.sharedMindMaps > 5) {
      insights.push('You actively collaborate with others on mind maps.');
    }

    // Usage pattern insights
    const recentUsage = analyticsData.usagePatterns.slice(0, 7);
    const avgTimeSpent = recentUsage.reduce((sum, pattern) => sum + pattern.timeSpent, 0) / recentUsage.length;
    
    if (avgTimeSpent > 3600000) { // 1 hour
      insights.push('You spend significant time crafting detailed mind maps.');
    }

    // Template usage insights
    if (analyticsData.mostUsedTemplates.length > 0) {
      insights.push(`Your favorite template category helps structure your thinking.`);
    }

    return insights;
  }

  async exportAnalytics(userId?: string): Promise<Blob> {
    const analyticsData = await this.getAnalyticsData(userId);
    const insights = await this.generateInsights(analyticsData);

    const exportData = {
      generatedAt: new Date().toISOString(),
      userId: userId || authService.getCurrentUser()?.uid,
      analytics: analyticsData,
      insights
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  // Public tracking methods
  trackMindMapCreated(mindMapId: string, templateId?: string): void {
    this.trackEvent({
      type: 'mindmap_created',
      mindMapId,
      templateId
    });
  }

  trackMindMapOpened(mindMapId: string): void {
    this.trackEvent({
      type: 'mindmap_opened',
      mindMapId
    });
  }

  trackMindMapExported(mindMapId: string, format: string): void {
    this.trackEvent({
      type: 'mindmap_exported',
      mindMapId,
      exportFormat: format
    });
  }

  trackCollaborationStarted(mindMapId: string): void {
    this.trackEvent({
      type: 'collaboration_started',
      mindMapId
    });
  }

  trackTemplateUsed(templateId: string): void {
    this.trackEvent({
      type: 'template_used',
      templateId
    });
  }

  trackSearchPerformed(query: string): void {
    this.trackEvent({
      type: 'search_performed',
      searchQuery: query
    });
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
