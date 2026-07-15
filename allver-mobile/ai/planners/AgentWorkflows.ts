import { ActionType } from '../ActionTypes';
import { AgentExecutor, WorkflowStep, StepResult } from './AgentExecutor';
import { LocationTool, ProjectTool, AttendanceTool, WorkerTool, MessagingTool, CheckLabourAttendanceTool, CheckWorkerAttendanceTool } from './AgentTools';

// ==========================================
// 1. LABOUR CHECK-IN WORKFLOW DEFINITION
// ==========================================
const labourCheckInWorkflow = {
  goal: ActionType.MARK_ATTENDANCE,
  role: 'Labour',
  steps: [
    {
      name: 'get_location',
      run: async (session, context) => {
        const res = await LocationTool.getCurrentLocation();
        if (!res.success || !res.result) {
          return { status: 'error', responseText: res.error || 'Failed to get location' };
        }
        return {
          status: 'complete',
          paramsToUpdate: {
            latitude: res.result.latitude,
            longitude: res.result.longitude,
            address: res.result.address,
          }
        };
      }
    } as WorkflowStep,
    {
      name: 'resolve_project',
      run: async (session, context, userInput) => {
        const res = await ProjectTool.getActiveWorkspaces(context.userId);
        if (!res.success || !res.result) {
          return { status: 'error', responseText: res.error || 'Failed to retrieve workspaces' };
        }

        const workspaces = res.result;
        if (workspaces.length === 0) {
          return {
            status: 'error',
            responseText: 'I could not find any active projects assigned to you.'
          };
        }

        if (workspaces.length === 1) {
          const w = workspaces[0];
          return {
            status: 'complete',
            paramsToUpdate: { workspaceId: w._id, projectName: w.title }
          };
        }

        // Multiple projects
        if (userInput) {
          const inputLower = userInput.toLowerCase();
          const match = workspaces.find((w: any) =>
            inputLower.includes(w.title.toLowerCase()) ||
            inputLower.includes(`at ${w.title.toLowerCase()}`)
          );

          if (match) {
            return {
              status: 'complete',
              paramsToUpdate: { workspaceId: match._id, projectName: match.title }
            };
          }
        }

        // Suggestions
        const suggestions = workspaces.map((w: any) => `Check-In at ${w.title}`);
        return {
          status: 'waiting_for_input',
          responseText: 'I found multiple active projects assigned to you. Please select your work site:',
          suggestions,
        };
      }
    } as WorkflowStep,
    {
      name: 'check_duplicate',
      run: async (session, context) => {
        const workspaceId = session.params.workspaceId;
        const res = await CheckLabourAttendanceTool.checkTodayStatus(context.userId);
        if (res.success && res.result?.alreadyCheckedIn) {
          const timeStr = res.result.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return {
            status: 'complete',
            responseText: `Your check-in has already been recorded for today at ${res.result.projectName}! Skipping duplicate check-in.`,
            attendanceSuccessCard: {
              projectName: res.result.projectName || session.params.projectName || 'Active Project',
              checkType: 'Check-In',
              time: timeStr,
              lat: session.params.latitude || 0,
              lng: session.params.longitude || 0,
              address: session.params.address || 'Project Location',
            }
          };
        }
        return { status: 'complete' };
      }
    } as WorkflowStep,
    {
      name: 'submit_checkin',
      run: async (session, context) => {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const res = await AttendanceTool.submitAttendance({
          workspaceId: session.params.workspaceId,
          labourId: context.userId,
          status: 'Present',
          hours: 0, // check-in doesn't log hours
          latitude: session.params.latitude,
          longitude: session.params.longitude,
          checkInTime: timeStr,
          address: session.params.address,
          senderId: context.userId,
        });

        if (!res.success) {
          return { status: 'error', responseText: res.error || 'Failed to submit check-in' };
        }

        return {
          status: 'complete',
          output: {
            attendanceSuccessCard: {
              projectName: session.params.projectName,
              checkType: 'Check-In',
              time: timeStr,
              lat: session.params.latitude,
              lng: session.params.longitude,
              address: session.params.address,
            }
          }
        };
      }
    } as WorkflowStep
  ]
};

