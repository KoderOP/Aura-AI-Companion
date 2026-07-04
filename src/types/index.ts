export interface MicroStep {
  id: string;
  description: string;
  duration: number; // in minutes
  completed: boolean;
  dependencies?: string[]; // IDs of other microsteps
}

export type TaskCategory = 'work' | 'personal' | 'health' | 'finance' | 'admin';

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  description?: string;
  deadline: string; // ISO String or date string
  importance: number; // 1-10
  consequence: number; // 1-10 (how severe if missed)
  effort: number; // 1-10 (time/energy required)
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priorityScore: number;
  explanation: string;
  steps: MicroStep[];
  habitPenalty: number; // 0-10 (whether this is a habit user struggles with)
  personalizationOffset: number; // dynamically learned preference adjustments
  focusBlocksScheduled: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // ISO String
  endTime: string; // ISO String
  type: 'task-block' | 'external' | 'personal' | 'social';
  relatedTaskId?: string;
  attendees?: string[];
  location?: string;
}

export interface PrioritizationWeights {
  timePressure: number; // w1
  importance: number; // w2
  effortInverse: number; // w3
  consequence: number; // w4
  habitPenalty: number; // w5
}

export interface AuditLog {
  id: string;
  action: string;
  timestamp: string;
  status: 'success' | 'undone' | 'failed';
  details?: string;
}

export interface UserSettings {
  geminiApiKey: string;
  openaiApiKey: string;
  autonomyLevel: 'suggestions' | 'assisted' | 'autonomous';
  controlGroup: boolean; // For A/B testing: true = standard notifications, false = full Aura treatment
  dailyStart: string; // "09:00"
  dailyEnd: string; // "17:00"
}
