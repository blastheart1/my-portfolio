import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Brain, Save, XCircle } from 'lucide-react';
import { MessageBubble, Message } from './MessageBubble';
import { TensorFlowService } from '@/lib/chatbot/tensorflowModel';
import { OpenAIService } from '@/lib/chatbot/openaiService';
import { LeadForm, LeadData } from './LeadForm';
import { ResendService } from '@/lib/chatbot/resendService';
import { LeadDetectionService } from '@/lib/chatbot/leadDetectionService';
import { QuickSuggestions } from './QuickSuggestions';

interface PortfolioChatbotProps {
  openaiApiKey?: string;
  confidenceThreshold?: number;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
  size?: 'small' | 'medium' | 'large';
  showButton?: boolean;
  autoOpen?: boolean;
  customStyles?: {
    buttonColor?: string;
    buttonSize?: string;
    chatWidth?: string;
    chatHeight?: string;
    borderRadius?: string;
    fontFamily?: string;
  };
  onStatusChange?: (status: {
    isModelReady: boolean;
    isLoading: boolean;
    error: string | null;
    learningCount: number;
    isConfigured: boolean;
  }) => void;
}

export const PortfolioChatbot: React.FC<PortfolioChatbotProps> = ({
  openaiApiKey = '',
  confidenceThreshold = 0.75,
  position = 'bottom-right',
  theme = 'auto',
  size = 'medium',
  showButton = true,
  autoOpen = false,
  customStyles = {},
  onStatusChange
}) => {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [learningCount, setLearningCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showLearningPrompt, setShowLearningPrompt] = useState(false);
  const [pendingLearning, setPendingLearning] = useState<{userInput: string, openAiResponse: string} | null>(null);
  const [isLearning, setIsLearning] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadTriggerContext, setLeadTriggerContext] = useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Initialize services
  const tensorflowService = useMemo(() => new TensorFlowService(confidenceThreshold), [confidenceThreshold]);
  const apiKey = openaiApiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
  const openaiService = useMemo(() => new OpenAIService({ apiKey }), [apiKey]);
  const leadDetectionService = useMemo(() => new LeadDetectionService(), []);
  const resendService = useMemo(() => new ResendService({
    apiKey: process.env.NEXT_PUBLIC_RESEND_API_KEY || '',
    fromEmail: 'onboarding@resend.dev',
    toEmail: process.env.NEXT_PUBLIC_TO_EMAIL || 'antonioluis.santos1@gmail.com'
  }), []);


  // Initialize model
  useEffect(() => {
    const initializeModel = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const modelLoaded = await tensorflowService.loadModel();
        if (modelLoaded) {
          setIsModelReady(true);
        } else {
          await tensorflowService.trainModel();
          setIsModelReady(true);
        }

        const storedCount = localStorage.getItem('learning-count');
        if (storedCount) {
          setLearningCount(parseInt(storedCount));
        }
      } catch (err) {
        console.error('Error initializing model:', err);
        setError('Failed to initialize AI model. Using simple keyword matching instead.');
        setIsModelReady(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeModel();
  }, [tensorflowService]);

  // Notify parent of status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({
        isModelReady,
        isLoading,
        error,
        learningCount,
        isConfigured: openaiService.isConfigured()
      });
    }
  }, [isModelReady, isLoading, error, learningCount, openaiService, onStatusChange]);

  // Add welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        content: "Hi there! I'm Luis, a software developer and team manager. I can tell you about my background, skills, services, and hobbies. Feel free to ask me anything!",
        isUser: false,
        timestamp: new Date(),
        source: 'faq',
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Generate unique IDs
  const generateUniqueId = () => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Handle message sending
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: generateUniqueId(),
      content: inputValue.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      let response: Message;
      let usedOpenAI = false;
      let openAiResponse = '';

      if (tensorflowService.isModelReady()) {
        const prediction = await tensorflowService.classifyInput(userMessage.content);
        
        if (prediction) {
          response = {
            id: generateUniqueId(),
            content: prediction.response,
            isUser: false,
            timestamp: new Date(),
            source: prediction.source === 'learned' ? 'ai' : 'faq',
            confidence: prediction.confidence,
            relevance: prediction.relevance,
          };
        } else {
          const fallbackPrediction = tensorflowService.generateLuisFallback(userMessage.content);
          
          if (fallbackPrediction) {
            response = {
              id: generateUniqueId(),
              content: fallbackPrediction.response,
              isUser: false,
              timestamp: new Date(),
              source: 'faq',
              confidence: fallbackPrediction.confidence,
              relevance: fallbackPrediction.relevance,
            };
          } else if (openaiService.isConfigured()) {
            try {
              const aiResponse = await openaiService.generatePortfolioResponse(userMessage.content);
              openAiResponse = aiResponse.content;
              usedOpenAI = true;
              response = {
                id: generateUniqueId(),
                content: aiResponse.content,
                isUser: false,
                timestamp: new Date(),
                source: 'ai',
              };
            } catch (openaiError) {
              console.warn('OpenAI error, using simple fallback:', openaiError);
              response = {
                id: generateUniqueId(),
                content: "I'm not sure about that specific question. Feel free to reach out to me directly for more detailed discussions!",
                isUser: false,
                timestamp: new Date(),
                source: 'faq',
              };
            }
          } else {
            response = {
              id: generateUniqueId(),
              content: "I'm not sure about that specific question. Feel free to reach out to me directly for more detailed discussions!",
              isUser: false,
              timestamp: new Date(),
              source: 'faq',
            };
          }
        }
      } else {
        response = {
          id: generateUniqueId(),
          content: "I'm not sure about that. You can reach out to Luis directly for more specific questions!",
          isUser: false,
          timestamp: new Date(),
          source: 'faq',
        };
      }

      setTimeout(() => {
        setMessages(prev => [...prev, response]);
        setIsTyping(false);

        if (inputRef.current) {
          inputRef.current.focus();
        }

        // Check for lead generation
        const conversationHistory = [...messages, userMessage].map(m => m.content);
        const leadTrigger = leadDetectionService.detectLeadOpportunity(userMessage.content, conversationHistory);
        
        if (leadTrigger.shouldShowForm) {
          setTimeout(() => {
            const followUpMessage: Message = {
              id: generateUniqueId(),
              content: `${leadTrigger.triggerContext} Would you like me to reach out to discuss your project needs in more detail?`,
              isUser: false,
              timestamp: new Date(),
              source: 'faq',
              confidence: 0.9,
              relevance: 0.8,
            };
            setMessages(prev => [...prev, followUpMessage]);
            setLeadTriggerContext(leadTrigger.triggerContext);
          }, 1500);
        }

        if (usedOpenAI && openAiResponse) {
          setPendingLearning({
            userInput: userMessage.content,
            openAiResponse: openAiResponse
          });
          setShowLearningPrompt(true);
        }
      }, 1000);

    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: generateUniqueId(),
        content: "Sorry, I encountered an error. Please try again or contact Luis directly.",
        isUser: false,
        timestamp: new Date(),
        source: 'faq',
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLeadSubmission = async (leadData: LeadData) => {
    try {
      await resendService.sendLeadNotification(leadData);
      await resendService.sendWelcomeEmail(leadData);
      console.log('✅ Lead submitted successfully:', leadData);
    } catch (error) {
      console.error('❌ Failed to submit lead:', error);
      throw error;
    }
  };

  const handleSuggestionClick = (suggestion: string, triggerLead?: boolean) => {
    setInputValue(suggestion);
    if (triggerLead) {
      setLeadTriggerContext(`You asked about: "${suggestion}"`);
    }
  };

  const handleLearningDecision = async (shouldLearn: boolean) => {
    if (shouldLearn && pendingLearning) {
      setIsLearning(true);
      
      try {
        const result = await tensorflowService.addLearningExample(pendingLearning.userInput, pendingLearning.openAiResponse);
        
        if (result.success) {
          const newCount = learningCount + 1;
          setLearningCount(newCount);
          localStorage.setItem('learning-count', newCount.toString());
        }
      } finally {
        setIsLearning(false);
      }
    }
    setShowLearningPrompt(false);
    setPendingLearning(null);
  };

  // Position classes
  const positionClasses = {
    'bottom-right': 'fixed bottom-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4',
    'top-right': 'fixed top-4 right-4',
    'top-left': 'fixed top-4 left-4'
  }[position];

  // Size classes
  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-20 h-20'
  }[size];

  // Custom styles
  const buttonStyle = {
    backgroundColor: customStyles.buttonColor || '#3b82f6',
    borderRadius: customStyles.borderRadius || '50%',
    fontFamily: customStyles.fontFamily || 'inherit',
    ...(customStyles.buttonSize && { width: customStyles.buttonSize, height: customStyles.buttonSize })
  };

  const chatStyle = {
    width: customStyles.chatWidth || '400px',
    height: customStyles.chatHeight || '600px',
    borderRadius: customStyles.borderRadius || '12px',
    fontFamily: customStyles.fontFamily || 'inherit'
  };

  return (
    <div className="portfolio-chatbot" style={{ zIndex: 9999 }}>
      {/* Floating Button */}
      {showButton && (
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={`${positionClasses} ${sizeClasses} cursor-pointer z-40 flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-200`}
          style={buttonStyle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          role="button"
          tabIndex={0}
          aria-label="Open AI Chatbot"
        >
          <span className="text-2xl">💬</span>
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              style={chatStyle}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-lg">🤖</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Luis</h3>
                    <p className="text-xs opacity-90">Software Developer & Team Manager</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '400px' }}>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}

                {messages.length === 0 || (messages.length === 1 && messages[0].isUser) ? (
                  <QuickSuggestions
                    onSuggestionClick={handleSuggestionClick}
                    isVisible={!isTyping}
                    className="mt-4"
                  />
                ) : null}
                
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start mb-4"
                  >
                    <div className="bg-gray-100 text-gray-800 border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Learning Prompt */}
              {showLearningPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-blue-50 border-t border-blue-200"
                >
                  <div className="flex items-center space-x-2 text-sm text-blue-800 mb-2">
                    <Brain className="w-4 h-4" />
                    <span className="font-medium">Should I remember this answer?</span>
                  </div>
                  
                  {isLearning ? (
                    <div className="flex items-center space-x-2 text-sm text-blue-600">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving and training AI model...</span>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleLearningDecision(true)}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded-full text-xs hover:bg-blue-600 transition-colors"
                      >
                        <Save className="w-3 h-3" />
                        <span>Yes, remember</span>
                      </button>
                      <button
                        onClick={() => handleLearningDecision(false)}
                        className="flex items-center space-x-1 px-3 py-1 bg-gray-500 text-white rounded-full text-xs hover:bg-gray-600 transition-colors"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>No, thanks</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Input */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isLearning ? "Learning in progress..." : "Ask me anything about Luis..."}
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isTyping || isLearning}
                    style={{ fontSize: '16px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isTyping || isLearning}
                    className="bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center p-3 min-w-[48px] min-h-[48px]"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lead Form */}
      <LeadForm
        isOpen={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        onSubmit={handleLeadSubmission}
        triggerContext={leadTriggerContext}
      />
    </div>
  );
};
