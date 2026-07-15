import { ActionType, AIAction } from '../ActionTypes';
import { AIService } from '../AIService';
import { PromptBuilder } from '../Prompt';
import { PlannerContext, PlannerSessionState, PlanResult } from './AgentPlanner';
import { ExecutionContextState, ExecutionContextManager } from './ExecutionContext';
import { Planner, ExecutionPlan } from './Planner';
import {
  GetLocationTool,
  GetActiveWorkspacesTool,
  CheckLabourAttendanceTool,
  SubmitLabourAttendanceTool,
  ResolveWorkerTool,
  CheckWorkerAttendanceTool,
  SubmitWorkerAttendanceTool,
  GetOrCreateConversationTool,
  SendMessageTool,
  GatherDailyProgressTool,
  GenerateProgressSummaryTool,
  SearchWorkersTool,
  ToolResultContract
} from './AgentTools';

export class AgentExecutor {
  /**
   * Executes a tool by its name
   */
  private static async executeToolByName(
    toolName: string,
    executionContext: ExecutionContextState,
    context: PlannerContext
  ): Promise<ToolResultContract> {
    console.log(`[AgentExecutor] Running tool: ${toolName}...`);
    
    switch (toolName) {
      case 'GetLocationTool':
        return await GetLocationTool.run(executionContext);
      case 'GetActiveWorkspacesTool':
        return await GetActiveWorkspacesTool.run(executionContext, { userId: context.userId });
      case 'CheckLabourAttendanceTool':
        return await CheckLabourAttendanceTool.run(executionContext, { userId: context.userId });
      case 'SubmitLabourAttendanceTool':
        return await SubmitLabourAttendanceTool.run(executionContext, { userId: context.userId });
      case 'ResolveWorkerTool':
        return await ResolveWorkerTool.run(executionContext, { userId: context.userId });
      case 'CheckWorkerAttendanceTool':
        return await CheckWorkerAttendanceTool.run(executionContext, { userId: context.userId });
      case 'SubmitWorkerAttendanceTool':
        return await SubmitWorkerAttendanceTool.run(executionContext, { userId: context.userId });
      case 'GetOrCreateConversationTool':
        return await GetOrCreateConversationTool.run(executionContext, { userId: context.userId });
      case 'SendMessageTool':
        return await SendMessageTool.run(executionContext, { userId: context.userId });
      case 'GatherDailyProgressTool':
        return await GatherDailyProgressTool.run(executionContext, { userId: context.userId });
      case 'GenerateProgressSummaryTool':
        return await GenerateProgressSummaryTool.run(executionContext, { role: context.userRole });
      case 'SearchWorkersTool':
        return await SearchWorkersTool.run(executionContext, { userId: context.userId });
      default:
        throw new Error(`Unknown tool name: ${toolName}`);
    }
  }

  /**
   * Main Execution Loop
   */
  static async execute(
    goal: ActionType,
    initialParams: Record<string, any>,
    userInput: string | null,
    sessionState: PlannerSessionState,
    context: PlannerContext,
    onProgressUpdate?: (stepText: string, status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'WAITING') => void
  ): Promise<PlanResult> {
    // 1. Initialize Execution Context if not present
    if (!sessionState.executionContext) {
      sessionState.executionContext = ExecutionContextManager.createEmpty(context.userRole);
    }
    const executionContext: ExecutionContextState = sessionState.executionContext;

    // --- GOAL PRE-VALIDATION ---
    const allowed = PromptBuilder.getRoleAllowedActions(context.userRole);
    if (!allowed.includes(goal)) {
      console.log(`[AgentExecutor] Goal Validation Failed: Goal ${goal} not allowed for role ${context.userRole}.`);
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `Sorry, as a ${context.userRole}, you do not have permission to execute this request (${goal}).`
      };
    }

