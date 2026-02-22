export enum ContentStatus {
  TODO = 'To-Do',
  IN_PROGRESS = 'In Progress',
  REVIEW = 'Review',
  SCHEDULED = 'Scheduled',
  PUBLISHED = 'Published'
}

export enum ContentPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export enum Platform {
  INSTAGRAM = 'Instagram',
  TIKTOK = 'TikTok',
  THREADS = 'Threads',
  LINKEDIN = 'LinkedIn',
  YOUTUBE = 'YouTube',
  FACEBOOK = 'Facebook'
}

export interface ContentItem {
  id: string;
  title: string;
  pillar: string;
  type: string;
  platform: Platform;
  status: ContentStatus;
  priority: ContentPriority;
  date: string; // ISO Date string
  assignee?: string;
  pic?: string;
  script?: string;
  contentLink?: string; // New field for direct post link
  approval?: string;
  metrics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves?: number;
    lastUpdated: string;
  };
  workspaces?: {
    account_name: string;
    name: string;
  }
}

export interface Workspace {
  id: string;
  name: string;
  role: 'Owner' | 'Admin' | 'Member';
}

export interface AnalyticsData {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  engagementRate: number;
  aiInsight: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

export type NotificationType = 'JOIN_WORKSPACE' | 'CONTENT_APPROVAL' | 'CONTENT_REVISION' | 'CONTENT_APPROVED' | 'MENTION' | 'REACTION';

export interface AppNotification {
  id: string;
  created_at: string;
  recipient_id: string;
  actor_id: string | null;
  workspace_id: string | null;
  type: NotificationType;
  title: string;
  content: string;
  is_read: boolean;
  metadata?: any;
  actor?: {
    full_name: string;
    avatar_url: string;
  };
}