import { ActionType, AIAction } from '../ActionTypes';

export interface PlannerContext {
  userId: string;
  userName: string;
  userRole: string;
}

export interface PlannerSessionState {
  currentGoal: ActionType | null;
  stepIndex: number;
  params: Record<string, any>;
  choices?: any[] | null;
  [key: string]: any;
}

export interface PlanResult {
  isComplete: boolean;
  requiresUserInput: boolean;
  responseText: string;
  suggestions?: string[];
  action?: AIAction;
  attendanceSuccessCard?: {
    projectName: string;
    checkType: string;
    time: string;
    lat: number;
    lng: number;
    address: string;
  };
  contractorAttendanceSuccessCard?: {
    workerName: string;
    projectName: string;
    dayType: string;
    status: string;
    hours: number;
    date: string;
  };
  jobPostSuccessCard?: {
    title: string;
    projectType: string;
    location: string;
    budget: string;
    description: string;
  };
  messageSuccessCard?: {
    workerName: string;
    projectName?: string;
    text: string;
    timestamp: string;
  };
}

export abstract class BaseAgentPlanner {
  abstract execute(
    goal: ActionType,
    initialParams: Record<string, any>,
    userInput: string | null,
    sessionState: PlannerSessionState,
    context: PlannerContext
  ): Promise<PlanResult>;
}