    // 2. Pre-process pronouns or text selections
    if (userInput) {
      // Shorthand entity memory resolution: check if pronoun resolved to last worker
      const pronounResolution = ExecutionContextManager.resolvePronoun(userInput);
      if (pronounResolution.workerName && pronounResolution.workerId) {
        executionContext.workerName = pronounResolution.workerName;
        executionContext.workerId = pronounResolution.workerId;
      }

      // Check if user replied to prompt selections (e.g. Day Type, Status, Workspaces, Workers)
      const inputLower = userInput.toLowerCase().trim();
      const previousTool = executionContext.history[executionContext.history.length - 1];

      if (previousTool === 'GetActiveWorkspacesTool') {
        // Find matching workspace title from active cache
        const workspaces = executionContext.activeWorkspaces || [];
        const match = workspaces.find((w: any) =>
          inputLower.includes(w.title.toLowerCase()) || inputLower.includes(`check-in at ${w.title.toLowerCase()}`)
        );
        if (match) {
          executionContext.workspaceId = match._id;
          executionContext.projectName = match.title;
          ExecutionContextManager.updatePersistentMemory(executionContext);
        }
      } else if (previousTool === 'ResolveWorkerTool') {
        // User picked one worker chip option from the matched choices
        const rawResults = sessionState.lastWorkerChoices || [];
        const match = rawResults.find((r: any) =>
          inputLower.includes(r.fullName.toLowerCase()) ||
          r.fullName.toLowerCase().includes(inputLower) ||
          inputLower.includes(r.projectName.toLowerCase())
        );
        if (match) {
          executionContext.workerId = match.labourId;
          executionContext.workerName = match.fullName;
          executionContext.workspaceId = match.workspaceId;
          executionContext.projectName = match.projectName;
          ExecutionContextManager.updatePersistentMemory(executionContext);
        } else {
          // Fallback: update search name if they just typed/confirmed a new worker name
          executionContext.workerName = userInput;
        }
      } else if (previousTool === 'PromptDayTypeTool') {
        if (inputLower.includes('full') || inputLower.includes('फुल') || inputLower.includes('पुर्ण')) {
          executionContext.dayType = 'full';
        } else if (inputLower.includes('half') || inputLower.includes('हाफ') || inputLower.includes('अर्धा')) {
          executionContext.dayType = 'half';
        } else if (inputLower.includes('over') || inputLower.includes('ओवरटाइम') || inputLower.includes('ओव्हरटाइम')) {
          executionContext.dayType = 'overtime';
        }
      } else if (previousTool === 'PromptStatusTool') {
        if (inputLower.includes('present') || inputLower.includes('हाजिर') || inputLower.includes('उपस्थित') || inputLower.includes('prasant')) {
          executionContext.attendanceStatus = 'Present';
        } else if (inputLower.includes('absent') || inputLower.includes('गैर') || inputLower.includes('अनुपस्थित')) {
          executionContext.attendanceStatus = 'Absent';
        }
      } else if (previousTool === 'PromptMessageTextTool') {
        // Verify it isn't worker choices clicks
        const isWorkerChoice = sessionState.lastWorkerChoices?.some((r: any) => inputLower.includes(r.fullName.toLowerCase()));
        if (!isWorkerChoice) {
          const polished = await AIService.generateProfessionalMessage(userInput);
          executionContext.messageText = polished;
        }
      }
    }

    // Merge incoming parameters
    Object.assign(executionContext, initialParams);
    if (executionContext.messageText && !executionContext.history.includes('SendMessageTool')) {
      // Professionalize the raw instruction string
      executionContext.messageText = await AIService.generateProfessionalMessage(executionContext.messageText);
    }

    let lastResult: ToolResultContract | undefined;

