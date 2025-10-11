import * as tf from '@tensorflow/tfjs';
import { SecurityService } from './securityService';

export interface IntentData {
  tag: string;
  patterns: string[];
  responses: string[];
}

export interface TrainingData {
  intents: IntentData[];
}

export interface ClassificationResult {
  tag: string;
  confidence: number;
  response: string;
  relevance: number; // How relevant this is to Luis' content (0-1)
  source: 'faq' | 'learned' | 'fallback';
}

export class TensorFlowService {
  private model: tf.LayersModel | null = null;
  private vocabulary: string[] = [];
  private intents: IntentData[] = [];
  private confidenceThreshold = 0.75; // Increased for better accuracy
  private relevanceThreshold = 0.5; // Increased to filter irrelevant questions
  private isInitializing = false; // Prevent multiple initializations
  
  // Performance optimization properties
  private responseCache = new Map<string, ClassificationResult>();
  private maxCacheSize = 100;
  private trainingMetrics = {
    startTime: 0,
    endTime: 0,
    epochs: 0,
    finalLoss: 0,
    finalAccuracy: 0
  };
  private luisKeywords: string[] = [
    // Personal keywords
    'luis', 'antonio', 'santos', 'developer', 'software', 'programmer',
    // Professional keywords
    'ibm', 'odm', 'brms', 'bell', 'canada', 'qa', 'quality', 'assurance',
    'team', 'manager', 'lead', 'leadership', 'specialist',
    // Technical keywords
    'typescript', 'javascript', 'react', 'tailwind', 'node', 'express',
    'postgresql', 'python', 'java', 'c++', 'php', 'mysql',
    'docker', 'aws', 'vercel', 'git', 'github', 'netlify',
    // Project keywords
    'chatbot', 'ai', 'tensorflow', 'openai', 'portfolio', 'website',
    'pilates', 'bee', 'resumeai', 'lm', 'studio',
    // Hobby keywords
    'cycling', 'road', 'gravel', 'formula', 'f1', 'racing', 'sim',
    'rc', 'cars', 'tamiya', 'coffee', 'brewing', 'youtube', 'sunraku'
  ];

  // Inappropriate content filter
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

  // Personal/inappropriate question patterns
  private inappropriatePatterns: string[] = [
    'do you like girls', 'are you single', 'do you have a girlfriend',
    'are you married', 'do you have a wife', 'are you dating',
    'do you like women', 'are you straight', 'do you like boys',
    'what do you think about girls', 'do you find me attractive',
    'are you gay', 'whats your type', 'do you want to date'
  ];

