export type Cadence = 'daily' | 'weekly' | 'once';

export type Category =
  | 'coding'
  | 'system-design'
  | 'story'
  | 'video'
  | 'outreach'
  | 'other';

export type Theme = 'light' | 'dark' | 'system';

export interface SeeData {
  currentSituation: string;
  antiVision: string;
  vision: string;
  oldStories: string[];
  newStories: string[];
  updatedAt: string;
}

export interface WeekPlan {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export type WeekDay = keyof WeekPlan;

export interface ChooseData {
  mainMission: string;
  currentFocus: string;
  oneYearGoal: string;
  ninetyDayGoal: string;
  monthlyMission: string;
  weekPlan: WeekPlan;
  updatedAt: string;
}

export interface Quest {
  id: string;
  title: string;
  xp: number;
  cadence: Cadence;
  category: Category;
  createdAt: string;
}

export interface Completion {
  id: string;
  questId: string;
  title: string;
  xp: number;
  category: Category;
  date: string; // YYYY-MM-DD, local
  at: string; // ISO timestamp
  note?: string;
}

export interface Focus {
  date: string; // the day this focus applies to (YYYY-MM-DD)
  questId: string;
  title: string; // may be reduced via "make smaller"
  xp: number; // may be reduced via "make smaller"
}

export interface WeeklyReviewAnswers {
  wanted: string;
  actuallyPrioritized: string;
  worked: string;
  avoidedBecause: string;
  tooBig: string;
  timingBad: string;
  makeSmaller: string;
  oneThing: string;
}

export interface WeeklyReview {
  id: string;
  weekStart: string; // YYYY-MM-DD, Monday
  answers: WeeklyReviewAnswers;
  reflection: string;
  updatedAt: string;
}

export interface VideoTopic {
  id: string;
  topic: string;
  learned: boolean;
  canExplain: boolean;
  recorded: boolean;
  published: boolean;
  createdAt: string;
}

export interface Settings {
  theme: Theme;
}

export interface CareerData {
  version: 1;
  see: SeeData;
  choose: ChooseData;
  quests: Quest[];
  completions: Completion[];
  focus: Focus | null;
  weeklyReviews: WeeklyReview[];
  topics: VideoTopic[];
  settings: Settings;
}

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'coding', label: 'Coding' },
  { value: 'system-design', label: 'System design' },
  { value: 'story', label: 'Career story' },
  { value: 'video', label: 'Video' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'other', label: 'Other' },
];

export const CADENCES: { value: Cadence; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'once', label: 'One-time' },
];
