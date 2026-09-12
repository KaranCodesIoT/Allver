export interface ExecutionContextState {
  workerId?: string;
  workerName?: string;
  projectId?: string;
  workspaceId?: string;
  conversationId?: string;
  location?: { latitude: number; longitude: number; address: string };
  messageText?: string;
  currentStep: number;
  previousTool?: string;
  role: string;
  history: string[]; // List of executed tools
  trace: Array<{ timestamp: string; step: string; status: string; message: string }>;
  offlineQueue: Array<{ goal: string; params: any; timestamp: number }>;
  [key: string]: any;
}

export class ExecutionContextManager {
  // Persistent memory across sessions
  static lastWorker?: { id: string; name: string };
  static lastProject?: { id: string; title: string };
  static lastConversationId?: string;

  static createEmpty(role: string): ExecutionContextState {
    return {
      currentStep: 0,
      role,
      history: [],
      trace: [],
      offlineQueue: [],
    };
  }

  /**
   * Saves resolved entities to persistent follow-up memory
   */
  static updatePersistentMemory(state: ExecutionContextState) {
    if (state.workerId && state.workerName) {
      this.lastWorker = { id: state.workerId, name: state.workerName };
    }
    if (state.workspaceId && state.projectName) {
      this.lastProject = { id: state.workspaceId, title: state.projectName };
    }
    if (state.conversationId) {
      this.lastConversationId = state.conversationId;
    }
  }

  /**
   * Resolves common pronouns ("him", "her", "them") using cached last worker/project
   */
  static resolvePronoun(text: string): { workerName?: string; workerId?: string } {
    const lower = text.toLowerCase().trim();
    if (lower.includes('him') || lower.includes('her') || lower.includes('them') || lower.includes('उसको') || lower.includes('त्याला')) {
      if (this.lastWorker) {
        console.log(`[ExecutionContext] Resolved pronoun to last worker: ${this.lastWorker.name}`);
        return {
          workerName: this.lastWorker.name,
          workerId: this.lastWorker.id
        };
      }
    }
    return {};
  }
}