  constructor(confidenceThreshold: number = 0.75) {
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Load data from both static intents and user examples
   */
  private async loadAllData(): Promise<TrainingData> {
    try {
      // Load static intents from faq.json (the comprehensive dataset)
      const staticIntents = await import('./data/faq.json');
      
      // Load user examples
      const userExamples = await import('./data/user_examples.json');
      
      // Combine both datasets
      const allIntents = [
        ...staticIntents.intents,
        ...userExamples.intents
      ];

      console.log(`📚 Loaded ${staticIntents.intents.length} FAQ intents + ${userExamples.intents.length} learned examples`);
      return { intents: allIntents };
    } catch (error) {
      console.error('Error loading training data:', error);
      // Fallback to intents.json if faq.json fails
      try {
        const staticIntents = await import('./data/intents.json');
        return staticIntents;
      } catch (fallbackError) {
        console.error('Fallback loading also failed:', fallbackError);
        throw new Error('Unable to load training data');
      }
    }
  }

  /**
   * Create bag-of-words representation
   */
  private createBagOfWords(text: string): number[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    const bag = new Array(this.vocabulary.length).fill(0);
    words.forEach(word => {
      const index = this.vocabulary.indexOf(word);
      if (index !== -1) {
        bag[index] = 1;
      }
    });
    
    return bag;
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
   * Check if the input is a greeting
   */
  private isGreeting(text: string): boolean {
    const lowerText = text.toLowerCase().trim();
    
    // Simple greeting patterns
    const greetingPatterns = [
      'hello', 'hi', 'hey', 'yo', 'hiya', 'howdy',
      'good morning', 'good afternoon', 'good evening', 'good day',
      'morning', 'afternoon', 'evening',
      'what\'s up', 'whats up', 'sup', 'what\'s happening',
      'how are you', 'how\'s it going', 'how do you do',
      'nice to meet you', 'pleasure to meet you',
      'good to see you', 'great to see you', 'welcome',
      'hello there', 'hi there', 'hey there'
    ];
    
    return greetingPatterns.some(pattern => lowerText.includes(pattern)) || 
           greetingPatterns.includes(lowerText);
  }

  /**
   * Check if the question is generic and should be handled by AI
   */
  private isGenericQuestion(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Don't treat greetings as generic questions
    if (this.isGreeting(text)) {
      return false;
    }
    
    // Generic question patterns that should use AI
    const genericPatterns = [
      'what kind of',
      'what types of',
      'what sort of',
      'what can you',
      'what do you',
      'how do you',
      'can you help',
      'what are your',
      'tell me about',
      'explain',
      'describe',
      'what is',
      'how does',
      'what would',
      'what should',
      'what could',
      'what might',
      'what are',
      'how are',
      'why do',
      'when do',
      'where do',
      'which do'
    ];
    
    return genericPatterns.some(pattern => lowerText.includes(pattern));
  }

  /**
   * Calculate relevance score to Luis' content (0-1)
   */
  private calculateRelevance(text: string): number {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    if (words.length === 0) return 0;
    
    // Special handling for greetings - give them high relevance
    const greetingWords = ['hello', 'hi', 'hey', 'good', 'morning', 'afternoon', 'evening', 'yo', 'whats', 'up', 'there', 'greetings', 'hiya', 'howdy', 'sup', 'happening', 'how', 'are', 'you', 'going', 'do', 'nice', 'meet', 'pleasure', 'see', 'welcome'];
    const isGreeting = words.some(word => 
      greetingWords.some(greeting => word.includes(greeting))
    );
    
    if (isGreeting) {
      // Greetings should have high relevance to ensure they're processed
      return 0.8; // High relevance for greetings
    }
    
    const relevantWords = words.filter(word => 
      this.luisKeywords.some(keyword => 
        word.includes(keyword) || keyword.includes(word)
      )
    );
    
    // Base relevance from keyword matches
    let relevance = relevantWords.length / words.length;
    
    // Boost for direct personal references
    const personalRefs = ['luis', 'antonio', 'santos', 'you', 'your'];
    const hasPersonalRef = words.some(word => 
      personalRefs.some(ref => word.includes(ref))
    );
    if (hasPersonalRef) relevance += 0.3; // Increased boost
    
    // Boost for professional/technical terms
    const professionalTerms = ['developer', 'software', 'programming', 'code', 'project', 'website', 'chatbot', 'ai', 'development', 'service', 'work', 'job', 'career', 'skill', 'build', 'create', 'develop', 'design', 'app', 'application'];
    const hasProfessionalRef = words.some(word => 
      professionalTerms.some(term => word.includes(term))
    );
    if (hasProfessionalRef) relevance += 0.2; // Increased boost
    
    // Penalty for irrelevant hobby topics (should not be primary focus)
    const hobbyTerms = ['cycling', 'coffee', 'racing', 'rc', 'youtube', 'sunraku', 'hobby', 'hobbies', 'entertainment', 'fun', 'game', 'gaming'];
    const hasHobbyRef = words.some(word => 
      hobbyTerms.some(hobby => word.includes(hobby))
    );
    if (hasHobbyRef) relevance -= 0.3; // Penalty for hobby topics
    
    return Math.max(0, Math.min(relevance, 1.0));
  }

  /**
   * Create vocabulary from all patterns
   */
  private createVocabulary(data: TrainingData): void {
    const allWords = new Set<string>();
    
    data.intents.forEach(intent => {
      intent.patterns.forEach(pattern => {
        const words = pattern.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 0);
        words.forEach(word => allWords.add(word));
      });
    });

    this.vocabulary = Array.from(allWords);
  }

  /**
   * Prepare training data with bag-of-words
   */
  private prepareTrainingData(data: TrainingData): { inputs: number[][], labels: number[] } {
    const inputs: number[][] = [];
    const labels: number[] = [];

    data.intents.forEach((intent, intentIndex) => {
      intent.patterns.forEach(pattern => {
        const bag = this.createBagOfWords(pattern);
        inputs.push(bag);
        labels.push(intentIndex);
      });
    });

    return { inputs, labels };
  }

  /**
   * Create and compile the model with enhanced architecture
   */
  private createModel(vocabSize: number, numIntents: number): tf.LayersModel {
    try {
      console.log(`🏗️ Creating model with vocab size: ${vocabSize}, intents: ${numIntents}`);
      
      // Clear any existing variables to prevent conflicts
      tf.disposeVariables();
      
      const model = tf.sequential({
      layers: [
        // Enhanced input layer with more capacity
        tf.layers.dense({
          inputShape: [vocabSize],
          units: 256,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
        }),
        tf.layers.dropout({
          rate: 0.2,
        }),
        
        // Hidden layer with batch normalization
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({
          rate: 0.3,
        }),
        
        // Additional hidden layer for better feature extraction
        tf.layers.dense({
          units: 64,
          activation: 'relu',
        }),
        tf.layers.dropout({
          rate: 0.2,
        }),
        
        // Output layer
        tf.layers.dense({
          units: numIntents,
          activation: 'softmax',
        }),
      ],
    });

    // Enhanced optimizer with learning rate scheduling
    const optimizer = tf.train.adam(0.001);
    
      model.compile({
        optimizer: optimizer,
        loss: 'sparseCategoricalCrossentropy',
        metrics: ['accuracy'],
      });

      console.log('✅ Model created and compiled successfully');
      return model;
      
    } catch (error) {
      console.error('❌ Error creating model:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create model: ${errorMessage}`);
    }
  }

  /**
   * Train the model with optimized parameters
   */
  async trainModel(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.isInitializing) {
      console.log('⏳ Model training already in progress, skipping...');
      return;
    }
    
    this.isInitializing = true;
    console.log('🚀 Starting optimized TensorFlow model training...');
    
    try {
      // Clean up any existing model first
      if (this.model) {
        console.log('🧹 Cleaning up existing model before training...');
        this.model.dispose();
        this.model = null;
        tf.disposeVariables();
      }
      
      this.trainingMetrics.startTime = Date.now();
    
    const data = await this.loadAllData();
    this.intents = data.intents;
    this.createVocabulary(data);
    
    const { inputs, labels } = this.prepareTrainingData(data);
    
    // Convert to tensors
    const inputTensor = tf.tensor2d(inputs);
    const labelTensor = tf.tensor1d(labels, 'int32').toFloat();
    
    // Create and compile model
    this.model = this.createModel(this.vocabulary.length, data.intents.length);
    
    // Verify model was created successfully
    if (!this.model) {
      throw new Error('Failed to create model');
    }
    
    console.log('🏗️ Model created successfully');
    console.log(`📊 Vocabulary size: ${this.vocabulary.length}, Intents: ${data.intents.length}`);
    
    // Optimized training parameters for better performance
    let bestLoss = Infinity;
    let patience = 0;
    const maxPatience = 10; // Early stopping patience
    
    await this.model.fit(inputTensor, labelTensor, {
      epochs: 50, // Reduced from 150 for faster training
      batchSize: 32, // Increased from 16 for better GPU utilization
      validationSplit: 0.2,
      verbose: 0,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          this.trainingMetrics.epochs = epoch + 1;
          this.trainingMetrics.finalLoss = logs?.loss || 0;
          this.trainingMetrics.finalAccuracy = logs?.acc || 0;
          
          // Early stopping logic
          if (logs?.loss && logs.loss < bestLoss) {
            bestLoss = logs.loss;
            patience = 0;
          } else {
            patience++;
          }
          
          // Log training progress (reduced frequency)
          if (epoch % 10 === 0 || epoch === 0) {
            console.log(`📊 Epoch ${epoch + 1}: loss=${logs?.loss?.toFixed(4)}, accuracy=${logs?.acc?.toFixed(4)}`);
          }
          
          // Early stopping
          if (patience >= maxPatience) {
            console.log(`⏹️ Early stopping at epoch ${epoch + 1} (patience: ${patience})`);
            // Note: Early stopping is handled by the training loop, not by returning false
          }
        }
      }
    });
    
    // Verify model is still valid after training
    if (!this.model) {
      console.error('❌ Model became null during training');
      throw new Error('Model became null during training');
    }
    
    console.log('✅ Training completed successfully');
    
    // Save model (with error handling)
    try {
      await this.saveModel();
      console.log('💾 Model saved successfully');
    } catch (saveError) {
      console.error('❌ Error saving model:', saveError);
      const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
      throw new Error(`Failed to save model: ${errorMessage}`);
    }
    
    // Clean up tensors
    inputTensor.dispose();
    labelTensor.dispose();
    
    this.trainingMetrics.endTime = Date.now();
    const trainingTime = (this.trainingMetrics.endTime - this.trainingMetrics.startTime) / 1000;
    
      console.log(`✅ Training completed in ${trainingTime.toFixed(2)}s`);
      console.log(`📈 Final metrics: loss=${this.trainingMetrics.finalLoss.toFixed(4)}, accuracy=${this.trainingMetrics.finalAccuracy.toFixed(4)}`);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Classify input text with enhanced relevance scoring and caching
   */
  async classifyInput(text: string): Promise<ClassificationResult | null> {
    if (!this.model) {
      throw new Error('Model not trained yet');
    }

    // Check cache first for performance
    const cacheKey = text.toLowerCase().trim();
    const cachedResult = this.responseCache.get(cacheKey);
    if (cachedResult) {
      console.log('⚡ Using cached response for:', text);
      return cachedResult;
    }

    // Check for inappropriate content first
    const contentCheck = this.isInappropriateContent(text);
    if (contentCheck.isInappropriate) {
      console.log(`🚫 Inappropriate content detected (${contentCheck.type}): "${text}"`);
      return null;
    }

    // Calculate relevance to Luis' content first
    const relevance = this.calculateRelevance(text);
    
    // If relevance is too low, don't even try to classify
    if (relevance < this.relevanceThreshold) {
      console.log(`❌ Low relevance (${relevance.toFixed(2)}) to Luis content: "${text}"`);
      return null;
    }

    console.log(`🔍 Analyzing: "${text}" (relevance: ${relevance.toFixed(2)})`);
    console.log(`📊 Available intents: ${this.intents.length}`);

    // Use tf.tidy for automatic memory management
    const result = tf.tidy(() => {
      const bag = this.createBagOfWords(text);
      const inputTensor = tf.tensor2d([bag]);
      const prediction = this.model!.predict(inputTensor) as tf.Tensor;
      return prediction;
    });

    const predictionArray = await result.data();
    result.dispose();

    // Convert typed array to regular array for easier manipulation
    const scores = Array.from(predictionArray);
    const maxIndex = scores.indexOf(Math.max(...scores));
    const confidence = scores[maxIndex];
    
    console.log(`🎯 Prediction scores: ${scores.map((score, i) => `${this.intents[i]?.tag || 'unknown'}:${score.toFixed(3)}`).join(', ')}`);
    console.log(`🏆 Best match: ${this.intents[maxIndex]?.tag} (confidence: ${confidence.toFixed(3)})`);
    
    // Enhanced confidence threshold based on relevance
    let adjustedThreshold = this.confidenceThreshold * (0.8 + 0.2 * relevance);
    
    // Lower threshold for greetings to make them easier to catch
    if (this.isGreeting(text)) {
      adjustedThreshold = Math.min(adjustedThreshold, 0.3); // Much lower threshold for greetings
      console.log(`👋 Greeting detected, using lower threshold: ${adjustedThreshold.toFixed(2)}`);
    }
    
    if (confidence < adjustedThreshold) {
      console.log(`❌ Low confidence (${confidence.toFixed(2)}) for: "${text}" (threshold: ${adjustedThreshold.toFixed(2)})`);
      // For generic questions with decent relevance, let AI handle it
      if (relevance >= 0.3 && this.isGenericQuestion(text)) {
        console.log(`🤖 Generic question detected, letting AI handle: "${text}"`);
        return null; // Let AI handle generic questions
      }
      return null;
    }

    const intent = this.intents[maxIndex];
    const response = intent.responses[Math.floor(Math.random() * intent.responses.length)];

    console.log(`✅ TensorFlow match: "${text}" -> ${intent.tag} (confidence: ${confidence.toFixed(2)}, relevance: ${relevance.toFixed(2)})`);

    const classificationResult: ClassificationResult = {
      tag: intent.tag,
      confidence,
      response,
      relevance,
      source: intent.tag.startsWith('learned_') ? 'learned' : 'faq',
    };

    // Cache the result for future use
    this.cacheResult(cacheKey, classificationResult);

    return classificationResult;
  }

  /**
   * Cache management methods
   */
  private cacheResult(key: string, result: ClassificationResult): void {
    // Implement LRU cache eviction
    if (this.responseCache.size >= this.maxCacheSize) {
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey) {
        this.responseCache.delete(firstKey);
      }
    }
    this.responseCache.set(key, result);
  }

