// Core Mind Map Types
export interface MindMapNode {
  key: string;
  text: string;
  parent?: string | null;
  color?: string;
  borderColor?: string;
  textColor?: string;
  font?: string;
  level?: number;
  isTreeExpanded?: boolean;
  metadata?: NodeMetadata;
}

export interface NodeMetadata {
  created: string;
  modified: string;
  author?: string;
  tags?: string[];
  sources?: string[];
  comments?: Comment[];
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  created: string;
  replies?: Comment[];
}

export interface MindMapData {
  id?: string;
  title: string;
  description?: string;
  nodes: MindMapNode[];
  metadata: MindMapMetadata;
  settings?: MindMapSettings;
}

export interface MindMapMetadata {
  created: string;
  modified: string;
  author: string;
  version: number;
  tags: string[];
  isPublic: boolean;
  collaborators?: Collaborator[];
}

export interface Collaborator {
  userId: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  joinedAt: string;
}

export interface MindMapSettings {
  layout: LayoutType;
  theme: string;
  autoSave: boolean;
  exportFormat: ExportFormat;
}

// AI and Generation Types
export interface AIProvider {
  name: string;
  model: string;
  apiKey: string;
  settings: AISettings;
}

export interface AISettings {
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface GenerationRequest {
  topic: string;
  provider: AIProvider;
  includeWebSearch: boolean;
  template?: Template;
  customPrompt?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

// Template Types
export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  structure: TemplateNode[];
  preview?: string;
  isPublic: boolean;
  author: string;
  created: string;
}

export interface TemplateNode {
  text: string;
  level: number;
  children?: TemplateNode[];
  placeholder?: boolean;
}

export type TemplateCategory = 
  | 'business' 
  | 'education' 
  | 'research' 
  | 'personal' 
  | 'project-management'
  | 'creative'
  | 'analysis';

// User and Authentication Types
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  defaultAIProvider: string;
  autoSave: boolean;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  collaboration: boolean;
  updates: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private';
  allowAnalytics: boolean;
  shareUsageData: boolean;
}

// Export and Import Types
export type ExportFormat = 'png' | 'pdf' | 'svg' | 'json' | 'markdown' | 'pptx';

export interface ExportOptions {
  format: ExportFormat;
  quality?: number;
  includeMetadata?: boolean;
  layout?: LayoutType;
  customStyling?: ExportStyling;
}

export interface ExportStyling {
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  margins?: Margins;
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Layout and Visualization Types
export type LayoutType = 
  | 'vertical' 
  | 'horizontal' 
  | 'radial' 
  | 'force-directed'
  | 'circular'
  | 'layered';

export interface LayoutSettings {
  type: LayoutType;
  spacing: number;
  direction: 'top-down' | 'bottom-up' | 'left-right' | 'right-left';
  alignment: 'start' | 'center' | 'end';
}

// Search and Filter Types
export interface SearchOptions {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
  scope: SearchScope;
}

export type SearchScope = 'current' | 'all' | 'shared' | 'templates';

export interface FilterOptions {
  tags: string[];
  dateRange: DateRange;
  author: string[];
  collaborators: string[];
  isPublic?: boolean;
}

export interface DateRange {
  start: string;
  end: string;
}

// Analytics and Insights Types
export interface AnalyticsData {
  mindMapCount: number;
  totalNodes: number;
  averageComplexity: number;
  mostUsedTemplates: string[];
  collaborationStats: CollaborationStats;
  usagePatterns: UsagePattern[];
}

export interface CollaborationStats {
  sharedMindMaps: number;
  collaborators: number;
  commentsCount: number;
  averageResponseTime: number;
}

export interface UsagePattern {
  date: string;
  mindMapsCreated: number;
  timeSpent: number;
  featuresUsed: string[];
}

// Error and Status Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

// Event Types
export interface AppEvent {
  type: string;
  payload: any;
  timestamp: string;
}

export type EventType = 
  | 'mindmap-created'
  | 'mindmap-updated' 
  | 'mindmap-deleted'
  | 'user-joined'
  | 'user-left'
  | 'comment-added'
  | 'export-completed'
  | 'error-occurred';