    // 3. Central Execution loop driven by Planner
    const MAX_ITERATIONS = 20;
    let iteration = 0;
    while (true) {
      iteration++;
      if (iteration > MAX_ITERATIONS) {
        console.error(`[AgentExecutor] ⚠️ SAFETY: Max iterations (${MAX_ITERATIONS}) exceeded for goal ${goal}. Breaking loop.`);
        return {
          isComplete: true,
          requiresUserInput: false,
          responseText: 'Sorry, this task took too many steps to complete. Please try again.'
        };
      }
      const plan = Planner.plan(goal, initialParams, context.userRole, executionContext, lastResult);

      if (plan.status === 'WAITING_FOR_USER') {
        // Notify UI about pausing for inputs
        if (onProgressUpdate && plan.nextTool) {
          onProgressUpdate(plan.reason, 'WAITING');
        }
        // Save matching worker suggestions array for duplicate selections check on next turn
        if (plan.nextTool === 'ResolveWorkerTool' && lastResult?.data) {
          sessionState.lastWorkerChoices = lastResult.data;
        }

        return {
          isComplete: false,
          requiresUserInput: true,
          responseText: plan.responseText || 'Please reply to proceed.',
          suggestions: plan.suggestions
        };
      }

      if (plan.status === 'FAILED') {
        if (onProgressUpdate) {
          onProgressUpdate(plan.reason, 'FAILED');
        }
        return {
          isComplete: true,
          requiresUserInput: false,
          responseText: plan.responseText || 'Task execution failed.'
        };
      }

      if (plan.status === 'SUCCESS') {
        if (onProgressUpdate) {
          onProgressUpdate('Goal completed successfully!', 'SUCCESS');
        }
        return {
          isComplete: true,
          requiresUserInput: false,
          responseText: plan.responseText || 'Workflow finished successfully.',
          attendanceSuccessCard: plan.attendanceSuccessCard,
          contractorAttendanceSuccessCard: plan.contractorAttendanceSuccessCard,
          messageSuccessCard: plan.messageSuccessCard
        };
      }

      // Execute next tool decided by the planner
      const toolToRun = plan.nextTool!;
      let friendlyStepLabel = this.getToolProgressLabel(toolToRun, executionContext);

      if (onProgressUpdate) {
        onProgressUpdate(friendlyStepLabel, 'RUNNING');
      }

      // Record running trace
      executionContext.trace.push({
        timestamp: new Date().toISOString(),
        step: toolToRun,
        status: 'RUNNING',
        message: `Reason: ${plan.reason}`
      });

      let toolResult: ToolResultContract;
      let retries = 0;
      const maxRetries = 2;

      while (true) {
        toolResult = await this.executeToolByName(toolToRun, executionContext, context);
        if (toolResult.status === 'RETRY' && retries < maxRetries) {
          retries++;
          executionContext.trace.push({
            timestamp: new Date().toISOString(),
            step: toolToRun,
            status: 'RETRY',
            message: `Transient failure: ${toolResult.message}. Retry ${retries}/${maxRetries}`
          });
          console.log(`[AgentExecutor] Transient failure in ${toolToRun}. Retrying ${retries}/${maxRetries} after 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        break;
      }

      // Offline fallback queueing for failed/recoverable operations
      if (toolResult.status === 'FAILED' || toolResult.status === 'RETRY') {
        const isRecoverable = ['SubmitLabourAttendanceTool', 'SubmitWorkerAttendanceTool'].includes(toolToRun);
        if (isRecoverable) {
          executionContext.offlineQueue.push({
            goal,
            params: { ...initialParams, ...executionContext },
            timestamp: Date.now()
          });

          toolResult = {
            status: 'SUCCESS',
            data: toolResult.data || {
              projectName: executionContext.projectName || 'Offline Site',
              checkType: 'Check-In',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              lat: executionContext.location?.latitude || 0,
              lng: executionContext.location?.longitude || 0,
              address: executionContext.location?.address || 'Stored locally'
            },
            message: `⚠️ Offline Sync: Saved attendance locally. It will sync once internet restores.`
          };
        }
      }

      // Save execution details
      executionContext.history.push(toolToRun);
      executionContext.previousTool = toolToRun;
      lastResult = toolResult;

      // --- CRITICAL: Propagate successful tool results into context state ---
      // This prevents infinite loops where the planner re-runs tools because
      // their output was never saved to the context variables it checks.
      if (toolResult.status === 'SUCCESS' && toolResult.data) {
        switch (toolToRun) {
          case 'GetLocationTool':
            if (!executionContext.location && toolResult.data.latitude !== undefined) {
              executionContext.location = toolResult.data;
              console.log(`[AgentExecutor] ✅ Propagated location to context: lat=${toolResult.data.latitude}, lng=${toolResult.data.longitude}`);
            }
            break;
          case 'GetOrCreateConversationTool':
            if (!executionContext.conversationId && toolResult.data.conversationId) {
              executionContext.conversationId = toolResult.data.conversationId;
              console.log(`[AgentExecutor] ✅ Propagated conversationId to context: ${toolResult.data.conversationId}`);
            }
            break;
          case 'GetActiveWorkspacesTool':
            if (!executionContext.activeWorkspaces && Array.isArray(toolResult.data)) {
              executionContext.activeWorkspaces = toolResult.data;
              console.log(`[AgentExecutor] ✅ Propagated ${toolResult.data.length} active workspaces to context`);
            }
            break;
          case 'ResolveWorkerTool':
            // Auto-select if exactly one unique worker
            if (!executionContext.workerId && Array.isArray(toolResult.data)) {
              const unique = toolResult.data.filter((v: any, i: number, a: any[]) =>
                a.findIndex((t: any) => t.labourId === v.labourId) === i
              );
              if (unique.length === 1) {
                executionContext.workerId = unique[0].labourId;
                executionContext.workerName = unique[0].fullName;
                executionContext.workspaceId = unique[0].workspaceId;
                executionContext.projectName = unique[0].projectName;
                console.log(`[AgentExecutor] ✅ Auto-selected unique worker: ${unique[0].fullName} (${unique[0].labourId})`);
              }
            }
            break;
        }
      }

      // Record final step trace
      executionContext.trace.push({
        timestamp: new Date().toISOString(),
        step: toolToRun,
        status: toolResult.status,
        message: toolResult.message
      });

      // Update UI of step success
      if (onProgressUpdate) {
        if (toolResult.status === 'SUCCESS') {
          onProgressUpdate(this.getToolSuccessLabel(toolToRun, executionContext, toolResult), 'SUCCESS');
        } else {
          onProgressUpdate(toolResult.message || `Failed to run ${toolToRun}`, 'FAILED');
        }
      }
    }
  }

  private static getToolProgressLabel(toolName: string, context: ExecutionContextState): string {
    switch (toolName) {
      case 'GetLocationTool':
        return '🤖 Fetching GPS Location...';
      case 'GetActiveWorkspacesTool':
        return '🤖 Fetching active workspace assignments...';
      case 'CheckLabourAttendanceTool':
        return "🤖 Checking today's attendance status...";
      case 'SubmitLabourAttendanceTool':
        return '🤖 Submitting verified check-in...';
      case 'ResolveWorkerTool':
        return `🤖 Resolving worker name "${context.workerName}"...`;
      case 'CheckWorkerAttendanceTool':
        return `🤖 Checking today's logs for ${context.workerName}...`;
      case 'SubmitWorkerAttendanceTool':
        return `🤖 Submitting attendance record for ${context.workerName}...`;
      case 'GetOrCreateConversationTool':
        return `🤖 Loading chat room with ${context.workerName}...`;
      case 'SendMessageTool':
        return `🤖 Delivering text message to ${context.workerName}...`;
      case 'GatherDailyProgressTool':
        return '🤖 Gathering today\'s site events and logs...';
      case 'GenerateProgressSummaryTool':
        return '🤖 Analyzing logs & generating daily progress summary...';
      case 'SearchWorkersTool':
        return `🤖 Searching workers by skills, distance, and ratings...`;
      default:
        return `🤖 Executing ${toolName}...`;
    }
  }

  private static getToolSuccessLabel(toolName: string, context: ExecutionContextState, result: ToolResultContract): string {
    switch (toolName) {
      case 'GetLocationTool':
        return '✅ GPS coordinates verified';
      case 'GetActiveWorkspacesTool':
        return '✅ Workspace details resolved';
      case 'CheckLabourAttendanceTool':
        return result.data?.alreadyCheckedIn ? '✅ Already checked in' : '✅ Verified not checked in yet';
      case 'SubmitLabourAttendanceTool':
        return '✅ Check-in recorded';
      case 'ResolveWorkerTool':
        return `✅ Worker "${context.workerName}" verified`;
      case 'CheckWorkerAttendanceTool':
        return result.data?.alreadyMarked ? '✅ Attendance already marked' : '✅ Verified not marked yet';
      case 'SubmitWorkerAttendanceTool':
        return '✅ Worker attendance logged';
      case 'GetOrCreateConversationTool':
        return '✅ Direct Message chat verified';
      case 'SendMessageTool':
        return '✅ Message delivered';
      case 'GatherDailyProgressTool':
        return '✅ Daily logs and updates gathered';
      case 'GenerateProgressSummaryTool':
        return '✅ Progress summary generated';
      case 'SearchWorkersTool':
        return `✅ Found ${result.data?.length || 0} matching workers`;
      default:
        return `✅ Completed ${toolName}`;
    }
  }
}
