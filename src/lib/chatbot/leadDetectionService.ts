export interface LeadTrigger {
  shouldShowForm: boolean;
  triggerContext: string;
  confidence: number;
  category: 'pricing' | 'services' | 'availability' | 'interest' | 'none';
}

export class LeadDetectionService {
  // Keywords that indicate lead generation opportunities
  private leadKeywords = {
    pricing: [
      'price', 'cost', 'rate', 'fee', 'budget', 'expensive', 'cheap', 'afford',
      'how much', 'what does it cost', 'pricing', 'quote', 'estimate'
    ],
    services: [
      'build', 'create', 'develop', 'make', 'design', 'website', 'app', 'software',
      'need a', 'looking for', 'want to', 'require', 'project', 'help me',
      'services', 'what services', 'offer', 'what do you offer', 'what can you do',
      'service', 'work', 'consulting', 'development', 'chatbot', 'ai solution',
      'ecommerce', 'e-commerce', 'online store', 'web development', 'full stack',
      'frontend', 'backend', 'react', 'node', 'javascript', 'typescript',
      'brms', 'business rules', 'qa', 'quality assurance', 'team management',
      'ibm odm', 'odm specialist', 'automation', 'workflow', 'integration',
      'shopify', 'shop', 'store', 'coffee shop', 'restaurant', 'business',
      'retail', 'selling', 'products', 'inventory', 'payment', 'checkout',
      'shopping cart', 'customer', 'orders', 'sales', 'revenue', 'profit',
      'business website', 'company website', 'corporate website'
    ],
    availability: [
      'available', 'busy', 'schedule', 'timeline', 'when can', 'how long',
      'start', 'begin', 'free', 'time', 'urgent', 'asap'
    ],
    interest: [
      'interested', 'considering', 'thinking about', 'planning', 'might need',
      'could use', 'looking into', 'exploring', 'evaluating'
    ]
  };

  private buyingIntentPhrases = [
    'i need', 'i want', 'i\'m looking for', 'can you help me',
    'i\'m interested in', 'tell me more about', 'how do you',
    'what would it take', 'i\'m ready to', 'let\'s discuss',
    'what services', 'what do you offer', 'what can you do',
    'do you offer', 'can you build', 'can you create', 'can you develop',
    'i need a website', 'i need an app', 'i need a chatbot',
    'build me a', 'create a', 'develop a', 'make a',
    'looking to hire', 'looking to work with', 'want to hire',
    'need help with', 'need assistance with', 'need support with',
    'i want a website for', 'i need a website for', 'build a website for',
    'create a website for', 'develop a website for', 'make a website for',
    'do you also use', 'do you work with', 'can you help with',
    'shopify', 'ecommerce', 'e-commerce', 'online store', 'coffee shop',
    'restaurant', 'business', 'retail', 'shop', 'store'
  ];

  private negativeIndicators = [
    'just asking', 'just curious', 'not interested', 'maybe later',
    'don\'t need', 'not looking for', 'just browsing', 'just wondering',
    'no thanks', 'not now', 'maybe someday'
  ];

  detectLeadOpportunity(userInput: string, conversationHistory: string[] = []): LeadTrigger {
    const lowerInput = userInput.toLowerCase().trim();
    
    const hasNegativeIndicator = this.negativeIndicators.some(phrase => 
      lowerInput.includes(phrase)
    );
    
    if (hasNegativeIndicator) {
      return {
        shouldShowForm: false,
        triggerContext: '',
        confidence: 0,
        category: 'none'
      };
    }

    const ecommerceLead = this.detectEcommerceLead(userInput);
    if (ecommerceLead.shouldShowForm) {
      return ecommerceLead;
    }

    let maxConfidence = 0;
    let bestCategory: LeadTrigger['category'] = 'none';
    let triggerContext = '';

    for (const [category, keywords] of Object.entries(this.leadKeywords)) {
      const confidence = this.calculateCategoryConfidence(lowerInput, keywords);
      
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        bestCategory = category as LeadTrigger['category'];
      }
    }

    const buyingIntentConfidence = this.calculateBuyingIntentConfidence(lowerInput);
    if (buyingIntentConfidence > maxConfidence) {
      maxConfidence = buyingIntentConfidence;
      bestCategory = 'interest';
    }

    triggerContext = this.generateTriggerContext(lowerInput, bestCategory);
    const shouldShowForm = maxConfidence >= 0.6 && bestCategory !== 'none';