  /**
   * Clear response cache
   */
  public clearCache(): void {
    this.responseCache.clear();
    console.log('🧹 Response cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.responseCache.size,
      maxSize: this.maxCacheSize
    };
  }

  /**
   * Get training metrics
   */
  public getTrainingMetrics(): typeof this.trainingMetrics {
    return { ...this.trainingMetrics };
  }

  /**
   * Save model to IndexedDB
   */
  async saveModel(): Promise<void> {
    if (!this.model) {
      console.error('❌ No model to save - model is null');
      throw new Error('No model to save');
    }

    try {
      console.log('💾 Saving model to IndexedDB...');
      await this.model.save('indexeddb://chatbot-model');
      console.log('✅ Model saved to IndexedDB');
      
      // Save vocabulary and intents metadata
      const metadata = {
        vocabulary: this.vocabulary,
        intents: this.intents,
        timestamp: Date.now(),
      };
      
      localStorage.setItem('chatbot-metadata', JSON.stringify(metadata));
      console.log('✅ Metadata saved to localStorage');
      
    } catch (error) {
      console.error('❌ Error saving model:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to save model: ${errorMessage}`);
    }
  }

  /**
   * Load model from IndexedDB
   */
  async loadModel(): Promise<boolean> {
    try {
      // Load model
      this.model = await tf.loadLayersModel('indexeddb://chatbot-model');
      
      // Load metadata
      const metadataStr = localStorage.getItem('chatbot-metadata');
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr);
        this.vocabulary = metadata.vocabulary;
        this.intents = metadata.intents;
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('Failed to load saved model:', error);
      return false;
    }
  }