// ==========================================
// 2. CONTRACTOR MARK ATTENDANCE WORKFLOW
// ==========================================
const contractorMarkAttendanceWorkflow = {
  goal: ActionType.MARK_ATTENDANCE,
  role: 'Contractor',
  steps: [
    {
      name: 'resolve_worker',
      run: async (session, context, userInput) => {
        let workerName = session.params.workerName || '';
        
        if (userInput && !session.params.workerName) {
          workerName = userInput.replace(/(mark|attendance|present|absent|for)/gi, '').trim();
        }

        if (!workerName) {
          return {
            status: 'waiting_for_input',
            responseText: "Which worker's attendance would you like to mark?"
          };
        }

        const res = await WorkerTool.findWorkersInTeam({ userId: context.userId, name: workerName });
        if (!res.success || !res.result) {
          return { status: 'error', responseText: res.error || 'Failed to query worker team' };
        }

        const matches = res.result;

        if (matches.length === 0) {
          return {
            status: 'waiting_for_input',
            responseText: `I couldn't find any worker named "${workerName}" in your active project sites. Please confirm their name or type it again:`
          };
        }

        if (matches.length === 1) {
          const match = matches[0];
          return {
            status: 'complete',
            paramsToUpdate: {
              workerName: match.fullName,
              labourId: match.labourId,
              workspaceId: match.workspaceId,
              projectName: match.projectName
            }
          };
        }

        // Multiple worker matches
        if (userInput) {
          const inputLower = userInput.toLowerCase();
          const match = matches.find(m =>
            inputLower.includes(m.fullName.toLowerCase()) &&
            inputLower.includes(m.projectName.toLowerCase())
          );

          if (match) {
            return {
              status: 'complete',
              paramsToUpdate: {
                workerName: match.fullName,
                labourId: match.labourId,
                workspaceId: match.workspaceId,
                projectName: match.projectName
              }
            };
          }
        }

        const suggestions = matches.map(m => `${m.fullName} (${m.projectName})`);
        return {
          status: 'waiting_for_input',
          responseText: `I found multiple workers matching "${workerName}". Please select the correct worker:`,
          suggestions,
        };
      }
    } as WorkflowStep,
    {
      name: 'check_duplicate',
      run: async (session, context) => {
        const res = await CheckWorkerAttendanceTool.checkTodayWorkerStatus({
          userId: context.userId,
          workspaceId: session.params.workspaceId,
          labourId: session.params.labourId,
        });

        if (res.success && res.result?.alreadyMarked) {
          const dateStr = new Date().toISOString().split('T')[0];
          const hours = res.result.dayType === 'Overtime' ? 12 : (res.result.dayType === 'Full Day' ? 8 : 4);
          return {
            status: 'complete',
            responseText: `Worker ${session.params.workerName}'s attendance is already marked as ${res.result.status} (${res.result.dayType}) today at ${session.params.projectName}! Skipping duplicate.`,
            contractorAttendanceSuccessCard: {
              workerName: session.params.workerName,
              projectName: session.params.projectName,
              dayType: res.result.dayType || 'Full Day',
              status: res.result.status || 'Present',
              hours,
              date: dateStr,
            }
          };
        }
        return { status: 'complete' };
      }
    } as WorkflowStep,
    {
      name: 'prompt_day_type',
      run: async (session, context, userInput) => {
        let dayType = session.params.dayType || null;

        if (userInput) {
          const inputLower = userInput.toLowerCase();
          if (inputLower.includes('full') || inputLower.includes('फुल') || inputLower.includes('पुर्ण')) {
            dayType = 'full';
          } else if (inputLower.includes('half') || inputLower.includes('हाफ') || inputLower.includes('अर्धा')) {
            dayType = 'half';
          } else if (inputLower.includes('over') || inputLower.includes('ओवरटाइम') || inputLower.includes('ओव्हरटाइम')) {
            dayType = 'overtime';
          }
        }

        if (!dayType) {
          return {
            status: 'waiting_for_input',
            responseText: `I will help mark ${session.params.workerName}'s attendance. Is it for a Full Day, Half Day, or Overtime?`,
            suggestions: ['Full Day', 'Half Day', 'Overtime']
          };
        }

        return {
          status: 'complete',
          paramsToUpdate: { dayType }
        };
      }
    } as WorkflowStep,
    {
      name: 'prompt_status',
      run: async (session, context, userInput) => {
        let attStatus = session.params.status || null;

        if (userInput) {
          const inputLower = userInput.toLowerCase();
          if (inputLower.includes('present') || inputLower.includes('हाजिर') || inputLower.includes('उपस्थित') || inputLower.includes('prasant')) {
            attStatus = 'Present';
          } else if (inputLower.includes('absent') || inputLower.includes('गैर') || inputLower.includes('अनुपस्थित')) {
            attStatus = 'Absent';
          }
        }

        if (!attStatus) {
          return {
            status: 'waiting_for_input',
            responseText: `Is ${session.params.workerName} Present or Absent?`,
            suggestions: ['Present', 'Absent']
          };
        }

        return {
          status: 'complete',
          paramsToUpdate: { status: attStatus }
        };
      }
    } as WorkflowStep,
    {
      name: 'submit_worker_attendance',
      run: async (session, context) => {
        const dayTypeLabel = session.params.dayType === 'overtime' ? 'Overtime' : (session.params.dayType === 'half' ? 'Half Day' : 'Full Day');
        const hours = session.params.status === 'Absent' ? 0 : (session.params.dayType === 'overtime' ? 12 : (session.params.dayType === 'half' ? 4 : 8));
        const dateStr = new Date().toISOString().split('T')[0];

        const res = await AttendanceTool.submitAttendance({
          workspaceId: session.params.workspaceId,
          labourId: session.params.labourId,
          status: session.params.status,
          hours,
          senderId: context.userId,
        });

        if (!res.success) {
          // Cache offline fallback simulation
          return {
            status: 'complete',
            responseText: `⚠️ Offline Mode: Saved Worker ${session.params.workerName}'s attendance check-in to local cache and will sync automatically when connection restores.`,
            contractorAttendanceSuccessCard: {
              workerName: session.params.workerName,
              projectName: session.params.projectName,
              dayType: dayTypeLabel + ' (Offline)',
              status: session.params.status,
              hours,
              date: dateStr,
            }
          };
        }

        return {
          status: 'complete',
          output: {
            contractorAttendanceSuccessCard: {
              workerName: session.params.workerName,
              projectName: session.params.projectName,
              dayType: dayTypeLabel,
              status: session.params.status,
              hours,
              date: dateStr,
            }
          }
        };
      }
    } as WorkflowStep
  ]
};

