import { ActionType } from '../ActionTypes';
import { ExecutionContextState, ExecutionContextManager } from './ExecutionContext';

export interface ExecutionPlan {
  workflow: string;
  nextTool?: string;
  reason: string;
  status: 'START' | 'CONTINUE' | 'WAITING_FOR_USER' | 'SUCCESS' | 'FAILED' | 'RETRY' | 'END';
  suggestions?: string[];
  responseText?: string;
  attendanceSuccessCard?: any;
  contractorAttendanceSuccessCard?: any;
  messageSuccessCard?: any;
}

export class Planner {
  /**
   * Dynamic Dependency-Driven Tool Planner
   * Evaluates requirements for the given goal and decides the next best action turn-by-turn.
   */
  static plan(
    goal: ActionType,
    params: Record<string, any>,
    role: string,
    context: ExecutionContextState,
    lastToolResult?: { status: 'SUCCESS' | 'FAILED' | 'WAITING' | 'RETRY'; data?: any; message: string }
  ): ExecutionPlan {
    const plan = this.planInternal(goal, params, role, context, lastToolResult);

    console.log(`\n=================== 🤖 DYNAMIC PLANNER DECISION ===================`);
    console.log(`[Planner State] Active Goal: ${goal} | Workflow: ${plan.workflow} | Status: ${plan.status}`);
    console.log(`[Context Variables] WorkerName: "${context.workerName || ''}" | WorkerId: "${context.workerId || ''}" | WorkspaceId: "${context.workspaceId || ''}" | ProjectName: "${context.projectName || ''}" | MsgText: "${context.messageText || ''}"`);
    console.log(`[Next Tool Selected] ${plan.nextTool || 'NONE (Completed/Waiting)'}`);
    console.log(`[Reason] ${plan.reason}`);
    console.log(`===================================================================\n`);

    return plan;
  }