    return {
      shouldShowForm,
      triggerContext,
      confidence: maxConfidence,
      category: bestCategory
    };
  }

  private detectEcommerceLead(userInput: string): LeadTrigger {
    const lowerInput = userInput.toLowerCase().trim();
    
    const ecommerceIndicators = [
      'coffee shop', 'restaurant', 'retail', 'business', 'company',
      'shopify', 'ecommerce', 'e-commerce', 'online store', 'shop',
      'store', 'selling', 'products', 'inventory', 'payment',
      'checkout', 'shopping cart', 'customer', 'orders', 'sales'
    ];
    
    const businessWebsiteIndicators = [
      'website for my', 'website for a', 'business website',
      'company website', 'corporate website', 'professional website'
    ];
    
    const hasEcommerceIndicator = ecommerceIndicators.some(indicator => 
      lowerInput.includes(indicator)
    );
    
    const hasBusinessWebsiteIndicator = businessWebsiteIndicators.some(indicator => 
      lowerInput.includes(indicator)
    );
    
    if (hasEcommerceIndicator || hasBusinessWebsiteIndicator) {
      return {
        shouldShowForm: true,
        triggerContext: this.generateEcommerceTriggerContext(lowerInput),
        confidence: 0.9,
        category: 'services'
      };
    }
    
    return {
      shouldShowForm: false,
      triggerContext: '',
      confidence: 0,
      category: 'none'
    };
  }

  private generateEcommerceTriggerContext(input: string): string {
    const contexts = [
      "Perfect! I specialize in building e-commerce websites and online stores!",
      "Excellent! I can help you create a professional website for your business!",
      "Great! I have extensive experience with Shopify and e-commerce platforms!",
      "I'd love to help you build your online presence!",
      "That's exactly what I do! I can create a beautiful website for your business!",
      "Perfect! I can help you set up your online store with payment integration!",
      "I'm excited to help you with your business website project!",
      "I can definitely help you create a professional website for your coffee shop!",
      "I'd be happy to discuss your e-commerce project needs!",
      "Let me help you build your online business!"
    ];
    
    return contexts[Math.floor(Math.random() * contexts.length)];
  }

  private calculateCategoryConfidence(input: string, keywords: string[]): number {
    let matches = 0;
    const totalWords = input.split(' ').length;

    keywords.forEach(keyword => {
      if (input.includes(keyword)) {
        matches++;
      }
    });

    const multipleMatchBonus = matches > 1 ? 0.2 : 0;
    const baseConfidence = Math.min(matches / Math.max(totalWords * 0.3, 1), 1);

    return Math.min(baseConfidence + multipleMatchBonus, 1);
  }

  private calculateBuyingIntentConfidence(input: string): number {
    let confidence = 0;

    this.buyingIntentPhrases.forEach(phrase => {
      if (input.includes(phrase)) {
        confidence += 0.3;
      }
    });

    const actionWords = ['build', 'create', 'develop', 'make', 'start', 'begin'];
    actionWords.forEach(word => {
      if (input.includes(word)) {
        confidence += 0.2;
      }
    });

    return Math.min(confidence, 1);
  }

  private generateTriggerContext(input: string, category: LeadTrigger['category']): string {
    const contexts = {
      pricing: [
        "Great question about pricing!",
        "I'd be happy to discuss pricing with you!",
        "Let me help you understand the pricing options!",
        "I can provide you with detailed pricing information!"
      ],
      services: [
        "That sounds like an interesting project!",
        "I'd love to help you with that!",
        "That's definitely something I can help you build!",
        "I'm excited about your project idea!",
        "Great! I offer a range of services that could help you!",
        "I'd be happy to discuss my services with you!",
        "That's exactly the kind of project I specialize in!",
        "I can definitely help you with that type of work!"
      ],
      availability: [
        "I'd love to discuss your timeline!",
        "Let me help you plan your project!",
        "I'm excited about the possibility of working together!",
        "I can definitely help you with that!"
      ],
      interest: [
        "It sounds like you're interested in working together!",
        "I'd love to discuss your project needs!",
        "Let me help you with that!",
        "I'm excited about your project idea!"
      ],
      none: ""
    };

    const categoryContexts = contexts[category];
    if (categoryContexts && categoryContexts.length > 0) {
      return categoryContexts[Math.floor(Math.random() * categoryContexts.length)];
    }

    return "I'd love to discuss your project needs!";
  }
}

