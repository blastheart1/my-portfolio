export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface OpenAIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  source?: string;
  confidence?: number;
  relevance?: number;
}

export class OpenAIService {
  private config: OpenAIConfig;
  
  // Performance optimization properties
  private responseCache = new Map<string, OpenAIResponse>();
  private maxCacheSize = 50;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private rateLimitDelay = 1000; // 1 second between requests
  private lastRequestTime = 0;
  private usageStats = {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    averageResponseTime: 0
  };
  
  // Response optimization properties
  private maxResponseLength = 500; // Maximum response length in characters
  private maxTokens = 150; // Maximum tokens for response
  private responseCompression = true;

  // Content filtering for inappropriate content
  private inappropriateWords: string[] = [
    // English profanity
    'fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'crap', 'piss',
    // Filipino profanity and slang
    'tite', 'puke', 'puki', 'puta', 'gago', 'tangina', 'ulol', 'bobo',
    'tanga', 'walanghiya', 'lintik', 'hayop', 'pokpok', 'putang',
    // Relationship/personal inappropriate words (standalone)
    'girls', 'boys', 'women', 'men', 'sex', 'sexy', 'hot', 'beautiful', 
    'cute', 'attractive', 'single', 'girlfriend', 'boyfriend', 'wife', 
    'husband', 'marriage', 'dating', 'love', 'kiss', 'hug'
  ];

  private inappropriatePatterns: string[] = [
    'do you like girls', 'are you single', 'do you have a girlfriend',
    'are you married', 'do you have a wife', 'are you dating',
    'do you like women', 'are you straight', 'do you like boys',
    'what do you think about girls', 'do you find me attractive',
    'are you gay', 'whats your type', 'do you want to date'
  ];

  constructor(config: OpenAIConfig) {
    this.config = {
      model: 'gpt-3.5-turbo',
      maxTokens: 150,
      temperature: 0.7,
      ...config,
    };
  }

  /**
   * Detect if text is in a non-English language
   */
  private detectNonEnglishLanguage(text: string): boolean {
    const lowerText = text.toLowerCase().trim();
    
    // Common English words that should never be flagged as non-English
    const commonEnglishWords = [
      'background', 'experience', 'skills', 'services', 'pricing', 'contact',
      'about', 'work', 'project', 'website', 'development', 'chatbot',
      'ai', 'technology', 'software', 'programming', 'code', 'build',
      'create', 'design', 'help', 'hello', 'hi', 'thanks', 'thank you',
      'yes', 'no', 'ok', 'okay', 'sure', 'please', 'what', 'how', 'when',
      'where', 'why', 'who', 'which', 'can', 'will', 'would', 'could'
    ];
    
    // If the text contains common English words, it's likely English
    if (commonEnglishWords.some(word => lowerText.includes(word))) {
      return false;
    }
    
    // Common non-English patterns (Tagalog, Spanish, etc.)
    const nonEnglishPatterns = [
      // Tagalog/Filipino
      'ano', 'saan', 'paano', 'bakit', 'sino', 'kailan', 'alin', 'gaano',
      'ang', 'ng', 'sa', 'ay', 'na', 'pa', 'din', 'rin', 'lang', 'naman',
      'talaga', 'ba', 'po', 'ho', 'opo', 'hindi', 'oo', 'salamat', 'magandang',
      'umaga', 'hapon', 'gabi', 'kumusta', 'kamusta', 'mahal', 'mahal kita',
      
      // Spanish
      'hola', 'como', 'estas', 'que', 'donde', 'cuando', 'porque', 'quien',
      'buenos', 'dias', 'tardes', 'noches', 'gracias', 'por favor', 'si', 'no'
    ];
    
    // Check for non-English words
    const hasNonEnglishWords = nonEnglishPatterns.some(word => 
      lowerText.includes(word)
    );
    
    // Check for non-Latin characters (Cyrillic, Arabic, Chinese, etc.)
    const hasNonLatinChars = /[^\u0000-\u007F\u00C0-\u017F\u0100-\u017F\u0180-\u024F]/.test(text);
    
    // Check for Tagalog-specific characters
    const hasTagalogChars = /[ñÑ]/.test(text);
    
    return hasNonEnglishWords || hasNonLatinChars || hasTagalogChars;
  }