  private static planInternal(
    goal: ActionType,
    params: Record<string, any>,
    role: string,
    context: ExecutionContextState,
    lastToolResult?: { status: 'SUCCESS' | 'FAILED' | 'WAITING' | 'RETRY'; data?: any; message: string }
  ): ExecutionPlan {
    
    console.log(`\n--- 🤖 [Dynamic Planner] Started Turn Execution ---`);
    console.log(`[Dynamic Planner] Goal: ${goal} | Role: ${role}`);
    console.log(`[Dynamic Planner] Execution History: ${JSON.stringify(context.history)}`);
    if (lastToolResult) {
      console.log(`[Dynamic Planner] Last Result: ${lastToolResult.status} - "${lastToolResult.message}"`);
    }

    // Merge incoming parameters into the execution context
    Object.assign(context, params);

    // If history is empty, mark status as START, else CONTINUE
    const flowStatus = context.history.length === 0 ? 'START' : 'CONTINUE';

    // 1. LABOUR CHECK-IN GOAL
    if (goal === ActionType.MARK_ATTENDANCE && role === 'Labour') {
      const workflow = 'LABOUR_CHECK_IN';

      // Dependency 1: Location Verified
      if (!context.location) {
        const locResult = lastResultForTool(context.history, lastToolResult, 'GetLocationTool');
        if (locResult && locResult.status === 'SUCCESS') {
          context.location = locResult.data;
        } else if (context.history.includes('GetLocationTool') && lastToolResult?.status === 'FAILED') {
          return {
            workflow,
            status: 'FAILED',
            reason: 'GPS Location verification failed permanently.',
            responseText: 'I could not log your check-in because GPS location verification failed.'
          };
        } else {
          return {
            workflow,
            nextTool: 'GetLocationTool',
            reason: 'GPS location coordinates are required for Labour check-in.',
            status: flowStatus
          };
        }
      }

      // Dependency 2: Active Workspace Assigned
      if (!context.workspaceId || !context.projectName) {
        if (context.history.includes('GetActiveWorkspacesTool') && lastToolResult?.status === 'SUCCESS' && Array.isArray(lastResultData(context.history, lastToolResult, 'GetActiveWorkspacesTool'))) {
          const workspaces = lastResultData(context.history, lastToolResult, 'GetActiveWorkspacesTool') || [];
          if (workspaces.length === 0) {
            return {
              workflow,
              status: 'FAILED',
              reason: 'No active workspaces assigned to Labour user.',
              responseText: 'I could not find any active project sites assigned to you.'
            };
          }

          if (workspaces.length === 1) {
            console.log(`[Planner] Auto-selecting unique active workspace: ${workspaces[0].title} (${workspaces[0]._id})`);
            context.workspaceId = workspaces[0]._id;
            context.projectName = workspaces[0].title;
            ExecutionContextManager.updatePersistentMemory(context);
          } else {
            // Multiple active workspaces: prompt choice
            const suggestions = workspaces.map((w: any) => `Check-In at ${w.title}`);
            return {
              workflow,
              status: 'WAITING_FOR_USER',
              reason: 'Multiple workspaces found. User site choice required.',
              suggestions,
              responseText: 'I found multiple active projects assigned to you. Please select your site:'
            };
          }
        }
        return {
          workflow,
          nextTool: 'GetActiveWorkspacesTool',
          reason: 'Active project workspace ID is required for logging check-in.',
          status: 'CONTINUE'
        };
      }

      // Dependency 3: Check Duplicate Logs
      const hasCheckedDuplicate = context.history.includes('CheckLabourAttendanceTool');
      if (!hasCheckedDuplicate) {
        return {
          workflow,
          nextTool: 'CheckLabourAttendanceTool',
          reason: 'Need to check today\'s status to prevent duplicate check-in.',
          status: 'CONTINUE'
        };
      }

      // Evaluate Duplicate Log Check Outcomes
      const checkResult = lastResultForTool(context.history, lastToolResult, 'CheckLabourAttendanceTool');
      if (checkResult && checkResult.data?.alreadyCheckedIn) {
        return {
          workflow,
          status: 'SUCCESS',
          reason: 'Labour check-in is already complete for today.',
          responseText: `Your check-in has already been recorded for today at ${checkResult.data.projectName}!`,
          attendanceSuccessCard: {
            projectName: checkResult.data.projectName,
            checkType: 'Check-In',
            time: checkResult.data.time || 'Today',
            lat: context.location.latitude,
            lng: context.location.longitude,
            address: context.location.address
          }
        };
      }

      // Dependency 4: Submit Check-In
      if (!context.history.includes('SubmitLabourAttendanceTool')) {
        return {
          workflow,
          nextTool: 'SubmitLabourAttendanceTool',
          reason: 'Ready to log check-in to backend APIs.',
          status: 'CONTINUE'
        };
      }

      const submitResult = lastResultForTool(context.history, lastToolResult, 'SubmitLabourAttendanceTool');
      if (submitResult && submitResult.status === 'SUCCESS') {
        return {
          workflow,
          status: 'SUCCESS',
          reason: 'Check-in completed successfully.',
          responseText: `✅ Done.\nCheck-In logged.\n\nTime: ${submitResult.data.time}\nSite: ${submitResult.data.projectName}\nLocation: ${submitResult.data.address}`,
          attendanceSuccessCard: submitResult.data
        };
      }
    }

    // 2. CONTRACTOR MARK ATTENDANCE GOAL
    if (goal === ActionType.MARK_ATTENDANCE && role === 'Contractor') {
      const workflow = 'CONTRACTOR_MARK_ATTENDANCE';

      // Dependency 1: Resolve Worker details
      if (!context.workerId || !context.workspaceId) {
        if (context.history.includes('ResolveWorkerTool') && lastToolResult?.status === 'SUCCESS') {
          const matches = lastToolResult.data || [];
          const uniqueMatches = matches.filter((v: any, i: number, a: any[]) =>
            a.findIndex((t: any) => t.labourId === v.labourId) === i
          );

          if (uniqueMatches.length === 0) {
            return {
              workflow,
              status: 'FAILED',
              reason: 'Worker not found in contractor active projects.',
              responseText: `I couldn't find any worker named "${context.workerName}" in your active projects.`
            };
          }

          if (uniqueMatches.length === 1) {
            console.log(`[Planner] Auto-selecting unique resolved worker: ${uniqueMatches[0].fullName} (${uniqueMatches[0].labourId})`);
            context.workerId = uniqueMatches[0].labourId;
            context.workerName = uniqueMatches[0].fullName;
            context.workspaceId = uniqueMatches[0].workspaceId;
            context.projectName = uniqueMatches[0].projectName;
            ExecutionContextManager.updatePersistentMemory(context);
          } else {
            // Multiple matches: prompt choice
            const suggestions = uniqueMatches.map((m: any) => `${m.fullName} (${m.projectName})`);
            return {
              workflow,
              status: 'WAITING_FOR_USER',
              reason: 'Multiple matching workers found.',
              suggestions,
              responseText: `I found multiple workers matching "${context.workerName}". Please select the correct worker:`
            };
          }
        } else {
          return {
            workflow,
            nextTool: 'ResolveWorkerTool',
            reason: 'Worker ID and Project workspace must be resolved first.',
            status: flowStatus
          };
        }
      }

      // Dependency 2: Check Duplicate Attendance logs
      const hasCheckedDuplicate = context.history.includes('CheckWorkerAttendanceTool');
      if (!hasCheckedDuplicate) {
        return {
          workflow,
          nextTool: 'CheckWorkerAttendanceTool',
          reason: 'Verify if worker attendance was already marked today.',
          status: 'CONTINUE'
        };
      }

      const checkResult = lastResultForTool(context.history, lastToolResult, 'CheckWorkerAttendanceTool');
      if (checkResult && checkResult.data?.alreadyMarked) {
        return {
          workflow,
          status: 'SUCCESS',
          reason: 'Worker attendance is already marked today.',
          responseText: `Worker ${context.workerName}'s attendance is already marked as ${checkResult.data.status} (${checkResult.data.dayType}) today at ${context.projectName}!`,
          contractorAttendanceSuccessCard: {
            workerName: context.workerName!,
            projectName: context.projectName!,
            dayType: checkResult.data.dayType,
            status: checkResult.data.status,
            hours: checkResult.data.hours || 8,
            date: new Date().toISOString().split('T')[0]
          }
        };
      }

      // Dependency 3: Day Type Choice (Full Day, Half Day, Overtime)
      if (!context.dayType) {
        return {
          workflow,
          nextTool: 'PromptDayTypeTool', // Dummy tool label used by AgentExecutor to wait for prompt inputs
          status: 'WAITING_FOR_USER',
          reason: 'Need Day Type parameter choice.',
          suggestions: ['Full Day', 'Half Day', 'Overtime'],
          responseText: `Is it for a Full Day, Half Day, or Overtime?`
        };
      }

      // Dependency 4: Presence Status Choice (Present, Absent)
      if (!context.attendanceStatus) {
        return {
          workflow,
          nextTool: 'PromptStatusTool',
          status: 'WAITING_FOR_USER',
          reason: 'Need Presence Status parameter choice.',
          suggestions: ['Present', 'Absent'],
          responseText: `Is ${context.workerName} Present or Absent?`
        };
      }

      // Dependency 5: Submit Attendance
      if (!context.history.includes('SubmitWorkerAttendanceTool')) {
        return {
          workflow,
          nextTool: 'SubmitWorkerAttendanceTool',
          reason: 'All attendance parameters resolved. Ready to log.',
          status: 'CONTINUE'
        };
      }

      const submitResult = lastResultForTool(context.history, lastToolResult, 'SubmitWorkerAttendanceTool');
      if (submitResult && submitResult.status === 'SUCCESS') {
        return {
          workflow,
          status: 'SUCCESS',
          reason: 'Worker attendance logged successfully.',
          responseText: `✅ Done.\n${context.workerName} marked ${submitResult.data.status}.\n\nTime: ${submitResult.data.time}\nSite: ${submitResult.data.projectName}`,
          contractorAttendanceSuccessCard: submitResult.data
        };
      }
    }

    // 3. SEND MESSAGE TO WORKER GOAL
    if (goal === ActionType.SEND_MESSAGE_TO_WORKER) {
      const workflow = 'SEND_MESSAGE_TO_WORKER';

      // Dependency 1: Resolve Worker ID
      if (!context.workerId) {
        if (context.history.includes('ResolveWorkerTool') && lastToolResult?.status === 'SUCCESS') {
          const matches = lastToolResult.data || [];
          const uniqueMatches = matches.filter((v: any, i: number, a: any[]) =>
            a.findIndex((t: any) => t.labourId === v.labourId) === i
          );

          if (uniqueMatches.length === 0) {
            return {
              workflow,
              status: 'FAILED',
              reason: 'Recipient worker not found.',
              responseText: `I couldn't find any worker named "${context.workerName}" in your active projects.`
            };
          }

          if (uniqueMatches.length === 1) {
            console.log(`[Planner] Auto-selecting unique resolved worker for DM: ${uniqueMatches[0].fullName} (${uniqueMatches[0].labourId})`);
            context.workerId = uniqueMatches[0].labourId;
            context.workerName = uniqueMatches[0].fullName;
            context.workspaceId = uniqueMatches[0].workspaceId;
            context.projectName = uniqueMatches[0].projectName;
            ExecutionContextManager.updatePersistentMemory(context);
          } else {
            // Multiple matches: prompt choice
            const suggestions = uniqueMatches.map((m: any) => `${m.fullName} (${m.projectName})`);
            return {
              workflow,
              status: 'WAITING_FOR_USER',
              reason: 'Multiple matching workers found.',
              suggestions,
              responseText: `I found multiple workers matching "${context.workerName}". Please select the correct recipient:`
            };
          }
        } else {
          return {
            workflow,
            nextTool: 'ResolveWorkerTool',
            reason: 'Recipient worker details must be resolved first.',
            status: flowStatus
          };
        }
      }

      // Dependency 2: Direct Message Conversation ID
      if (!context.conversationId) {
        if (context.history.includes('GetOrCreateConversationTool') && lastToolResult?.status === 'SUCCESS') {
          context.conversationId = lastToolResult.data.conversationId;
          ExecutionContextManager.updatePersistentMemory(context);
        } else {
          return {
            workflow,
            nextTool: 'GetOrCreateConversationTool',
            reason: 'Get or create DM conversation room with worker.',
            status: 'CONTINUE'
          };
        }
      }

      // Dependency 3: Message Body Text
      if (!context.messageText) {
        return {
          workflow,
          nextTool: 'PromptMessageTextTool',
          status: 'WAITING_FOR_USER',
          reason: 'Message content is missing.',
          responseText: `What message would you like to send to ${context.workerName}?`
        };
      }

      // Dependency 4: Send Message
      if (!context.history.includes('SendMessageTool')) {
        return {
          workflow,
          nextTool: 'SendMessageTool',
          reason: 'Ready to send message.',
          status: 'CONTINUE'
        };
      }

      const sendResult = lastResultForTool(context.history, lastToolResult, 'SendMessageTool');
      if (sendResult && sendResult.status === 'SUCCESS') {
        return {
          workflow,
          status: 'SUCCESS',
          reason: 'Message sent successfully.',
          responseText: `✅ Message sent.\n\nRecipient: ${sendResult.data.workerName}\nTime: ${sendResult.data.timestamp}`,
          messageSuccessCard: sendResult.data
        };
      }
    }

    // 4. GET DAILY PROGRESS GOAL
    if (goal === ActionType.GET_DAILY_PROGRESS || (goal as any) === 'GET_DAILY_PROGRESS') {
      const workflow = 'DAILY_PROGRESS_REPORT';

      // Dependency 1: Resolve Project Site Workspace ID
      if (!context.workspaceId || !context.projectName) {
        if (context.history.includes('GetActiveWorkspacesTool') && lastToolResult?.status === 'SUCCESS' && Array.isArray(lastResultData(context.history, lastToolResult, 'GetActiveWorkspacesTool'))) {
          const workspaces = lastResultData(context.history, lastToolResult, 'GetActiveWorkspacesTool') || [];
          if (workspaces.length === 0) {
            return {
              workflow,
              status: 'FAILED',
              reason: 'No active project assignments found.',
              responseText: 'I could not find any active project sites assigned to you.'
            };
          }

          if (workspaces.length === 1) {
            console.log(`[Planner] Auto-selecting unique active workspace for daily report: ${workspaces[0].title} (${workspaces[0]._id})`);
            context.workspaceId = workspaces[0]._id;
            context.projectName = workspaces[0].title;
            ExecutionContextManager.updatePersistentMemory(context);
          } else {
            const suggestions = workspaces.map((w: any) => `Daily report for ${w.title}`);
            return {
              workflow,
              status: 'WAITING_FOR_USER',
              reason: 'Multiple active projects found. Selection required.',
              suggestions,
              responseText: 'I found multiple active projects assigned to you. Select a site to get today\'s progress summary:'
            };
          }
        }
        return {
          workflow,
          nextTool: 'GetActiveWorkspacesTool',
          reason: 'Active project workspace ID is required for generating daily reports.',
          status: flowStatus
        };
      }

      // Dependency 2: Gather Today's Database Records
      const hasGatheredLogs = context.history.includes('GatherDailyProgressTool');
      if (!hasGatheredLogs) {
        return {
          workflow,
          nextTool: 'GatherDailyProgressTool',
          reason: 'Pulling today\'s attendance, updates, files, and alerts from database APIs.',
          status: 'CONTINUE'
        };
      }

      const gatherResult = lastResultForTool(context.history, lastToolResult, 'GatherDailyProgressTool');
      if (gatherResult && gatherResult.status === 'SUCCESS') {
        context.dailyRawData = gatherResult.data;
      }

      // Dependency 3: Run Gemini Customized Summarization
      const hasGeneratedSummary = context.history.includes('GenerateProgressSummaryTool');
      if (!hasGeneratedSummary) {
        return {
          workflow,
          nextTool: 'GenerateProgressSummaryTool',
          reason: 'Invoking Gemini model to generate progress summary tailored to user\'s role.',
          status: 'CONTINUE'
        };
      }

      const summaryResult = lastResultForTool(context.history, lastToolResult, 'GenerateProgressSummaryTool');
      if (summaryResult && summaryResult.status === 'SUCCESS') {
        return {
          workflow,
          status: 'SUCCESS',
          reason: 'Daily progress summary generated.',
          responseText: summaryResult.data
        };
      }
    }

    // 5. SEARCH WORKERS GOAL
    if (goal === ActionType.SEARCH_WORKERS || (goal as any) === 'SEARCH_WORKERS') {
      const workflow = 'SEARCH_WORKERS_REPORT';

      const hasSearched = context.history.includes('SearchWorkersTool');
      if (!hasSearched) {
        return {
          workflow,
          nextTool: 'SearchWorkersTool',
          reason: 'Searching backend registry for labours matching skills, ratings, and availability.',
          status: flowStatus
        };
      }

      const searchResult = lastResultForTool(context.history, lastToolResult, 'SearchWorkersTool');
      if (searchResult && searchResult.status === 'SUCCESS') {
        const matches: any[] = searchResult.data || [];
        if (matches.length === 0) {
          return {
            workflow,
            status: 'SUCCESS',
            reason: 'No matching workers found.',
            responseText: `I couldn't find any available workers matching skill "${context.skill || 'General'}" nearby.`
          };
        }

        // Format a beautiful natural list
        let textList = `I found ${matches.length} matching workers for you:\n\n`;
        matches.forEach((m, idx) => {
          const verifiedBadge = m.isVerified ? ' (Verified Profile ✅)' : '';
          textList += `${idx + 1}. 👤 **${m.fullName}** - ${m.skillType}\n   * Rating: ${m.rating} ⭐ (${m.reviews} reviews)\n   * Distance: ${m.distance} away | exp: ${m.experience}\n   * Status: ${m.availability}${verifiedBadge}\n\n`;
        });
        textList += `Who would you like to message or invite?`;

        // Suggestion chips to message workers
        const suggestions: string[] = [];
        matches.forEach(m => {
          suggestions.push(`Message ${m.fullName}`);
          suggestions.push(`Invite ${m.fullName}`);
        });

        return {
          workflow,
          status: 'SUCCESS',
          reason: 'Worker search completed successfully.',
          responseText: textList,
          suggestions
        };
      }
    }

    // Default Fallback Failure
    return {
      workflow: goal,
      status: 'FAILED',
      reason: `Could not plan next action for goal ${goal} with role ${role}.`,
      responseText: 'I cannot handle this action. Please try again.'
    };
  }
}

// Helpers for reading history results
function lastResultForTool(history: string[], lastResult: any, toolName: string): any {
  if (history[history.length - 1] === toolName) {
    return lastResult;
  }
  return null;
}

function lastResultData(history: string[], lastResult: any, toolName: string): any {
  const res = lastResultForTool(history, lastResult, toolName);
  return res ? res.data : null;
}
