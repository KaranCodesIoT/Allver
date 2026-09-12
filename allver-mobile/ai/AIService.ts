import { ActionType, AIAction } from './ActionTypes';
import { PromptBuilder, SystemContext } from './Prompt';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: AIAction;
  timestamp: Date;
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

export class AIService {
  private static GEMINI_API_KEY = (process.env.EXPO_PUBLIC_GEMINI_API_KEY || '').trim().replace(/[\r\n]/g, '');
  private static lastSuccessfulConfig: { version: string; model: string } | null = null;

  private static MOCK_RESPONSES: { keywords: string[]; text: string; actionType?: ActionType; getParams?: (input: string) => any; suggestions?: string[] }[] = [
    {
      keywords: ['contractor', 'builder', 'firm', 'find contractor'],
      text: 'I can help you connect with qualified builders and contractors in your area. Redirecting you to our contractor search engine!',
      actionType: ActionType.FIND_CONTRACTORS,
      getParams: (input) => ({ profession: 'Contractor', location: 'Mumbai' }),
    },
    {
      keywords: ['project', 'job', 'work', 'jobs', 'invitation'],
      text: 'Sure! Let me take you to job opportunities and project lists suited to your skills.',
      actionType: ActionType.VIEW_PROJECTS,
    },
    {
      keywords: ['compare', 'estimate', 'cost', 'budget', 'pricing'],
      text: 'Opening the estimation tool. Here, you can compare price rates, materials, and durations side-by-side.',
      actionType: ActionType.COMPARE_ESTIMATES,
    },
    {
      keywords: ['design', 'similar design', 'photo', 'living room', 'kitchen', 'bedroom'],
      text: 'Opening the Similar Designs catalog. Let\'s explore beautiful layouts uploaded by top architects.',
      actionType: ActionType.VIEW_DESIGNS,
    },
    {
      keywords: ['portfolio', 'highlight', 'my work', 'upload photo', 'add highlight'],
      text: 'Opening your Portfolio Highlights view where you can showcase your completed works to potential clients.',
      actionType: ActionType.UPDATE_PORTFOLIO,
    },
    {
      keywords: [
        // English verbs
        'tell ', 'ask ', 'send message', 'message to', 'msg to',
        'send msg', 'message ', 'inform ', 'reply to', 'reply ',
        'respond to', 'respond ', 'write to', 'text ', 'ping ',
        'contact ', 'notify ', 'convey ', 'forward to',
        // Hindi/Hinglish - with spaces
        'bolo ', 'bolna ', 'bol do', 'keh do', 'bata do',
        'message bhejo', 'msg bhejo', 'batao ', 'jawab do', 'jawab de',
        // Hindi/Hinglish - combined words (no space)
        'boldo', 'kehdo', 'batado', 'bhejdo', 'bhejo',
        // Hindi/Hinglish - "ko" patterns (matches "X ko boldo/bolo/batao")
        'ko bol', 'ko bata', 'ko keh', 'ko msg', 'ko message',
        'ko bhej', 'ko inform', 'ko send', 'ko reply', 'ko jawab',
        'ko likh', 'ko text',
        // Devanagari
        'संदेश', 'मैसेज भेजो', 'बोलो', 'बोलदो', 'बता दो', 'कह दो',
        'को बोल', 'को बता', 'को मैसेज', 'जवाब दो'
      ],
      text: 'Initiating messaging agent...',
      actionType: ActionType.SEND_MESSAGE_TO_WORKER,
      getParams: (input) => {
        // Extract worker name from patterns like:
        // "tell X to...", "ask X ...", "X ko boldo...", "message X ..."
        let workerName = '';
        
        // Pattern 1: "tell/ask/message/inform X ..."
        const englishMatch = input.match(/(?:tell|ask|message|inform|reply\s+to|respond\s+to|write\s+to|text|ping|contact|notify|convey|forward\s+to)\s+(\w+)/i);
        // Pattern 2: "X ko boldo/bolo/batao/kehdo..."
        const hindiMatch = input.match(/^(\w+)\s+ko\s+/i);
        // Pattern 3: "boldo/bolo X ko..."  
        const reverseMatch = input.match(/(?:boldo|bolo|batao|kehdo)\s+(\w+)/i);
        
        if (englishMatch) workerName = englishMatch[1];
        else if (hindiMatch) workerName = hindiMatch[1];
        else if (reverseMatch) workerName = reverseMatch[1];
        
        return {
          workerName: workerName,
          messageText: input
        };
      },
    },
    {
      keywords: [
        'today\'s progress', 'todays progress', 'daily progress', 'daily report',
        'today\'s summary', 'status report', 'site summary',
        'what happened today', 'how much work', 'how many workers',
        'any delays', 'today\'s updates', 'aaj ka progress',
        'aaj ka kaam', 'aaj kya hua', 'kitna kaam hua',
        'progress report', 'site report', 'daily summary',
        'प्रगति', 'आज की रिपोर्ट'
      ],
      text: 'Generating daily site progress summary...',
      actionType: ActionType.GET_DAILY_PROGRESS,
    },
    {
      keywords: [
        'search worker', 'find worker', 'search labour', 'find labour',
        'worker search', 'labour search', 'show workers',
        'worker dhundo', 'labour dhundo', 'kaam wale dhundo',
        'available worker', 'nearby worker'
      ],
      text: 'Searching for matching workers...',
      actionType: ActionType.SEARCH_WORKERS,
    },
    {
      keywords: ['post project', 'create job', 'post job', 'publish project', 'new project'],
      text: 'Opening job posting confirmation dialog...',
      actionType: ActionType.POST_JOB,
      getParams: (input) => ({
        title: 'Paint the walls',
        profession: 'Painter',
        workers: 5,
        location: 'Thane',
        budget: 30000
      }),
    },
    // Navigation shortcuts
    {
      keywords: ['open chat', 'go to chat', 'inbox'],
      text: 'Opening your chats...',
      actionType: ActionType.OPEN_CHAT,
    },
    {
      keywords: ['notifications', 'notification', 'alerts'],
      text: 'Opening your notifications list...',
      actionType: ActionType.OPEN_NOTIFICATIONS,
    },
    {
      keywords: ['payments', 'payment', 'invoices', 'salary'],
      text: 'Redirecting you to view payments...',
      actionType: ActionType.OPEN_PAYMENTS,
    },
    {
      keywords: ['timeline', 'feed', 'posts'],
      text: 'Opening your activity feed...',
      actionType: ActionType.OPEN_TIMELINE,
    },
    {
      keywords: ['profile', 'dashboard', 'my account'],
      text: 'Opening your profile dashboard...',
      actionType: ActionType.OPEN_PROFILE,
    },
    // Multiple Action Suggestion match
    {
      keywords: ['labour', 'show labour', 'employee'],
      text: 'I found multiple matching actions for "labour". Did you mean one of these?',
      actionType: ActionType.AMBIGUOUS,
      suggestions: ['Find Labour', 'Team Members', 'Labour Profile'],
    },
  ];