  /**
   * Generate redirect response for non-English queries
   */
  private generateLanguageRedirectResponse(userMessage: string): OpenAIResponse {
    // Detect if it's Tagalog
    const isTagalog = /(ano|saan|paano|bakit|sino|kailan|alin|gaano|ang|ng|sa|ay|na|pa|din|rin|lang|naman|talaga|ba|po|ho|opo|hindi|oo|salamat|magandang|umaga|hapon|gabi|kumusta|kamusta|mahal)/i.test(userMessage);
    
    let response: string;
    
    if (isTagalog) {
      // Conversational Tagalog and Taglish variations with pricing and lead generation
      const tagalogVariations = [
        "Hi! Ako yung chatbot ni Luis. Services niya: **Website Development** (₱22k–₱100k depende sa package), **AI Chatbot Integration** (₱7k–₱15k add-on or free sa Enterprise), **Full-stack apps** gamit modern tech, at **QA/Project Management** para smooth at reliable delivery. Gusto mo ba **pricing details** o **project discussion** na agad?",
        "Hello! Chatbot ni Luis 'to. Pwede siya sa: **Website builds** (Starter ₱22k, Pro ₱45k, Enterprise ₱100k), **AI Chatbots** (₱7k–₱15k or free sa Enterprise), **Full-stack Development** with AI integration, at **QA Management** para siguradong quality ang output. Interesado ka ba makita yung **packages**?",
        "Kumusta! Ako ang chatbot ni Luis. Inaalok niya: **Website packages** (₱22k–₱100k), **AI Chatbots** (₱7k–₱15k add-on or kasama sa Enterprise), **Full-stack solutions** with AI, at **Project + QA Management** para hassle-free at on-time delivery. Gusto mo ba malaman alin bagay sa'yo?",
        // Conversational Taglish Versions
        "Hey! I'm Luis's chatbot. He offers: **Websites** (₱22k–₱100k), **AI Chatbots** (₱7k–₱15k add-on or free with Enterprise), **Full-stack dev** with React/Next.js/AI, plus **QA & Project Management** para sure na polished at reliable ang delivery. Want me to walk you through **packages**?",
        "Hi! Ako yung chatbot ni Luis. Services niya include: **Website Development** (₱22k–₱100k), **AI Chatbot add-ons** (₱7k–₱15k or free with Enterprise), **Full-stack Development** with AI, and **QA + Project Management** para efficient at smooth delivery. Curious ka ba sa **pricing**?",
        "Hello! Chatbot ni Luis here. Quick rundown ng services niya: **Websites** (Starter ₱22k, Pro ₱45k, Enterprise ₱100k), **AI Chatbots** (₱7k–₱15k or free with Enterprise), **Full-stack apps** with AI, and **QA/Project Management** to keep everything on track. Gusto mo ba **detailed breakdown** or usap tayo about your **project**?"
      ];
      response = tagalogVariations[Math.floor(Math.random() * tagalogVariations.length)];
    } else {
      // English variations
      const englishVariations = [
        "Sure, I can help with that! I'm Luis' chatbot and I handle inquiries about his professional services. Want to know what he offers? He specializes in **website development**, **AI chatbot solutions**, and **full-stack applications**. Would you like to check out the **pricing** or jump into a **project discussion**?",
        "Hi there! I'm Luis' chatbot. He provides services like **website development**, **AI chatbot integration**, and **full-stack development**. Do you want me to share the **pricing details** or go straight into **project discussion**?",
        "Got it! I'm Luis' chatbot here to help with his professional services. He offers **website development**, **AI chatbot solutions**, and **full-stack development**. Would you like to explore the **packages** or talk about your **project directly**?"
      ];
      response = englishVariations[Math.floor(Math.random() * englishVariations.length)];
    }
    
    return {
      content: response,
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  }

  /**
   * Check for inappropriate content
   */
  private isInappropriateContent(text: string): { isInappropriate: boolean, type: 'profanity' | 'personal' | 'none' } {
    const lowerText = text.toLowerCase().trim();
    
    // Check for profanity (exact word matches to avoid false positives)
    const profanityWords = ['fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'crap', 'piss',
                           'tite', 'puke', 'puki', 'puta', 'gago', 'tangina', 'ulol', 'bobo',
                           'tanga', 'walanghiya', 'lintik', 'hayop', 'pokpok', 'putang'];
    
    const hasProfanity = profanityWords.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerText);
    });
    
    if (hasProfanity) {
      return { isInappropriate: true, type: 'profanity' };
    }
    
    // Check for personal/inappropriate questions
    const personalWords = ['girls', 'boys', 'women', 'men', 'sex', 'sexy', 'hot', 'beautiful', 
                           'cute', 'attractive', 'single', 'girlfriend', 'boyfriend', 'wife', 
                           'husband', 'marriage', 'dating', 'love', 'kiss', 'hug'];
    
    const hasPersonalWord = personalWords.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerText);
    });
    
    const hasPersonalQuestion = this.inappropriatePatterns.some(pattern => lowerText.includes(pattern));
    
    if (hasPersonalWord || hasPersonalQuestion) {
      return { isInappropriate: true, type: 'personal' };
    }
    
    return { isInappropriate: false, type: 'none' };
  }

  /**
   * Generate response using OpenAI API
   */
  async generateResponse(userMessage: string, context?: string): Promise<OpenAIResponse> {
    // Check for inappropriate content first
    const contentCheck = this.isInappropriateContent(userMessage);
    if (contentCheck.isInappropriate) {
      console.log(`🚫 OpenAI inappropriate content detected (${contentCheck.type}): "${userMessage}"`);
      let response: string;
      
      if (contentCheck.type === 'profanity') {
        response = "Sorry, I'd be happy to discuss more valuable topics and let's not waste time. How about we talk about my **website development services**, **AI chatbot solutions**, or my **technical expertise** instead?";
      } else if (contentCheck.type === 'personal') {
        response = "I'm married and prefer to keep our conversation professional. I'd be happy to discuss my **services**, **projects**, or **technical skills** instead. What can I help you with professionally?";
      } else {
        response = "Let's focus on professional topics. I'd be happy to discuss my **development services**, **AI solutions**, or **portfolio projects**. What interests you?";
      }
      
      return {
        content: response,
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
    }

    try {
      const systemPrompt = context || 
        "You are Luis' AI assistant. Always try to relate user questions to Luis' services and expertise. " +
        "If someone asks about 'background', 'experience', 'skills', 'services', etc., provide relevant information about Luis' professional background and services. " +
        "Be proactive in offering relevant information about Luis' services when appropriate. " +
        "IMPORTANT: If the user gives a short response like 'yes', 'no', 'ok', 'products', etc., use the conversation history to understand what they're responding to and provide a helpful follow-up. " +
        "Always maintain conversation context and build on previous messages naturally.";

      console.log('🔍 OpenAI API Key status:', this.config.apiKey ? 'configured' : 'missing');
      console.log('🔍 API Key length:', this.config.apiKey ? '***' : '0');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
          max_tokens: this.maxTokens,
          temperature: this.config.temperature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API Error Response:', errorData);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        usage: data.usage,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate AI response. Please try again.');
    }
  }

  /**
   * Build conversation context from message history with smart token management
   */
  private buildConversationContext(conversationHistory: Message[]): string {
    if (conversationHistory.length === 0) {
      return "This is the start of our conversation.";
    }

    // Get recent messages and important context
    const recentMessages = conversationHistory.slice(-6); // Last 6 messages
    const importantMessages = conversationHistory.filter(msg => 
      msg.content.toLowerCase().includes('project') || 
      msg.content.toLowerCase().includes('service') ||
      msg.content.toLowerCase().includes('pricing') ||
      msg.content.toLowerCase().includes('website') ||
      msg.content.toLowerCase().includes('ecommerce') ||
      msg.content.toLowerCase().includes('chatbot') ||
      msg.content.toLowerCase().includes('cost') ||
      msg.content.toLowerCase().includes('price') ||
      msg.content.toLowerCase().includes('budget') ||
      msg.content.toLowerCase().includes('product') ||
      msg.content.toLowerCase().includes('build') ||
      msg.content.toLowerCase().includes('create') ||
      msg.content.toLowerCase().includes('develop')
    );

    // Combine important context with recent messages, avoiding duplicates
    const contextMessages = [...new Set([...importantMessages, ...recentMessages])]
      .slice(-8) // Max 8 messages for context
      .map(msg => `${msg.isUser ? 'User' : 'Luis'}: ${msg.content}`)
      .join('\n');

    // Estimate token count (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokens = contextMessages.length / 4;
    
    if (estimatedTokens > 1000) {
      // If context is too long, prioritize recent messages
      const recentContext = conversationHistory.slice(-4)
        .map(msg => `${msg.isUser ? 'User' : 'Luis'}: ${msg.content}`)
        .join('\n');
      return recentContext || "This is the start of our conversation.";
    }

    // If we have very little context, include more recent messages
    if (contextMessages.length < 50 && conversationHistory.length > 2) {
      const extendedContext = conversationHistory.slice(-4)
        .map(msg => `${msg.isUser ? 'User' : 'Luis'}: ${msg.content}`)
        .join('\n');
      return extendedContext || "This is the start of our conversation.";
    }

    return contextMessages || "This is the start of our conversation.";
  }

  /**
   * Generate response with portfolio context (optimized with caching)
   */
  async generatePortfolioResponse(userMessage: string, conversationHistory: Message[] = []): Promise<OpenAIResponse> {
    // Check cache first for performance
    const cacheKey = this.generateCacheKey(userMessage, conversationHistory);
    const cachedResponse = this.responseCache.get(cacheKey);
    if (cachedResponse) {
      console.log('⚡ Using cached OpenAI response for:', userMessage);
      this.usageStats.totalRequests++;
      return cachedResponse;
    }

    // Check for inappropriate content first
    const contentCheck = this.isInappropriateContent(userMessage);
    if (contentCheck.isInappropriate) {
      console.log(`🚫 OpenAI portfolio inappropriate content detected (${contentCheck.type}): "${userMessage}"`);
      let response: string;
      
      if (contentCheck.type === 'profanity') {
        response = "Sorry, I'd be happy to discuss more valuable topics and let's not waste time. How about we talk about my **website development services**, **AI chatbot solutions**, or my **technical expertise** instead?";
      } else if (contentCheck.type === 'personal') {
        response = "I'm married and prefer to keep our conversation professional. I'd be happy to discuss my **services**, **projects**, or **technical skills** instead. What can I help you with professionally?";
      } else {
        response = "Let's focus on professional topics. I'd be happy to discuss my **development services**, **AI solutions**, or **portfolio projects**. What interests you?";
      }
      
      const fallbackResponse = {
        content: response,
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
      
      // Cache the fallback response
      this.cacheResponse(cacheKey, fallbackResponse);
      return fallbackResponse;
    }

    // Check if the message is in a non-English language
    const isNonEnglish = this.detectNonEnglishLanguage(userMessage);
    if (isNonEnglish) {
      console.log(`🌍 Non-English language detected: "${userMessage}"`);
      return this.generateLanguageRedirectResponse(userMessage);
    }

    // Build optimized conversation context
    const conversationContext = this.buildOptimizedConversationContext(conversationHistory);
    
    // Debug logging for context
    console.log('🧠 Optimized conversation context:', conversationContext);
    console.log('📊 Context length:', conversationContext.length, 'characters');
    
    // Rate limiting
    await this.enforceRateLimit();
    
    const context = 
      "You are Luis (Antonio Luis Santos), a software developer and team manager. " +
      "You are a Full-Stack Developer and QA Specialist with expertise in building future-ready applications. " +
      "You have expertise in TypeScript, ReactJS, TailwindCSS, and QA. " +
      "You build AI chatbots, work on full-stack development, and have hobbies like Formula 1, RC cars, cycling, and coffee. " +
      
      "CONVERSATION HISTORY:\n" + conversationContext + "\n\n" +
      
      "PROFESSIONAL BACKGROUND: " +
      "• Current: Full-Stack Developer and QA Team Manager " +
      "• Experience: Full-Stack Development, AI Solutions, QA Management " +
      "• Specialization: Modern web development, AI chatbots, and automation " +
      
      "TECHNICAL SKILLS: " +
      "Frontend: React, Next.js, TailwindCSS, TypeScript, JavaScript, HTML5, CSS3, Wix (especially Velo for full Wix coding) " +
      "Backend: Node.js, Express, PostgreSQL, Python, Sanity, Java, C++, PHP, MySQL " +
      "DevOps & Cloud: Docker, AWS, Vercel, Git, GitHub, Postman, Zapier, ngrok, Netlify, Google Cloud " +
      "Specialized: QA Team Management, AI Chatbots, Automation Testing " +
      "Platform Experience: You do not have direct working experience with Shopify but you have transferrable skills that can be utilized for Shopify projects " +
      
      "KEY PROJECTS: " +
      "• Pilates With Bee: Online Pilates clinic platform with headless CMS and automation " +
      "• ResumeAI: AI-powered resume analysis web app with skill matching " +
      "• AI Chat with LM Studio: Full-stack AI chat with local LLM and global access " +
      
      "BUSINESS SERVICES: " +
      "• Website Development: Starter (₱22,000), Professional (₱45,000), Enterprise (₱100,000) " +
      "• AI Chatbot Integration: Smart Support, E-commerce, Advanced AI Chatbots " +
      "• Full-stack development, QA process optimization " +
      
      "PERSONAL INTERESTS: " +
      "Road cycling, gravel cycling, Formula 1 (you stan drivers like Lewis Hamilton, Sebastian Vettel, Max Verstappen, Nikki Lauda), sim racing, RC car builds (Tamiya kits), coffee brewing " +
      "YouTube channel: Sunraku-san TV for hobby content " +
      
      "CONTACT: " +
      "Email: antonioluis.santos1@gmail.com " +
      "Location: Manila, Philippines " +
      "Portfolio: https://my-portfolio-jusu.vercel.app/ " +
      
      "RESPONSE STYLE: " +
      "Respond naturally and conversationally as if you're having a direct conversation. " +
      "Start responses with natural language like 'Yes, I...' or 'I have experience in...' or 'That's a great question...' " +
      "Be professional but friendly and engaging. " +
      "IMPORTANT: Always try to relate user questions to Luis' services and expertise. " +
      "If someone asks about 'background', 'experience', 'skills', 'services', etc., provide relevant information about Luis' professional background and services. " +
      "If asked about something outside your expertise, politely redirect to your core skills. " +
      "If the user gives a short response like 'yes', 'no', 'ok', etc., use the conversation history to understand what they're responding to and provide a helpful follow-up. " +
      "Always maintain conversation context and build on previous messages naturally. " +
      "Be proactive in offering relevant information about Luis' services when appropriate. " +
      "KEEP RESPONSES CONCISE: Aim for 2-3 sentences maximum. Be direct and to the point. " +
      "Avoid lengthy explanations unless specifically requested. " +
      
      "FORMATTING: " +
      "Use simple markdown formatting for better readability: " +
      "• Use **bold** for important terms and headings " +
      "• Use bullet points (•) for lists " +
      "• Use line breaks for better structure " +
      "• Keep formatting minimal but effective " +
      
      "EXAMPLES: " +
      "Pricing: **Pricing Plans:** • **Starter** (₱22,000/$599) - Small businesses • **Professional** (₱45,000/$1,199) - Growing businesses • **Enterprise** (₱100,000/$2,999) - Complete solution";

    // Make API call with performance tracking
    const startTime = Date.now();
    const response = await this.generateResponse(userMessage, context);
    const responseTime = Date.now() - startTime;
    
    // Optimize response for better token usage
    const optimizedResponse = this.optimizeResponse(response);
    
    // Update usage statistics
    this.updateUsageStats(optimizedResponse, responseTime);
    
    // Cache the optimized response
    this.cacheResponse(cacheKey, optimizedResponse);
    
    return optimizedResponse;
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }

  /**
   * Clear conversation context (useful for new conversations)
   */
  clearConversationContext(): void {
    console.log('🧹 Conversation context cleared');
  }

  /**
   * Update API key
   */
  updateApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * Performance optimization methods
   */
  
  /**
   * Generate cache key for requests
   */
  private generateCacheKey(userMessage: string, conversationHistory: Message[]): string {
    const recentMessages = conversationHistory.slice(-3).map(msg => msg.content).join('|');
    return `${userMessage.toLowerCase().trim()}|${recentMessages}`;
  }

  /**
   * Cache response with LRU eviction
   */
  private cacheResponse(key: string, response: OpenAIResponse): void {
    if (this.responseCache.size >= this.maxCacheSize) {
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey) {
        this.responseCache.delete(firstKey);
      }
    }
    this.responseCache.set(key, response);
  }

  /**
   * Build optimized conversation context with token limits
   */
  private buildOptimizedConversationContext(conversationHistory: Message[]): string {
    if (conversationHistory.length === 0) {
      return "This is the start of our conversation.";
    }

    // Get recent messages (last 4 for better context)
    const recentMessages = conversationHistory.slice(-4);
    
    // Get important messages (filtered by keywords)
    const importantMessages = conversationHistory.filter(msg => 
      msg.content.toLowerCase().includes('project') || 
      msg.content.toLowerCase().includes('service') ||
      msg.content.toLowerCase().includes('pricing') ||
      msg.content.toLowerCase().includes('website') ||
      msg.content.toLowerCase().includes('ecommerce') ||
      msg.content.toLowerCase().includes('chatbot') ||
      msg.content.toLowerCase().includes('cost') ||
      msg.content.toLowerCase().includes('price') ||
      msg.content.toLowerCase().includes('budget') ||
      msg.content.toLowerCase().includes('product') ||
      msg.content.toLowerCase().includes('build') ||
      msg.content.toLowerCase().includes('create') ||
      msg.content.toLowerCase().includes('develop')
    );

    // Combine and deduplicate
    const contextMessages = [...new Set([...importantMessages, ...recentMessages])]
      .slice(-6) // Limit to 6 messages max
      .map(msg => `${msg.isUser ? 'User' : 'Luis'}: ${msg.content}`)
      .join('\n');

    // Estimate token count (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokens = contextMessages.length / 4;
    
    // If context is too long, use only recent messages
    if (estimatedTokens > 200) {
      const shortContext = recentMessages
        .map(msg => `${msg.isUser ? 'User' : 'Luis'}: ${msg.content}`)
        .join('\n');
      return shortContext || "This is the start of our conversation.";
    }

    return contextMessages || "This is the start of our conversation.";
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(response: OpenAIResponse, responseTime: number): void {
    this.usageStats.totalRequests++;
    
    if (response.usage) {
      this.usageStats.totalTokens += response.usage.total_tokens;
      // Estimate cost (GPT-3.5-turbo: $0.002 per 1K tokens)
      const cost = (response.usage.total_tokens / 1000) * 0.002;
      this.usageStats.totalCost += cost;
      
      // Token usage alerts
      this.checkTokenUsageAlerts(response.usage.total_tokens);
    }
    
    // Update average response time
    this.usageStats.averageResponseTime = 
      (this.usageStats.averageResponseTime * (this.usageStats.totalRequests - 1) + responseTime) / 
      this.usageStats.totalRequests;
    
    console.log(`📊 API Stats: ${this.usageStats.totalRequests} requests, ${this.usageStats.totalTokens} tokens, $${this.usageStats.totalCost.toFixed(4)} cost, ${responseTime}ms response time`);
  }

  /**
   * Check for token usage alerts
   */
  private checkTokenUsageAlerts(tokens: number): void {
    if (tokens > this.maxTokens) {
      console.warn(`⚠️ High token usage: ${tokens} tokens (limit: ${this.maxTokens})`);
    }
    
    if (tokens > this.maxTokens * 1.5) {
      console.warn(`🚨 Excessive token usage: ${tokens} tokens (limit: ${this.maxTokens})`);
    }
    
    // Check for cost alerts
    if (this.usageStats.totalCost > 1.0) { // $1.00
      console.warn(`💰 High cost alert: $${this.usageStats.totalCost.toFixed(4)} total cost`);
    }
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    cacheStats: { size: number; maxSize: number };
    usageStats: {
      totalRequests: number;
      totalTokens: number;
      totalCost: number;
      averageResponseTime: number;
    };
    rateLimitDelay: number;
  } {
    return {
      cacheStats: {
        size: this.responseCache.size,
        maxSize: this.maxCacheSize
      },
      usageStats: { ...this.usageStats },
      rateLimitDelay: this.rateLimitDelay
    };
  }

  /**
   * Clear response cache
   */
  public clearCache(): void {
    this.responseCache.clear();
    console.log('🧹 OpenAI response cache cleared');
  }

  /**
   * Update rate limit delay
   */
  public updateRateLimit(delay: number): void {
    this.rateLimitDelay = Math.max(100, delay); // Minimum 100ms
    console.log(`⏱️ Rate limit updated to ${this.rateLimitDelay}ms`);
  }

  /**
   * Response optimization methods
   */
  
  /**
   * Optimize response length and content
   */
  private optimizeResponse(response: OpenAIResponse): OpenAIResponse {
    if (!this.responseCompression) {
      return response;
    }

    let optimizedContent = response.content;
    
    // Truncate if too long
    if (optimizedContent.length > this.maxResponseLength) {
      optimizedContent = this.smartTruncate(optimizedContent, this.maxResponseLength);
      console.log(`✂️ Response truncated from ${response.content.length} to ${optimizedContent.length} characters`);
    }
    
    // Compress formatting
    optimizedContent = this.compressFormatting(optimizedContent);
    
    // Remove redundant information
    optimizedContent = this.removeRedundancy(optimizedContent);
    
    return {
      ...response,
      content: optimizedContent
    };
  }

  /**
   * Smart truncation that preserves important information
   */
  private smartTruncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Try to find a good breaking point
    const truncated = text.substring(0, maxLength - 50); // Leave room for ellipsis
    const lastSentence = truncated.lastIndexOf('.');
    const lastParagraph = truncated.lastIndexOf('\n\n');
    const lastBullet = truncated.lastIndexOf('•');
    
    const breakPoint = Math.max(lastSentence, lastParagraph, lastBullet);
    
    if (breakPoint > maxLength * 0.7) { // If we found a good break point
      return text.substring(0, breakPoint + 1) + '\n\n*[Response truncated for brevity]*';
    } else {
      // Fallback to character limit with ellipsis
      return text.substring(0, maxLength - 3) + '...';
    }
  }

  /**
   * Compress formatting while preserving readability
   */
  private compressFormatting(text: string): string {
    return text
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Compress multiple spaces
      .replace(/ {2,}/g, ' ')
      // Remove excessive bullet points
      .replace(/(•\s*){4,}/g, '• ')
      // Compress repeated punctuation
      .replace(/!{2,}/g, '!')
      .replace(/\?{2,}/g, '?')
      .trim();
  }

  /**
   * Remove redundant information
   */
  private removeRedundancy(text: string): string {
    // Remove repeated phrases
    const sentences = text.split(/[.!?]+/);
    const uniqueSentences = [...new Set(sentences.map(s => s.trim()))];
    
    if (uniqueSentences.length < sentences.length) {
      console.log(`🔄 Removed ${sentences.length - uniqueSentences.length} redundant sentences`);
      return uniqueSentences.join('. ').trim();
    }
    
    return text;
  }

  /**
   * Update response optimization settings
   */
  public updateResponseOptimization(settings: {
    maxResponseLength?: number;
    maxTokens?: number;
    responseCompression?: boolean;
  }): void {
    if (settings.maxResponseLength) {
      this.maxResponseLength = Math.max(100, settings.maxResponseLength);
    }
    if (settings.maxTokens) {
      this.maxTokens = Math.max(50, settings.maxTokens);
    }
    if (settings.responseCompression !== undefined) {
      this.responseCompression = settings.responseCompression;
    }
    console.log(`⚙️ Response optimization updated: maxLength=${this.maxResponseLength}, maxTokens=${this.maxTokens}, compression=${this.responseCompression}`);
  }

  /**
   * Get response optimization settings
   */
  public getResponseOptimizationSettings(): {
    maxResponseLength: number;
    maxTokens: number;
    responseCompression: boolean;
  } {
    return {
      maxResponseLength: this.maxResponseLength,
      maxTokens: this.maxTokens,
      responseCompression: this.responseCompression
    };
  }
}

