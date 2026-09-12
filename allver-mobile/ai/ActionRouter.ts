import { router } from 'expo-router';
import { Alert } from 'react-native';
import { ActionType, AIAction } from './ActionTypes';
import { PromptBuilder } from './Prompt';

export class ActionRouter {
  /**
   * Routes a structured action from the AI assistant to the appropriate application handler.
   * Enforces security roles (Permission Layer) and intent confidence limits.
   * Returns a boolean indicating if the action succeeded.
   */
  static handleAction(action: AIAction, userRole: string): boolean {
    console.log('[ActionRouter] Handling Action:', action, 'with userRole:', userRole);

    try {
      // 1. Enforce Intent Confidence threshold
      const confidence = action.confidence ?? 1.0;
      if (confidence < 0.7) {
        console.warn(`[ActionRouter] Action rejected due to low confidence: ${confidence}`);
        Alert.alert(
          'Low Confidence Warning',
          `AI Assistant is not fully sure of your request (Confidence: ${Math.round(confidence * 100)}%). Please try clarifying your query.`
        );
        return false;
      }

      // 2. Enforce Permission Layer Security Policy
      const allowedActions = PromptBuilder.getRoleAllowedActions(userRole);
      if (!allowedActions.includes(action.type)) {
        console.error(`[ActionRouter] Security Violation: Role "${userRole}" is not authorized for "${action.type}".`);
        Alert.alert(
          'Security Policy: Access Denied',
          `Your role (${userRole}) is not authorized to trigger the action: "${action.type}".`
        );
        return false;
      }

      // 3. Router logic
      switch (action.type) {
        case ActionType.FIND_CONTRACTORS: {
          const prof = action.parameters?.profession || 'Contractors';
          const loc = action.parameters?.location ? ` in ${action.parameters.location}` : '';
          Alert.alert(
            'Action Executed',
            `AI Assistant is redirecting you to find ${prof}${loc}.`,
            [{ text: 'OK', onPress: () => router.push('/contractors') }]
          );
          return true;
        }

        case ActionType.VIEW_PROJECTS:
          Alert.alert(
            'Action Executed',
            'AI Assistant is redirecting you to job opportunities / projects.',
            [{ text: 'OK', onPress: () => router.push('/jobs') }]
          );
          return true;

        case ActionType.COMPARE_ESTIMATES:
          Alert.alert(
            'Action Executed',
            'AI Assistant is redirecting you to the project estimate comparison tool.',
            [{ text: 'OK', onPress: () => router.push('/project-compare') }]
          );
          return true;

        case ActionType.VIEW_DESIGNS:
          Alert.alert(
            'Action Executed',
            'AI Assistant is redirecting you to similar designs feed.',
            [{ text: 'OK', onPress: () => router.push('/(tabs)/design') }]
          );
          return true;

        case ActionType.UPDATE_PORTFOLIO:
          Alert.alert(
            'Action Executed',
            'AI Assistant is redirecting you to manage your Portfolio Highlights.',
            [{ text: 'OK', onPress: () => router.push('/portfolio-highlights') }]
          );
          return true;

        case ActionType.POST_JOB:
          const title = action.parameters?.title || 'New Construction Request';
          const budget = action.parameters?.budget ? `Rs. ${Number(action.parameters.budget).toLocaleString()}` : 'Not specified';
          const workers = action.parameters?.workers || 1;
          const location = action.parameters?.location || 'Not specified';
          const profession = action.parameters?.profession || 'Contractor';

          // State-changing action: Request detailed context-rich confirmation
          Alert.alert(
            'Confirm Project Posting',
            `Project Title:\n  "${title}"\n\nProfession:\n  ${profession}\n\nWorkers Required:\n  ${workers}\n\nLocation:\n  ${location}\n\nEstimated Budget:\n  ${budget}`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Confirm & Post',
                onPress: () => {
                  console.log(`[ActionRouter] Prefilling post project fields for: ${title}`);
                  router.push({
                    pathname: '/(tabs)/post-project',
                    params: {
                      draftTitle: title,
                      draftBudget: action.parameters?.budget ? String(action.parameters.budget) : '',
                      draftProfession: profession,
                      draftWorkers: String(workers),
                      draftLocation: location
                    }
                  });
                },
              },
            ]
          );
          return true;

        // Navigation shortcuts
        case ActionType.OPEN_CHAT:
          router.push('/(tabs)/chats');
          return true;

        case ActionType.OPEN_NOTIFICATIONS:
          router.push('/notifications');
          return true;

        case ActionType.OPEN_PAYMENTS:
          Alert.alert(
            'Redirection',
            'AI Assistant is taking you to your payments/invoices screen.',
            [{ text: 'OK', onPress: () => router.push('/(tabs)/profile') }]
          );
          return true;

        case ActionType.OPEN_JOBS:
          router.push('/jobs');
          return true;

        case ActionType.OPEN_TIMELINE:
          router.push('/(tabs)/feed');
          return true;

        case ActionType.OPEN_PROFILE:
          router.push('/(tabs)/profile');
          return true;

        case ActionType.NAVIGATE_TO:
          if (action.payload && action.payload.route) {
            router.push(action.payload.route);
            return true;
          } else {
            console.warn('[ActionRouter] NAVIGATE_TO payload is missing route parameter.');
            return false;
          }

        default:
          console.warn('[ActionRouter] Unhandled action type:', action.type);
          Alert.alert('Action Unhandled', `The action "${action.type}" has no handler registered.`);
          return false;
      }
    } catch (error) {
      console.error('[ActionRouter] Failed to execute action:', error);
      return false;
    }
  }
}