  /**
   * Check if model is ready
   */
  isModelReady(): boolean {
    return this.model !== null;
  }

  /**
   * Generate Luis-focused fallback response when TensorFlow doesn't match
   */
  generateLuisFallback(userInput: string): ClassificationResult | null {
    // Check for inappropriate content first
    const contentCheck = this.isInappropriateContent(userInput);
    if (contentCheck.isInappropriate) {
      let response: string;
      
      if (contentCheck.type === 'profanity') {
        response = "Sorry, I'd be happy to discuss more valuable topics and let's not waste time. How about we talk about my **website development services**, **AI chatbot solutions**, or my **technical expertise** instead?";
      } else if (contentCheck.type === 'personal') {
        response = "I'm married and prefer to keep our conversation professional. I'd be happy to discuss my **services**, **projects**, or **technical skills** instead. What can I help you with professionally?";
      } else {
        response = "Let's focus on professional topics. I'd be happy to discuss my **development services**, **AI solutions**, or **portfolio projects**. What interests you?";
      }
      
      return {
        tag: 'luis.inappropriate_filter',
        confidence: 0.9,
        response,
        relevance: 0.1,
        source: 'fallback'
      };
    }

    const relevance = this.calculateRelevance(userInput);
    
    // For low relevance topics, don't respond at all - let OpenAI handle it
    if (relevance < 0.3) {
      console.log(`❌ Low relevance (${relevance.toFixed(2)}), letting OpenAI handle: "${userInput}"`);
      return null;
    }
    
    // For generic questions with decent relevance, let AI handle it
    if (relevance >= 0.3 && this.isGenericQuestion(userInput)) {
      console.log(`🤖 Generic question detected in fallback, letting AI handle: "${userInput}"`);
      return null;
    }
    
    // For relevant topics that didn't match, provide direct Luis answers
    const lowerInput = userInput.toLowerCase();
    
    // Direct answers for common questions that should have matched
    if (lowerInput.includes('what do you do') || lowerInput.includes('what do you work') || lowerInput.includes('what\'s your job')) {
      return {
        tag: 'luis.direct_answer',
        confidence: 0.8,
        response: "I'm a Senior IBM ODM Specialist (BRMS) and QA Team Manager at Bell Digital Billboards. I'm also a Full-Stack Developer who leverages AI, machine learning, and generative technologies to elevate business processes, automate complex workflows, and create intelligent solutions that drive measurable results.",
        relevance,
        source: 'faq'
      };
    }
    
    if (lowerInput.includes('pricing') || lowerInput.includes('cost') || lowerInput.includes('price') || lowerInput.includes('rate')) {
      return {
        tag: 'luis.direct_answer',
        confidence: 0.8,
        response: "I offer three website packages: Starter at ₱22,000 ($599 overseas), Professional at ₱45,000 ($1,199 overseas), and Enterprise at ₱100,000 ($2,999 overseas). All include responsive design, SEO, hosting, and AI chatbot integration.",
        relevance,
        source: 'faq'
      };
    }
    
    if (lowerInput.includes('ecommerce') || lowerInput.includes('e-commerce') || lowerInput.includes('online store') || lowerInput.includes('shop')) {
      return {
        tag: 'luis.direct_answer',
        confidence: 0.8,
        response: "Yes, I can build e-commerce sites! I create full-featured online stores with payment integration, inventory management, and AI chatbot support. I use modern tech stacks like React, Node.js, and integrate with platforms like Stripe for payments.",
        relevance,
        source: 'faq'
      };
    }
    
    if (lowerInput.includes('services') || lowerInput.includes('what services') || lowerInput.includes('what can you help') || lowerInput.includes('solutions') || lowerInput.includes('what can you offer') || lowerInput.includes('what do you offer')) {
      return {
        tag: 'luis.direct_answer',
        confidence: 0.8,
        response: "I can do a lot of things! Let me break down what I offer:\n\n**🌐 Website Development**\nI build modern, responsive websites that actually work. From simple business sites to complex e-commerce platforms - I've got you covered.\n\n**🤖 AI Chatbot Solutions**\nLike this one you're talking to! I create intelligent chatbots that can handle customer support, lead generation, and automate your business processes.\n\n**💻 Full-Stack Development**\nFrontend, backend, databases - I handle the complete development cycle using cutting-edge technologies like React, Node.js, and PostgreSQL.\n\n**🏢 Enterprise Solutions**\nAs a Senior IBM ODM Specialist, I design Business Rule Management Systems that help large organizations automate complex decision-making processes.\n\n**👥 Team Leadership & QA**\nI lead development teams and ensure quality through comprehensive testing and process optimization.\n\n**💰 Pricing**\n• **Starter Websites**: ₱22,000 ($599 overseas)\n• **Professional Sites**: ₱45,000 ($1,199 overseas) \n• **Enterprise Solutions**: ₱100,000 ($2,999 overseas)\n\nWhat kind of project are you thinking about? I'd love to help make it happen!",
        relevance,
        source: 'faq'
      };
    }
    
    // Enhanced greeting detection and response
    if (this.isGreeting(userInput)) {
      const greetings = [
        "Hey there! I'm Luis, nice to meet you. How can I help you today?",
        "Hi! Great to connect. I'm Luis, a software developer and team manager. What brings you here?",
        "Hello! I'm Luis. What can I help you with today?",
        "Hey! Good to see you. I'm Luis - what's on your mind?",
        "Hi there! I'm Luis, ready to chat. What can I do for you?",
        "Hello! Great to meet you. I'm Luis, a Full-Stack Developer. How can I assist you today?",
        "Hi! I'm Luis, a Senior IBM ODM Specialist and QA Team Manager. What can I help you with?",
        "Hey! I'm Luis, a software developer specializing in AI and machine learning. What brings you here?",
        "Hello there! I'm Luis, ready to help with your development needs. What's on your mind?",
        "Hi! I'm Luis, a developer who creates intelligent solutions. How can I assist you today?"
      ];
      return {
        tag: 'luis.greeting',
        confidence: 0.95, // High confidence for greetings
        response: greetings[Math.floor(Math.random() * greetings.length)],
        relevance: 0.8, // High relevance for greetings
        source: 'faq'
      };
    }
    
    // For other relevant topics, return null to let OpenAI handle with Luis context
    console.log(`🤖 Relevant but no direct match, letting OpenAI handle with Luis context: "${userInput}"`);
    return null;
  }

