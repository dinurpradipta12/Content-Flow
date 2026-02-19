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