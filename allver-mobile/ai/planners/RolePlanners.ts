import { ActionType, AIAction } from '../ActionTypes';
import { BaseAgentPlanner, PlannerContext, PlannerSessionState, PlanResult } from './AgentPlanner';
import { LocationTool, ProjectTool, WorkerTool, PaymentTool, MessagingTool } from './AgentTools';

export class LabourPlanner extends BaseAgentPlanner {
  async execute(
    goal: ActionType,
    initialParams: Record<string, any>,
    userInput: string | null,
    sessionState: PlannerSessionState,
    context: PlannerContext
  ): Promise<PlanResult> {
    if (context.userRole !== 'Labour') {
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `Access Denied: Only Labour can run the Labour planner.`,
      };
    }

    return {
      isComplete: true,
      requiresUserInput: false,
      responseText: `I've routed your request to ${goal}.`,
      action: { type: goal, parameters: initialParams },
    };
  }
}

export class ContractorPlanner extends BaseAgentPlanner {
  async execute(
    goal: ActionType,
    initialParams: Record<string, any>,
    userInput: string | null,
    sessionState: PlannerSessionState,
    context: PlannerContext
  ): Promise<PlanResult> {
    if (context.userRole !== 'Contractor') {
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `Access Denied: Only Contractors can run the Contractor planner.`,
      };
    }

    return {
      isComplete: true,
      requiresUserInput: false,
      responseText: `Routing request: ${goal}.`,
      action: { type: goal, parameters: initialParams },
    };
  }
}

export class ClientPlanner extends BaseAgentPlanner {
  async execute(
    goal: ActionType,
    initialParams: Record<string, any>,
    userInput: string | null,
    sessionState: PlannerSessionState,
    context: PlannerContext
  ): Promise<PlanResult> {
    if (context.userRole !== 'Client') {
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `Access Denied: Only Clients can run the Client planner.`,
      };
    }

    if (goal !== ActionType.POST_JOB) {
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `Routing request: ${goal}.`,
        action: { type: goal, parameters: initialParams },
      };
    }

    // Initialize session parameters
    if (!sessionState.currentGoal) {
      sessionState.currentGoal = ActionType.POST_JOB;
      sessionState.stepIndex = 0;
      sessionState.params = {
        title: initialParams.title || '',
        profession: initialParams.profession || '',
        workers: initialParams.workers || null,
        location: initialParams.location || '',
        budget: initialParams.budget || null,
      };
    }

    const stateParams = sessionState.params;

    // Check missing fields sequentially
    if (!stateParams.title) {
      if (userInput) {
        stateParams.title = userInput;
      } else {
        return {
          isComplete: false,
          requiresUserInput: true,
          responseText: `What is the title of the project or job you want to post?`,
        };
      }
    }

    if (!stateParams.profession) {
      if (userInput) {
        stateParams.profession = userInput;
      } else {
        return {
          isComplete: false,
          requiresUserInput: true,
          responseText: `What professional role or worker type do you require? (e.g. Painter, Plumber)`,
        };
      }
    }

    if (!stateParams.location) {
      if (userInput) {
        stateParams.location = userInput;
      } else {
        return {
          isComplete: false,
          requiresUserInput: true,
          responseText: `Which city or area is the project site located in?`,
        };
      }
    }

    if (!stateParams.workers) {
      if (userInput) {
        const num = parseInt(userInput.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num)) {
          stateParams.workers = num;
        }
      }
      if (!stateParams.workers) {
        return {
          isComplete: false,
          requiresUserInput: true,
          responseText: `How many workers do you need for this project?`,
        };
      }
    }

    if (!stateParams.budget) {
      if (userInput) {
        const parsed = parseInt(userInput.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsed)) {
          stateParams.budget = parsed;
        }
      }
      if (!stateParams.budget) {
        return {
          isComplete: false,
          requiresUserInput: true,
          responseText: `What is your estimated budget amount (in Rupees) for this work?`,
        };
      }
    }

    // Call ProjectTool to POST the job contract request
    const postRes = await ProjectTool.postJobContract({
      clientId: context.userId,
      title: stateParams.title,
      projectType: stateParams.profession,
      location: stateParams.location,
      budget: `Fixed: ₹${stateParams.budget}`,
      description: `Required ${stateParams.workers} ${stateParams.profession}s at ${stateParams.location}.`,
    });

    if (!postRes.success) {
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `Failed to submit job posting: ${postRes.error || 'Server error'}`,
      };
    }

    return {
      isComplete: true,
      requiresUserInput: false,
      responseText: `Your job posting has been successfully created!`,
      jobPostSuccessCard: {
        title: stateParams.title,
        projectType: stateParams.profession,
        location: stateParams.location,
        budget: `₹${stateParams.budget}`,
        description: `Required ${stateParams.workers} ${stateParams.profession}s.`,
      },
    };
  }
}

export class ArchitectPlanner extends BaseAgentPlanner {
  async execute(
    goal: ActionType,
    initialParams: Record<string, any>,
    userInput: string | null,
    sessionState: PlannerSessionState,
    context: PlannerContext
  ): Promise<PlanResult> {
    if (context.userRole !== 'Architect') {
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `Access Denied: Only Architects can run the Architect planner.`,
      };
    }

    // Fallback since Architect mainly performs portfolio viewing or dashboard updates
    return {
      isComplete: true,
      requiresUserInput: false,
      responseText: `I've routed your request to navigate or browse: ${goal}.`,
      action: { type: goal, parameters: initialParams },
    };
  }
}