  /**
   * Sends the user message to Gemini for Intent Classification.
   * Leverages conversation memory (up to last 10 messages).
   * Automatically falls back to mock classification if key is missing or fails.
   */
  static async sendMessage(
    history: ChatMessage[],
    text: string,
    context: SystemContext = {}
  ): Promise<ChatMessage> {
    const messageId = `ai-msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (!this.GEMINI_API_KEY || this.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      console.log('[AIService] EXPO_PUBLIC_GEMINI_API_KEY is not set. Running in Mock Mode.');
      return this.generateMockReply(text, messageId);
    }

    try {
      const systemPrompt = PromptBuilder.buildSystemPrompt(context);
      
      // Build history contents array matching Gemini API format
      const contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
      ];

      // Keep only the last 10 messages of the conversation for short-term memory
      const recentHistory = history.slice(-10);

      // Append chat history (map user -> user, assistant -> model as JSON)
      recentHistory.forEach((msg) => {
        if (msg.role === 'assistant') {
          const simulatedJson = {
            action: msg.action?.type || null,
            confidence: msg.action?.confidence || 1.0,
            parameters: msg.action?.parameters || null,
            suggestions: msg.action?.suggestions || null,
            response: msg.content
          };
          contents.push({
            role: 'model',
            parts: [{ text: JSON.stringify(simulatedJson) }],
          });
        } else {
          contents.push({
            role: 'user',
            parts: [{ text: msg.content }],
          });
        }
      });

      // Append current user input
      contents.push({
        role: 'user',
        parts: [{ text: text }],
      });

      const candidateConfigs = [
        { version: 'v1beta', model: 'gemini-3.5-flash' },
        { version: 'v1beta', model: 'gemini-2.0-flash' },
        { version: 'v1beta', model: 'gemini-flash-latest' },
        { version: 'v1', model: 'gemini-3.5-flash' },
        { version: 'v1', model: 'gemini-2.0-flash' },
      ];

      let lastError: Error | null = null;
      let resJson: any = null;
      const configsToTry = AIService.lastSuccessfulConfig && candidateConfigs.some(c => c.model === AIService.lastSuccessfulConfig!.model && c.version === AIService.lastSuccessfulConfig!.version)
        ? [AIService.lastSuccessfulConfig, ...candidateConfigs.filter(c => c.model !== AIService.lastSuccessfulConfig!.model || c.version !== AIService.lastSuccessfulConfig!.version)]
        : candidateConfigs;

      for (const config of configsToTry) {
        const endpointUrl = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent`;
        const maskedKey = this.GEMINI_API_KEY ? `${this.GEMINI_API_KEY.substring(0, 8)}...` : 'NONE';
        console.log(`[AIService] Calling Endpoint: ${endpointUrl}?key=${maskedKey}`);
        console.log(`[AIService] Model: ${config.model}, Version: ${config.version}`);
        
        try {
          const response = await fetch(
            `${endpointUrl}?key=${this.GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: contents,
                generationConfig: {
                  response_mime_type: 'application/json',
                },
              }),
            }
          );

          if (response.ok) {
            resJson = await response.json();
            AIService.lastSuccessfulConfig = config;
            console.log(`[AIService] Connection successful! Using model: ${config.model}, version: ${config.version} (HTTP 200)`);
            console.log(`[AIService] Full Successful HTTP Response Body:\n`, JSON.stringify(resJson, null, 2));
            break;
          } else {
            const errorText = await response.text();
            console.error(`[AIService] Google API Error Response Body (${config.version}/${config.model}):`, errorText);
            lastError = new Error(`Status: ${response.status}. Response: ${errorText}`);
            // If rate-limited (429), all endpoints share the same quota — skip remaining configs
            if (response.status === 429) {
              console.warn('[AIService] Rate limit hit (429). Skipping remaining endpoints — falling back to mock.');
              break;
            }
          }
        } catch (e: any) {
          console.error(`[AIService] Request failed for ${config.version}/${config.model}:`, e);
          lastError = e;
        }
      }

      if (!resJson) {
        throw new Error(`All Gemini API endpoints failed. Last error: ${lastError?.message}`);
      }
      const outputText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!outputText) {
        throw new Error('Gemini API returned empty text candidate.');
      }

      console.log('[AIService] Gemini RAW output:', outputText);

      // Strip markdown block markers
      let cleanedText = outputText.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      }

      let result;
      try {
        result = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('[AIService] JSON Parse failure. Raw output text was:', JSON.stringify(cleanedText));
        throw parseError;
      }

      // Build actions
      let finalAction: AIAction | undefined;
      if (result.action) {
        finalAction = {
          type: result.action as ActionType,
          parameters: result.parameters || undefined,
          confidence: result.confidence ?? 1.0,
          suggestions: result.suggestions || undefined,
        };
      } else if (result.suggestions) {
        // Handle ambiguous queries
        finalAction = {
          type: ActionType.AMBIGUOUS,
          confidence: result.confidence ?? 0.5,
          suggestions: result.suggestions,
        };
      }

      return {
        id: messageId,
        role: 'assistant',
        content: result.response || 'I processed your request, but could not determine the exact action.',
        action: finalAction,
        timestamp: new Date(),
      };

    } catch (err) {
      console.error('[AIService] Gemini API request failed. Falling back to Mock matcher:', err);
      return this.generateMockReply(text, messageId);
    }
  }

  /**
   * Upgraded mock generator for development fallback
   */
  private static generateMockReply(input: string, messageId: string): ChatMessage {
    const inputLower = input.toLowerCase().trim();
    
    // Better Unknown Handling: List available options when intent is not identified
    let replyText = 'I can help with:\n\n• Projects\n• Payments\n• Jobs\n• Team\n• Similarity Designs\n\nTry typing one of these commands!';
    let triggeredAction: AIAction | undefined;

    for (const mock of this.MOCK_RESPONSES) {
      const matched = mock.keywords.some((kw) => inputLower.includes(kw));
      if (matched) {
        replyText = mock.text;
        if (mock.actionType) {
          triggeredAction = {
            type: mock.actionType,
            parameters: mock.getParams ? mock.getParams(inputLower) : undefined,
            confidence: mock.actionType === ActionType.AMBIGUOUS ? 0.6 : 0.95,
            suggestions: mock.suggestions || undefined,
          };
        }
        break;
      }
    }

    // --- SMART PATTERN FALLBACK ---
    // If no keyword matched, try common messaging sentence patterns
    if (!triggeredAction) {
      // Pattern: "[verb] to [name] that/about/regarding..."
      const verbToNamePattern = inputLower.match(/^(\w+)\s+(?:to|for)\s+(\w+)\s+(?:that|about|regarding|ki|ke|ka)?\s/i);
      // Pattern: "[name] ko [anything]"
      const nameKoPattern = inputLower.match(/^(\w+)\s+ko\s+/i);

      if (verbToNamePattern) {
        const verb = verbToNamePattern[1];
        const name = verbToNamePattern[2];
        // Exclude navigation verbs like "go to", "open to"
        const navVerbs = ['go', 'open', 'navigate', 'switch', 'take', 'show'];
        if (!navVerbs.includes(verb)) {
          console.log(`[AIService] Pattern fallback: detected messaging intent "${verb} to ${name}"`);
          replyText = 'Initiating messaging agent...';
          triggeredAction = {
            type: ActionType.SEND_MESSAGE_TO_WORKER,
            parameters: { workerName: name, messageText: inputLower },
            confidence: 0.85,
          };
        }
      } else if (nameKoPattern) {
        const name = nameKoPattern[1];
        // Exclude common non-name words
        const excludeWords = ['mera', 'meri', 'mere', 'aaj', 'kal', 'kya', 'kab', 'kaha', 'kaise', 'sab', 'sabko', 'ye', 'wo', 'is', 'us'];
        if (!excludeWords.includes(name)) {
          console.log(`[AIService] Pattern fallback: detected Hindi messaging intent "${name} ko..."`);
          replyText = 'Initiating messaging agent...';
          triggeredAction = {
            type: ActionType.SEND_MESSAGE_TO_WORKER,
            parameters: { workerName: name, messageText: inputLower },
            confidence: 0.85,
          };
        }
      }
    }

    return {
      id: messageId,
      role: 'assistant',
      content: replyText,
      action: triggeredAction,
      timestamp: new Date(),
    };
  }

  public static async generateProfessionalMessage(instruction: string): Promise<string> {
    if (!this.GEMINI_API_KEY || this.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      return `Hi, regarding: "${instruction}". Let me know if you have any questions.`;
    }

    try {
      const contents = [
        {
          role: 'user',
          parts: [{
            text: `You are a professional assistant. Convert the following message instruction into a natural, polite, and professional message to a worker. Return only the converted text, no explanations, no quotes, no extra formatting.
            
Instruction: "${instruction}"`
          }]
        }
      ];

      const config = this.lastSuccessfulConfig || { version: 'v1beta', model: 'gemini-3.5-flash' };
      const endpointUrl = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent`;

      const response = await fetch(
        `${endpointUrl}?key=${this.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: contents,
          })
        }
      );

      if (response.ok) {
        const resJson = await response.json();
        const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return text.trim();
        }
      }
    } catch (e) {
      console.error('[AIService] Failed to generate professional message:', e);
    }
    return `Hi, regarding: "${instruction}". Let me know if you have any questions.`;
  }

  public static async generateProgressSummary(role: string, rawData: any): Promise<string> {
    if (!this.GEMINI_API_KEY || this.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      return `Daily Site Progress Report for ${rawData.projectName} (Mock Summary):\n` +
             `- Updates: ${rawData.updatesCount} work updates logged.\n` +
             `- Tasks: ${rawData.pendingTasksCount} pending tasks.`;
    }

    try {
      const contents = [
        {
          role: 'user',
          parts: [{
            text: `You are a Daily Site Progress Agent. Analyze the following raw site data collected today and generate a concise progress summary report tailored for the user's role: "${role}".

User Role Context:
- Client: Focus on milestone achievements, overall progress updates, and media uploads. Keep it high-level, clear, and professional.
- Contractor: Focus on pending tasks, work updates, and alerts/issues.
- Labour: Focus on tasks and activities scheduled for today.
- Architect: Focus on construction drawings, structural uploads, design files, and milestone logs.

Raw Daily Site Data:
${JSON.stringify(rawData, null, 2)}

Format the report using clean, concise Markdown with bullet points. Avoid preamble or filler text. Start directly with the title 'Daily Site Progress - [Project Name]'.`
          }]
        }
      ];

      const config = this.lastSuccessfulConfig || { version: 'v1beta', model: 'gemini-3.5-flash' };
      const endpointUrl = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent`;

      const response = await fetch(
        `${endpointUrl}?key=${this.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: contents,
          })
        }
      );

      if (response.ok) {
        const resJson = await response.json();
        const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return text.trim();
        }
      }
    } catch (e) {
      console.error('[AIService] Failed to generate progress summary:', e);
    }
    return `Failed to generate daily progress summary report for ${rawData.projectName}.`;
  }
}
