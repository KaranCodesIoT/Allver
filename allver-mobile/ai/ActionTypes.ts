/**
 * Predefined Action Enums that the AI Assistant can trigger
 */
export enum ActionType {
  // Navigation / Search Actions
  FIND_CONTRACTORS = 'FIND_CONTRACTORS',
  VIEW_PROJECTS = 'VIEW_PROJECTS',
  COMPARE_ESTIMATES = 'COMPARE_ESTIMATES',
  VIEW_DESIGNS = 'VIEW_DESIGNS',
  UPDATE_PORTFOLIO = 'UPDATE_PORTFOLIO',
  NAVIGATE_TO = 'NAVIGATE_TO',

  // State-changing Actions
  MARK_ATTENDANCE = 'MARK_ATTENDANCE',
  POST_JOB = 'POST_JOB',

  // Navigation Shortcuts
  OPEN_CHAT = 'OPEN_CHAT',
  OPEN_NOTIFICATIONS = 'OPEN_NOTIFICATIONS',
  OPEN_ATTENDANCE = 'OPEN_ATTENDANCE',
  OPEN_PAYMENTS = 'OPEN_PAYMENTS',
  OPEN_JOBS = 'OPEN_JOBS',
  OPEN_TIMELINE = 'OPEN_TIMELINE',
  OPEN_PROFILE = 'OPEN_PROFILE',

  // Meta Actions
  AMBIGUOUS = 'AMBIGUOUS',
  SEND_MESSAGE_TO_WORKER = 'SEND_MESSAGE_TO_WORKER',
  GET_DAILY_PROGRESS = 'GET_DAILY_PROGRESS',
  SEARCH_WORKERS = 'SEARCH_WORKERS',
}

export interface AIAction {
  type: ActionType;
  parameters?: Record<string, any>;
  confidence?: number;
  suggestions?: string[];
}
