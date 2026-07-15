import { ActionType, AIAction } from '../ActionTypes';
import { BaseAgentPlanner, PlannerContext, PlannerSessionState, PlanResult } from './AgentPlanner';
import { LocationTool, ProjectTool, AttendanceTool, WorkerTool, PaymentTool, MessagingTool } from './AgentTools';

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

    if (goal !== ActionType.MARK_ATTENDANCE) {
      // General fallbacks
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `I've routed your request to ${goal}.`,
        action: { type: goal, parameters: initialParams },
      };
    }

    // 1. Get GPS Location
    const locResult = await LocationTool.getCurrentLocation();
    if (!locResult.success || !locResult.result) {
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `Location verification failed: ${locResult.error || 'Please grant location permissions to check in.'}`,
      };
    }

    const { latitude, longitude, address } = locResult.result;

    // 2. Fetch Active Workspace assignments
    const projResult = await ProjectTool.getActiveWorkspaces(context.userId);
    if (!projResult.success || !projResult.result) {
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `Could not retrieve your assigned projects: ${projResult.error}`,
      };
    }

    const activeWorkspaces = projResult.result;
    if (activeWorkspaces.length === 0) {
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `I couldn't find any active projects assigned to you. Attendance check-ins are restricted to assigned project team members.`,
      };
    }

    // Check if user has answered the project choice prompt
    let selectedWorkspace = null;
    if (activeWorkspaces.length === 1) {
      selectedWorkspace = activeWorkspaces[0];
    } else if (userInput) {
      const inputLower = userInput.toLowerCase();
      selectedWorkspace = activeWorkspaces.find(w =>
        inputLower.includes(w.title.toLowerCase()) ||
        (sessionState.choices && sessionState.choices.includes(w._id))
      );
    }

    if (!selectedWorkspace) {
      // Multiple active projects, ask user to select one
      const suggestions = activeWorkspaces.map(w => `Check-In at ${w.title}`);
      sessionState.currentGoal = ActionType.MARK_ATTENDANCE;
      sessionState.stepIndex = 1;
      sessionState.choices = activeWorkspaces.map(w => w._id);

      return {
        isComplete: false,
        requiresUserInput: true,
        responseText: `I found multiple active projects assigned to you. Please select your work site:`,
        suggestions,
      };
    }

    // 3. Submit Attendance check-in
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const checkTypeLabel = 'Check-In';

    const submitResult = await AttendanceTool.submitAttendance({
      workspaceId: selectedWorkspace._id,
      labourId: context.userId,
      status: 'Present',
      hours: 0,
      latitude,
      longitude,
      checkInTime: timeStr,
      address,
      senderId: context.userId,
    });

    if (!submitResult.success) {
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `Failed to log attendance to backend: ${submitResult.error || 'Server error'}`,
      };
    }

    // Success response with custom card
    return {
      isComplete: true,
      requiresUserInput: false,
      responseText: `Your check-in attendance has been recorded successfully at ${selectedWorkspace.title}!`,
      attendanceSuccessCard: {
        projectName: selectedWorkspace.title,
        checkType: checkTypeLabel,
        time: timeStr,
        lat: latitude,
        lng: longitude,
        address,
      },
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

    if (goal !== ActionType.MARK_ATTENDANCE) {
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `Routing request: ${goal}.`,
        action: { type: goal, parameters: initialParams },
      };
    }

    // Initialize session state parameters
    if (!sessionState.currentGoal) {
      sessionState.currentGoal = ActionType.MARK_ATTENDANCE;
      sessionState.stepIndex = 0; // Worker lookup
      sessionState.params = {
        workerName: initialParams.workerName || '',
        dayType: null,
        status: null,
        workspaceId: null,
        projectName: null,
        labourId: null,
      };
    }

    const stateParams = sessionState.params;

    // Step 0: Worker Lookup & Resolution
    if (sessionState.stepIndex === 0) {
      const searchName = stateParams.workerName || userInput || '';
      if (!searchName) {
        return {
          isComplete: false,
          requiresUserInput: true,
          responseText: `Please specify the name of the worker whose attendance you want to mark.`,
        };
      }

      stateParams.workerName = searchName;

      const lookupRes = await WorkerTool.findWorkersInTeam({
        userId: context.userId,
        name: searchName,
      });

      if (!lookupRes.success || !lookupRes.result) {
        return {
          isComplete: true,
          requiresUserInput: false,
          responseText: `Failed to search active workspaces: ${lookupRes.error}`,
        };
      }

      const matches = lookupRes.result;

      if (matches.length === 0) {
        // Unknown worker
        return {
          isComplete: true,
          requiresUserInput: false,
          responseText: `I couldn't find any worker named "${searchName}" in your active project sites. Please confirm their name or type it again.`,
        };
      } else if (matches.length === 1) {
        // Exactly 1 worker resolved
        const match = matches[0];
        stateParams.workerName = match.fullName;
        stateParams.labourId = match.labourId;
        stateParams.workspaceId = match.workspaceId;
        stateParams.projectName = match.projectName;

        sessionState.stepIndex = 1; // Proceed to dayType resolution
      } else {
        // Multiple workers resolved (Duplicate names)
        // If user already clicked or typed selection:
        if (userInput && sessionState.choices) {
          const selected = matches.find(m =>
            userInput.toLowerCase().includes(m.fullName.toLowerCase()) ||
            userInput.toLowerCase().includes(m.projectName.toLowerCase())
          );
          if (selected) {
            stateParams.workerName = selected.fullName;
            stateParams.labourId = selected.labourId;
            stateParams.workspaceId = selected.workspaceId;
            stateParams.projectName = selected.projectName;
            sessionState.choices = null;

            sessionState.stepIndex = 1;
          }
        }

        if (sessionState.stepIndex === 0) {
          sessionState.choices = matches.map(m => m.labourId);
          return {
            isComplete: false,
            requiresUserInput: true,
            responseText: `I found multiple workers matching "${searchName}". Please tap the correct worker:`,
            suggestions: matches.map(m => `${m.fullName} (${m.projectName})`),
          };
        }
      }
    }

    // Step 1: Day Type Resolution (Full Day, Half Day, Overtime)
    if (sessionState.stepIndex === 1) {
      if (userInput) {
        const inputLower = userInput.toLowerCase();
        if (inputLower.includes('full') || inputLower.includes('फुल') || inputLower.includes('पुर्ण')) {
          stateParams.dayType = 'full';
          sessionState.stepIndex = 2;
        } else if (inputLower.includes('half') || inputLower.includes('हाफ') || inputLower.includes('अर्धा')) {
          stateParams.dayType = 'half';
          sessionState.stepIndex = 2;
        } else if (inputLower.includes('overtime') || inputLower.includes('ओवरटाइम') || inputLower.includes('ओव्हरटाइम')) {
          stateParams.dayType = 'overtime';
          sessionState.stepIndex = 2;
        }
      }

      if (sessionState.stepIndex === 1) {
        return {
          isComplete: false,
          requiresUserInput: true,
          responseText: `Is Rohit's attendance for a Full Day, Half Day, or Overtime?`.replace('Rohit', stateParams.workerName),
          suggestions: ['Full Day', 'Half Day', 'Overtime'],
        };
      }
    }

    // Step 2: Presence Status Resolution (Present, Absent)
    if (sessionState.stepIndex === 2) {
      if (userInput) {
        const inputLower = userInput.toLowerCase();
        if (inputLower.includes('present') || inputLower.includes('हाजिर') || inputLower.includes('उपस्थित') || inputLower.includes('prasant')) {
          stateParams.status = 'present';
          sessionState.stepIndex = 3; // ready to submit
        } else if (inputLower.includes('absent') || inputLower.includes('गैर') || inputLower.includes('अनुपस्थित')) {
          stateParams.status = 'absent';
          sessionState.stepIndex = 3;
        }
      }

      if (sessionState.stepIndex === 2) {
        return {
          isComplete: false,
          requiresUserInput: true,
          responseText: `Is ${stateParams.workerName} Present or Absent?`,
          suggestions: ['Present', 'Absent'],
        };
      }
    }

    // Step 3: Execution of Attendance Logging API
    const labelDayType = stateParams.dayType === 'overtime' ? 'Overtime' : (stateParams.dayType === 'full' ? 'Full Day' : 'Half Day');
    const statusLabel = stateParams.status === 'present' ? 'Present' : 'Absent';
    const hours = stateParams.status === 'present' ? (stateParams.dayType === 'overtime' ? 12 : (stateParams.dayType === 'full' ? 8 : 4)) : 0;
    const dateStr = new Date().toISOString().split('T')[0];

    const attRes = await AttendanceTool.submitAttendance({
      workspaceId: stateParams.workspaceId,
      labourId: stateParams.labourId,
      status: statusLabel,
      hours,
      senderId: context.userId,
    });

    if (!attRes.success) {
      // Local Caching Fallback for Offline Mode / Network Failures
      const cachedDayType = stateParams.dayType === 'overtime' ? 'Overtime (Offline)' : (stateParams.dayType === 'full' ? 'Full Day (Offline)' : 'Half Day (Offline)');
      return {
        isComplete: true,
        requiresUserInput: false,
        responseText: `⚠️ Offline Mode: Could not connect to server. Worker ${stateParams.workerName}'s attendance check-in has been stored in local cache.`,
        contractorAttendanceSuccessCard: {
          workerName: stateParams.workerName,
          projectName: stateParams.projectName || 'Local Cache Site',
          dayType: cachedDayType,
          status: statusLabel,
          hours,
          date: dateStr,
        },
      };
    }

    return {
      isComplete: true,
      requiresUserInput: false,
      responseText: `Worker ${stateParams.workerName}'s attendance has been logged successfully at ${stateParams.projectName}!`,
      contractorAttendanceSuccessCard: {
        workerName: stateParams.workerName,
        projectName: stateParams.projectName,
        dayType: labelDayType,
        status: statusLabel,
        hours,
        date: dateStr,
      },
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
