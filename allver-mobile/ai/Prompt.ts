import { ActionType } from './ActionTypes';

/**
 * AI Assistant System Prompt Builder and Template Utilities
 */
export interface SystemContext {
  role?: string;
  fullName?: string;
  city?: string;
  language?: string;
  timestamp?: string;
}

export class PromptBuilder {
  /**
   * Returns a list of ActionTypes allowed for the specified user role
   */
  static getRoleAllowedActions(role: string): ActionType[] {
    switch (role) {
      case 'Client':
        return [
          ActionType.FIND_CONTRACTORS,
          ActionType.COMPARE_ESTIMATES,
          ActionType.VIEW_DESIGNS,
          ActionType.POST_JOB,
          ActionType.OPEN_CHAT,
          ActionType.OPEN_NOTIFICATIONS,
          ActionType.OPEN_TIMELINE,
          ActionType.OPEN_PROFILE,
          ActionType.OPEN_JOBS,
          ActionType.NAVIGATE_TO,
          ActionType.GET_DAILY_PROGRESS,
          ActionType.SEARCH_WORKERS,
        ];
      case 'Contractor':
        return [
          ActionType.VIEW_PROJECTS,
          ActionType.UPDATE_PORTFOLIO,
          ActionType.VIEW_DESIGNS,
          ActionType.OPEN_CHAT,
          ActionType.OPEN_NOTIFICATIONS,
          ActionType.OPEN_PAYMENTS,
          ActionType.OPEN_TIMELINE,
          ActionType.OPEN_PROFILE,
          ActionType.NAVIGATE_TO,
          ActionType.SEND_MESSAGE_TO_WORKER,
          ActionType.GET_DAILY_PROGRESS,
          ActionType.SEARCH_WORKERS,
        ];
      case 'Labour':
        return [
          ActionType.VIEW_PROJECTS,
          ActionType.UPDATE_PORTFOLIO,
          ActionType.OPEN_CHAT,
          ActionType.OPEN_NOTIFICATIONS,
          ActionType.OPEN_PAYMENTS,
          ActionType.OPEN_PROFILE,
          ActionType.NAVIGATE_TO,
          ActionType.SEND_MESSAGE_TO_WORKER,
          ActionType.GET_DAILY_PROGRESS,
          ActionType.SEARCH_WORKERS,
        ];
      case 'Architect':
        return [
          ActionType.VIEW_DESIGNS,
          ActionType.UPDATE_PORTFOLIO,
          ActionType.OPEN_CHAT,
          ActionType.OPEN_NOTIFICATIONS,
          ActionType.OPEN_PROFILE,
          ActionType.NAVIGATE_TO,
          ActionType.SEND_MESSAGE_TO_WORKER,
          ActionType.GET_DAILY_PROGRESS,
          ActionType.SEARCH_WORKERS,
        ];
      default:
        return [
          ActionType.FIND_CONTRACTORS,
          ActionType.VIEW_DESIGNS,
          ActionType.OPEN_PROFILE,
          ActionType.NAVIGATE_TO,
        ];
    }
  }

  /**
   * Generates the system prompt instructing Gemini to act as a structured intent classifier
   */
  static buildSystemPrompt(context: SystemContext): string {
    const role = context.role || 'Guest';
    const allowedActions = this.getRoleAllowedActions(role);

    let prompt = `Act as an intent classifier for Allver app. User role: "${role}". Use conversation history to resolve context.
Respond ONLY with JSON matching:
{
  "action": string|null, // must be one of ALLOWED ACTIONS below, or null
  "confidence": number, // 0.0 to 1.0
  "parameters": object|null, // extracted key-value params (e.g. checkType:"check-in", budget, workers, location, profession)
  "suggestions": string[]|null, // 3 suggested alternative actions if confidence < 0.7
  "response": string // friendly conversational reply in user's language (1-2 sentences)
}

ALLOWED ACTIONS for "${role}":`;

    allowedActions.forEach((action) => {
      switch (action) {
        case ActionType.FIND_CONTRACTORS:
          prompt += `\n- FIND_CONTRACTORS: Search/contact contractors. Params: { "profession": string, "location": string }`;
          break;
        case ActionType.VIEW_PROJECTS:
          prompt += `\n- VIEW_PROJECTS: Search for jobs/work opportunities.`;
          break;
        case ActionType.COMPARE_ESTIMATES:
          prompt += `\n- COMPARE_ESTIMATES: Compare pricing/estimates/costs.`;
          break;
        case ActionType.VIEW_DESIGNS:
          prompt += `\n- VIEW_DESIGNS: Browse photos/designs/kitchens/bedrooms.`;
          break;
        case ActionType.UPDATE_PORTFOLIO:
          prompt += `\n- UPDATE_PORTFOLIO: Manage/upload portfolio work.`;
          break;
        case ActionType.POST_JOB:
          prompt += `\n- POST_JOB: Post new construction job. Params: { "title": string, "budget": number, "workers": number, "location": string, "profession": string }`;
          break;
        case ActionType.OPEN_CHAT:
          prompt += `\n- OPEN_CHAT: Navigate to chats.`;
          break;
        case ActionType.OPEN_NOTIFICATIONS:
          prompt += `\n- OPEN_NOTIFICATIONS: Navigate to notifications.`;
          break;
        case ActionType.OPEN_PAYMENTS:
          prompt += `\n- OPEN_PAYMENTS: Navigate to payments/transactions.`;
          break;
        case ActionType.OPEN_JOBS:
          prompt += `\n- OPEN_JOBS: Navigate to jobs section.`;
          break;
        case ActionType.OPEN_TIMELINE:
          prompt += `\n- OPEN_TIMELINE: Navigate to activity timeline.`;
          break;
        case ActionType.OPEN_PROFILE:
          prompt += `\n- OPEN_PROFILE: Navigate to profile.`;
          break;
        case ActionType.NAVIGATE_TO:
          prompt += `\n- NAVIGATE_TO: General navigation. Params: { "route": string }`;
          break;
        case ActionType.SEND_MESSAGE_TO_WORKER:
          prompt += `\n- SEND_MESSAGE_TO_WORKER: Send a text message or project invitation to a worker. Params: { "workerName": string, "messageText": string // If user wants to invite, generate a polite project invitation text }`;
          break;
        case ActionType.GET_DAILY_PROGRESS:
          prompt += `\n- GET_DAILY_PROGRESS: Get today's site summary report. Params: { "projectName": string }`;
          break;
        case ActionType.SEARCH_WORKERS:
          prompt += `\n- SEARCH_WORKERS: Search for matching labours/workers. Params: { "skill": string, "location": string, "rating": number, "verifiedOnly": boolean }`;
          break;
      }
    });

    prompt += `\n\nContext: Name=${context.fullName || 'User'}, City=${context.city || ''}, Lang=${context.language || 'English'}, Time=${context.timestamp || new Date().toISOString()}`;

    return prompt.trim();
  }
}
