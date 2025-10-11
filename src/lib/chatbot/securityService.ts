export interface SecurityValidation {
  isValid: boolean;
  reason?: string;
  sanitizedInput?: string;
}

export class SecurityService {
  private static readonly MAX_INPUT_LENGTH = 500;
  private static readonly MAX_RESPONSE_LENGTH = 2000;
  private static readonly MIN_INPUT_LENGTH = 3;
  
  private static readonly MALICIOUS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
  ];

  private static readonly SPAM_PATTERNS = [
    /(.)\1{10,}/g,
    /[^\w\s.,!?]{20,}/g,
  ];

  static validateUserInput(input: string): SecurityValidation {
    if (input.length < this.MIN_INPUT_LENGTH) {
      return { isValid: false, reason: 'Input too short' };
    }
    
    if (input.length > this.MAX_INPUT_LENGTH) {
      return { isValid: false, reason: 'Input too long' };
    }

    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(input)) {
        return { isValid: false, reason: 'Potentially malicious content detected' };
      }
    }

    for (const pattern of this.SPAM_PATTERNS) {
      if (pattern.test(input)) {
        return { isValid: false, reason: 'Spam-like content detected' };
      }
    }

    const sanitized = this.sanitizeInput(input);
    
    return { 
      isValid: true, 
      sanitizedInput: sanitized 
    };
  }

  static validateAIResponse(response: string): SecurityValidation {
    if (response.length > this.MAX_RESPONSE_LENGTH) {
      return { isValid: false, reason: 'Response too long' };
    }

    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(response)) {
        return { isValid: false, reason: 'Response contains malicious content' };
      }
    }

    return { isValid: true };
  }

  private static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  static checkRateLimit(userId: string = 'default'): boolean {
    if (typeof window === 'undefined') return true;
    
    const key = `rate_limit_${userId}`;
    const now = Date.now();
    const lastRequest = localStorage.getItem(key);
    
    if (lastRequest) {
      const timeDiff = now - parseInt(lastRequest);
      if (timeDiff < 1000) {
        return false;
      }
    }
    
    localStorage.setItem(key, now.toString());
    return true;
  }

  static isDuplicateLearning(input: string): boolean {
    if (typeof window === 'undefined') return false;
    
    const key = `learning_${btoa(input).substring(0, 20)}`;
    const exists = localStorage.getItem(key);
    
    if (exists) {
      return true;
    }
    
    localStorage.setItem(key, Date.now().toString());
    return false;
  }
}

