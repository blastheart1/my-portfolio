/**
 * openaiService.ts
 *
 * Client-side AI service — thin wrapper around the server-side
 * /api/chatbot/generate route. Handles:
 *  - Guard rails (prompt injection pre-filter — Layer 2 after ChatWindow)
 *  - Content filtering (profanity, personal questions)
 *  - Language detection (Tagalog / non-English redirect)
 *  - Response caching (LRU, 50 entries)
 *  - Rate limiting (1 s between requests)
 *  - Conversation context building
 *
 * The actual AI provider selection (OpenAI vs Claude) and knowledge
 * injection happen server-side via /api/chatbot/generate.
 */
import { checkGuardRails, logGuardRailEvent, getBlockResponse } from './guardRails';

export interface OpenAIConfig {
  apiKey: string; // kept for backward compat; no longer used for direct calls
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface OpenAIResponse {
  content: string;
  provider?: string;
  model?: string;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private config: OpenAIConfig;

  private responseCache = new Map<string, OpenAIResponse>();
  private maxCacheSize = 50;
  private rateLimitDelay = 1000;
  private lastRequestTime = 0;
  private usageStats = {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    averageResponseTime: 0,
  };
  private maxResponseLength = 800;
  private responseCompression = true;

  private inappropriateWords = [
    'fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'crap', 'piss',
    'tite', 'puke', 'puki', 'puta', 'gago', 'tangina', 'ulol', 'bobo',
    'tanga', 'walanghiya', 'lintik', 'hayop', 'pokpok', 'putang',
    'girls', 'boys', 'women', 'men', 'sex', 'sexy', 'hot', 'beautiful',
    'cute', 'attractive', 'single', 'girlfriend', 'boyfriend', 'wife',
    'husband', 'marriage', 'dating', 'love', 'kiss', 'hug',
  ];

  private inappropriatePatterns = [
    'do you like girls', 'are you single', 'do you have a girlfriend',
    'are you married', 'do you have a wife', 'are you dating',
    'do you like women', 'are you straight', 'do you like boys',
    'what do you think about girls', 'do you find me attractive',
    'are you gay', 'whats your type', 'do you want to date',
  ];

  constructor(config: OpenAIConfig) {
    this.config = { model: 'gpt-3.5-turbo', maxTokens: 300, temperature: 0.7, ...config };
  }

  // ─── Language detection ─────────────────────────────────────────────────────

  private detectNonEnglishLanguage(text: string): boolean {
    const lower = text.toLowerCase().trim();
    const commonEnglish = [
      'background', 'experience', 'skills', 'services', 'pricing', 'contact',
      'about', 'work', 'project', 'website', 'development', 'chatbot',
      'ai', 'technology', 'software', 'programming', 'code', 'build',
      'create', 'design', 'help', 'hello', 'hi', 'thanks', 'thank you',
      'yes', 'no', 'ok', 'okay', 'sure', 'please', 'what', 'how', 'when',
      'where', 'why', 'who', 'which', 'can', 'will', 'would', 'could',
    ];
    if (commonEnglish.some(w => lower.includes(w))) return false;

    const tagalogWords = [
      'ano', 'saan', 'paano', 'bakit', 'sino', 'kailan', 'alin', 'gaano',
      'ang', 'ng', 'sa', 'ay', 'na', 'pa', 'din', 'rin', 'lang', 'naman',
      'talaga', 'ba', 'po', 'ho', 'opo', 'hindi', 'oo', 'salamat',
      'magandang', 'umaga', 'hapon', 'gabi', 'kumusta', 'kamusta',
    ];
    const spanishWords = [
      'hola', 'como', 'estas', 'que', 'donde', 'cuando', 'porque', 'quien',
      'buenos', 'dias', 'tardes', 'noches', 'gracias', 'por favor',
    ];

    const hasNonEnglish = [...tagalogWords, ...spanishWords].some(w => lower.includes(w));
    const hasNonLatin = /[^\u0000-\u024F]/.test(text);
    const hasTagalogChars = /[ñÑ]/.test(text);

    return hasNonEnglish || hasNonLatin || hasTagalogChars;
  }

  private generateLanguageRedirectResponse(userMessage: string): OpenAIResponse {
    const isTagalog =
      /(ano|saan|paano|bakit|sino|kailan|alin|gaano|ang|ng|sa|ay|na|pa|din|rin|lang|naman|talaga|ba|po|ho|opo|hindi|oo|salamat|magandang|umaga|hapon|gabi|kumusta|kamusta)/i.test(
        userMessage
      );

    const tagalogVariations = [
      "Hi! Ako yung chatbot ni Luis. Services niya: **Website Development** (₱22k–₱100k depende sa package), **AI Chatbot Integration** (₱7k–₱15k add-on or free sa Enterprise), **Full-stack apps**, at **QA/Project Management**. Gusto mo ba **pricing details** o **project discussion** na agad?",
      "Hello! Chatbot ni Luis 'to. Inaalok niya: **Website packages** (Starter ₱22k, Pro ₱45k, Enterprise ₱100k), **AI Chatbots**, **Full-stack Development**, at **QA Management**. Interesado ka ba makita yung **packages**?",
      "Hey! I'm Luis's chatbot. He offers: **Websites** (₱22k–₱100k), **AI Chatbots** (₱7k–₱15k add-on or free with Enterprise), **Full-stack dev**, plus **QA & Project Management**. Want me to walk you through **packages**?",
    ];
    const englishVariations = [
      "Sure! I'm Luis' chatbot. He specializes in **website development**, **AI chatbot solutions**, and **full-stack applications**. Would you like to see the **pricing** or jump into a **project discussion**?",
      "Hi there! I'm Luis' chatbot. He offers **website development**, **AI chatbot integration**, and **full-stack development**. Want the **pricing details**?",
    ];

    const variations = isTagalog ? tagalogVariations : englishVariations;
    return {
      content: variations[Math.floor(Math.random() * variations.length)],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  // ─── Content filtering ──────────────────────────────────────────────────────

  private isInappropriateContent(text: string): { isInappropriate: boolean; type: 'profanity' | 'personal' | 'none' } {
    const lower = text.toLowerCase().trim();
    const profanity = [
      'fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'crap', 'piss',
      'tite', 'puke', 'puki', 'puta', 'gago', 'tangina', 'ulol', 'bobo',
      'tanga', 'walanghiya', 'lintik', 'hayop', 'pokpok', 'putang',
    ];
    if (profanity.some(w => new RegExp(`\\b${w}\\b`, 'i').test(lower))) {
      return { isInappropriate: true, type: 'profanity' };
    }
    const personal = [
      'girls', 'boys', 'women', 'men', 'sex', 'sexy', 'hot', 'beautiful',
      'cute', 'attractive', 'single', 'girlfriend', 'boyfriend', 'wife',
      'husband', 'marriage', 'dating', 'love', 'kiss', 'hug',
    ];
    const hasPersonal =
      personal.some(w => new RegExp(`\\b${w}\\b`, 'i').test(lower)) ||
      this.inappropriatePatterns.some(p => lower.includes(p));
    if (hasPersonal) return { isInappropriate: true, type: 'personal' };

    return { isInappropriate: false, type: 'none' };
  }

  // ─── Server-proxied AI generation ───────────────────────────────────────────

  /**
   * Calls /api/chatbot/generate — provider (Claude/OpenAI) selected by
   * the active ai_config row in the database.
   */
  async generatePortfolioResponse(
    userMessage: string,
    conversationHistory: Message[] = []
  ): Promise<OpenAIResponse> {
    // Cache check
    const cacheKey = this.generateCacheKey(userMessage, conversationHistory);
    const cached = this.responseCache.get(cacheKey);
    if (cached) {
      this.usageStats.totalRequests++;
      return cached;
    }

    // Guard rail pre-filter (Layer 2 — after ChatWindow, before content filter + TF.js/AI)
    // Server-side is authoritative; this avoids unnecessary network calls on obvious attacks.
    const guardResult = checkGuardRails(userMessage);
    if (guardResult.tier === 'BLOCK') {
      logGuardRailEvent(guardResult, { source: 'client', userInput: userMessage });
      const resp: OpenAIResponse = {
        content: getBlockResponse(guardResult.category),
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
      this.cacheResponse(cacheKey, resp);
      return resp;
    }

    // Content filter
    const { isInappropriate, type } = this.isInappropriateContent(userMessage);
    if (isInappropriate) {
      const content =
        type === 'profanity'
          ? "Sorry, let's keep things professional. Want to know about my **development services** or **AI solutions**?"
          : "I'm married and prefer professional topics. Happy to discuss my **services**, **projects**, or **tech skills**!";
      const resp: OpenAIResponse = { content, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } };
      this.cacheResponse(cacheKey, resp);
      return resp;
    }

    // Language redirect (client-side, no API call needed)
    if (this.detectNonEnglishLanguage(userMessage)) {
      return this.generateLanguageRedirectResponse(userMessage);
    }

    // Rate limiting
    await this.enforceRateLimit();

    const startTime = Date.now();

    // Build history for the server route (last 8 messages, role-mapped)
    const history = conversationHistory
      .slice(-8)
      .map(m => ({ role: (m.isUser ? 'user' : 'assistant') as 'user' | 'assistant', content: m.content }));

    try {
      const res = await fetch('/api/chatbot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error ?? `Server error ${res.status}`);
      }

      const data = await res.json() as { content: string; provider?: string; model?: string };
      const response: OpenAIResponse = {
        content: this.optimizeResponse(data.content),
        provider: data.provider,
        model: data.model,
      };

      this.cacheResponse(cacheKey, response);
      this.updateUsageStats(Date.now() - startTime);
      return response;
    } catch (error) {
      console.error('[openaiService] generate error:', error);
      throw new Error('Failed to generate AI response. Please try again.');
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  isConfigured(): boolean {
    // Always "configured" now — the server route handles key resolution
    return true;
  }

  clearConversationContext(): void { /* no-op */ }
  updateApiKey(apiKey: string): void { this.config.apiKey = apiKey; }
  clearCache(): void { this.responseCache.clear(); }
  updateRateLimit(delay: number): void { this.rateLimitDelay = Math.max(100, delay); }

  private generateCacheKey(userMessage: string, conversationHistory: Message[]): string {
    const recent = conversationHistory.slice(-3).map(m => m.content).join('|');
    return `${userMessage.toLowerCase().trim()}|${recent}`;
  }

  private cacheResponse(key: string, response: OpenAIResponse): void {
    if (this.responseCache.size >= this.maxCacheSize) {
      const first = this.responseCache.keys().next().value;
      if (first) this.responseCache.delete(first);
    }
    this.responseCache.set(key, response);
  }

  private async enforceRateLimit(): Promise<void> {
    const wait = this.rateLimitDelay - (Date.now() - this.lastRequestTime);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this.lastRequestTime = Date.now();
  }

  private updateUsageStats(responseTimeMs: number): void {
    this.usageStats.totalRequests++;
    this.usageStats.averageResponseTime =
      (this.usageStats.averageResponseTime * (this.usageStats.totalRequests - 1) + responseTimeMs) /
      this.usageStats.totalRequests;
  }

  private optimizeResponse(content: string): string {
    if (!this.responseCompression) return content;
    let text = content;
    if (text.length > this.maxResponseLength) {
      const cut = text.lastIndexOf('.', this.maxResponseLength);
      text = cut > this.maxResponseLength * 0.7 ? text.slice(0, cut + 1) : text.slice(0, this.maxResponseLength) + '…';
    }
    return text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ {2,}/g, ' ')
      .replace(/!{2,}/g, '!')
      .trim();
  }

  updateResponseOptimization(settings: { maxResponseLength?: number; responseCompression?: boolean }): void {
    if (settings.maxResponseLength) this.maxResponseLength = Math.max(100, settings.maxResponseLength);
    if (settings.responseCompression !== undefined) this.responseCompression = settings.responseCompression;
  }

  getPerformanceStats() {
    return {
      cacheStats: { size: this.responseCache.size, maxSize: this.maxCacheSize },
      usageStats: { ...this.usageStats },
      rateLimitDelay: this.rateLimitDelay,
    };
  }

  // Kept for compat — no longer used but referenced in PerformanceMonitor
  getResponseOptimizationSettings() {
    return { maxResponseLength: this.maxResponseLength, maxTokens: 300, responseCompression: this.responseCompression };
  }

  // Suppress unused-var warnings on properties only kept for compat
  private get _unusedWords() { return this.inappropriateWords; }
}