  /**
   * Add new learning example with security validation
   */
  async addLearningExample(userInput: string, openAiResponse: string): Promise<{success: boolean, reason?: string}> {
    try {
      // Security validation
      const inputValidation = SecurityService.validateUserInput(userInput);
      if (!inputValidation.isValid) {
        console.warn('❌ Input validation failed:', inputValidation.reason);
        return { success: false, reason: inputValidation.reason };
      }

      const responseValidation = SecurityService.validateAIResponse(openAiResponse);
      if (!responseValidation.isValid) {
        console.warn('❌ Response validation failed:', responseValidation.reason);
        return { success: false, reason: responseValidation.reason };
      }

      // Rate limiting check
      if (!SecurityService.checkRateLimit()) {
        console.warn('❌ Rate limit exceeded');
        return { success: false, reason: 'Rate limit exceeded. Please wait before learning again.' };
      }

      // Duplicate check
      if (SecurityService.isDuplicateLearning(userInput)) {
        console.warn('❌ Duplicate learning attempt detected');
        return { success: false, reason: 'Similar example already learned recently.' };
      }

      // Load current user examples
      const userExamples = await import('./data/user_examples.json');
      
      // Create new intent with sanitized input
      const newTag = `learned_${Date.now()}`;
      const newIntent: IntentData = {
        tag: newTag,
        patterns: [inputValidation.sanitizedInput || userInput],
        responses: [openAiResponse]
      };
      
      // Create a mutable copy of user examples
      const mutableUserExamples = {
        intents: [...userExamples.intents, newIntent]
      };
      
      // Save back to file (in a real app, this would be an API call)
      // For now, we'll store in localStorage as a workaround
      const updatedExamples = {
        intents: mutableUserExamples.intents
      };
      
      localStorage.setItem('user_examples', JSON.stringify(updatedExamples));
      
      // Retrain model with new data
      await this.trainModel();
      
      console.log('✅ Added new learning example and retrained model');
      return { success: true };
    } catch (error) {
      console.error('Error adding learning example:', error);
      return { success: false, reason: 'Internal error occurred' };
    }
  }