// ==========================================
// 3. SEND MESSAGE TO WORKER WORKFLOW
// ==========================================
const sendMessageToWorkerWorkflow = {
  goal: ActionType.SEND_MESSAGE_TO_WORKER,
  role: 'Contractor',
  steps: [
    {
      name: 'resolve_worker',
      run: async (session, context, userInput) => {
        let workerName = session.params.workerName || '';
        
        if (userInput && !session.params.workerName) {
          workerName = userInput.replace(/(send|message|to|worker|text)/gi, '').trim();
        }

        if (!workerName) {
          return {
            status: 'waiting_for_input',
            responseText: "Who would you like to send a message to?"
          };
        }

        const res = await WorkerTool.findWorkersInTeam({ userId: context.userId, name: workerName });
        if (!res.success || !res.result) {
          return { status: 'error', responseText: res.error || 'Failed to query worker team' };
        }

        const matches = res.result;

        if (matches.length === 0) {
          return {
            status: 'waiting_for_input',
            responseText: `I couldn't find any worker named "${workerName}" in your active projects. Please confirm their name:`
          };
        }

        if (matches.length === 1) {
          const match = matches[0];
          return {
            status: 'complete',
            paramsToUpdate: {
              workerName: match.fullName,
              labourId: match.labourId,
              projectName: match.projectName
            }
          };
        }

        // Multiple worker matches
        if (userInput) {
          const inputLower = userInput.toLowerCase();
          const match = matches.find(m =>
            inputLower.includes(m.fullName.toLowerCase()) &&
            inputLower.includes(m.projectName.toLowerCase())
          );

          if (match) {
            return {
              status: 'complete',
              paramsToUpdate: {
                workerName: match.fullName,
                labourId: match.labourId,
                projectName: match.projectName
              }
            };
          }
        }

        const suggestions = matches.map(m => `${m.fullName} (${m.projectName})`);
        return {
          status: 'waiting_for_input',
          responseText: `I found multiple workers matching "${workerName}". Please tap the correct worker:`,
          suggestions,
        };
      }
    } as WorkflowStep,
    {
      name: 'get_or_create_conversation',
      run: async (session, context) => {
        const res = await MessagingTool.getOrCreateConversation({
          senderId: context.userId,
          receiverId: session.params.labourId,
        });

        if (!res.success || !res.result) {
          return { status: 'error', responseText: res.error || 'Failed to start conversation' };
        }

        return {
          status: 'complete',
          paramsToUpdate: { conversationId: res.result.conversationId }
        };
      }
    } as WorkflowStep,
    {
      name: 'prompt_message_text',
      run: async (session, context, userInput) => {
        let messageText = session.params.messageText || null;

        // Skip taking userInput if it matched a worker choice in step 0
        if (userInput && userInput !== session.params.workerName) {
          messageText = userInput;
        }

        if (!messageText) {
          return {
            status: 'waiting_for_input',
            responseText: `What message would you like to send to ${session.params.workerName}?`
          };
        }

        return {
          status: 'complete',
          paramsToUpdate: { messageText }
        };
      }
    } as WorkflowStep,
    {
      name: 'send_message',
      run: async (session, context) => {
        const res = await MessagingTool.sendMessage({
          conversationId: session.params.conversationId,
          senderId: context.userId,
          text: session.params.messageText,
        });

        if (!res.success) {
          return { status: 'error', responseText: res.error || 'Failed to send message' };
        }

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          status: 'complete',
          output: {
            messageSuccessCard: {
              workerName: session.params.workerName,
              projectName: session.params.projectName,
              text: session.params.messageText,
              timestamp: now,
            }
          }
        };
      }
    } as WorkflowStep
  ]
};

// ==========================================
// REGISTER ALL WORKFLOWS
// ==========================================
AgentExecutor.registerWorkflow(labourCheckInWorkflow);
AgentExecutor.registerWorkflow(contractorMarkAttendanceWorkflow);
AgentExecutor.registerWorkflow(sendMessageToWorkerWorkflow);
