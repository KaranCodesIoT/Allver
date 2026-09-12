import { ActionType } from '../ActionTypes';
import { AgentExecutor, WorkflowStep, StepResult } from './AgentExecutor';
import { LocationTool, ProjectTool, WorkerTool, MessagingTool } from './AgentTools';

// ==========================================
// 1. SEND MESSAGE TO WORKER WORKFLOW
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
AgentExecutor.registerWorkflow(sendMessageToWorkerWorkflow);