  /**
   * Get learning examples from localStorage
   */
  private getLearningExamples(): IntentData[] {
    try {
      const stored = localStorage.getItem('user_examples');
      if (stored) {
        const data = JSON.parse(stored);
        return data.intents || [];
      }
    } catch (error) {
      console.warn('Error loading learning examples:', error);
    }
    return [];
  }

  /**
   * Get model performance statistics
   */
  getModelStats(): {
    isReady: boolean;
    vocabularySize: number;
    intentCount: number;
    learnedExamples: number;
    confidenceThreshold: number;
    relevanceThreshold: number;
  } {
    return {
      isReady: this.model !== null,
      vocabularySize: this.vocabulary.length,
      intentCount: this.intents.length,
      learnedExamples: this.getLearningExamples().length,
      confidenceThreshold: this.confidenceThreshold,
      relevanceThreshold: this.relevanceThreshold,
    };
  }

  /**
   * Update confidence threshold dynamically
   */
  updateConfidenceThreshold(newThreshold: number): void {
    this.confidenceThreshold = Math.max(0.1, Math.min(1.0, newThreshold));
    console.log(`🎯 Confidence threshold updated to: ${this.confidenceThreshold}`);
  }

  /**
   * Update relevance threshold dynamically
   */
  updateRelevanceThreshold(newThreshold: number): void {
    this.relevanceThreshold = Math.max(0.1, Math.min(1.0, newThreshold));
    console.log(`🎯 Relevance threshold updated to: ${this.relevanceThreshold}`);
  }

  /**
   * Cleanup method for memory management
   */
  public cleanup(): void {
    console.log('🧹 Cleaning up TensorFlow resources...');
    
    // Dispose model
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    
    // Clear all TensorFlow variables
    tf.disposeVariables();
    
    // Clear cache
    this.clearCache();
    
    // Clear vocabulary and intents
    this.vocabulary = [];
    this.intents = [];
    
    // Reset training metrics
    this.trainingMetrics = {
      startTime: 0,
      endTime: 0,
      epochs: 0,
      finalLoss: 0,
      finalAccuracy: 0
    };
    
    // Reset initialization flag
    this.isInitializing = false;
    
    console.log('✅ TensorFlow cleanup completed');
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    cacheStats: { size: number; maxSize: number };
    trainingMetrics: {
      startTime: number;
      endTime: number;
      epochs: number;
      finalLoss: number;
      finalAccuracy: number;
    };
    modelReady: boolean;
  } {
    return {
      cacheStats: this.getCacheStats(),
      trainingMetrics: this.getTrainingMetrics(),
      modelReady: this.isModelReady()
    };
  }
}
