import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { } from 'lucide-react';
import { ChatWindow } from './ChatWindow';
import { PerformanceMonitor } from './PerformanceMonitor';
import { PerformanceToggle } from './PerformanceToggle';
import { TensorFlowService } from '@/lib/chatbot/tensorflowModel';
import { OpenAIService } from '@/lib/chatbot/openaiService';

type PerformanceStats = {
  tensorflow?: {
    cacheStats: { size: number; maxSize: number };
    trainingMetrics: { startTime: number; endTime: number; epochs: number; finalLoss: number; finalAccuracy: number };
    modelReady: boolean;
  };
  openai?: {
    cacheStats: { size: number; maxSize: number };
    usageStats: { totalRequests: number; totalTokens: number; totalCost: number; averageResponseTime: number };
    rateLimitDelay: number;
  };
};

interface ChatbotProps {
  openaiApiKey?: string;
  confidenceThreshold?: number;
  onStatusChange?: (status: {
    isModelReady: boolean;
    isLoading: boolean;
    learningCount: number;
    isConfigured: boolean;
  }) => void;
  onChatToggle?: (isOpen: boolean) => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({ 
  openaiApiKey = '', 
  confidenceThreshold = 0.75,
  onStatusChange,
  onChatToggle
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [learningCount, setLearningCount] = useState(0);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);

  // Initialize services (only on client-side)
  const tensorflowService = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new TensorFlowService(confidenceThreshold);
  }, [confidenceThreshold]);
  
  const apiKey = openaiApiKey || (typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_OPENAI_API_KEY : '') || '';
  
  const openaiService = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new OpenAIService({ apiKey: apiKey });
  }, [apiKey]);

  // Debug API key (remove in production)
  useEffect(() => {
    console.log('🔍 Environment check:');
    console.log('  - openaiApiKey prop:', openaiApiKey ? 'provided' : 'not provided');
    console.log('  - NEXT_PUBLIC_OPENAI_API_KEY:', process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 'found' : 'not found');
    console.log('  - Final apiKey length:', apiKey ? '***' : '0');
    console.log('  - Final apiKey status:', apiKey ? 'configured' : 'missing');
    
    if (apiKey && apiKey.length > 20) {
      console.log('✅ OpenAI API key loaded successfully');
    } else {
      console.log('⚠️ OpenAI API key issue detected');
    }
  }, [apiKey, openaiApiKey]);

  // Notify parent component of status changes
  useEffect(() => {
    if (onStatusChange && openaiService) {
      onStatusChange({
        isModelReady,
        isLoading,
        learningCount,
        isConfigured: openaiService.isConfigured()
      });
    }
  }, [isModelReady, isLoading, learningCount, openaiService, onStatusChange]);

  // Initialize TensorFlow.js model
  useEffect(() => {
    // Don't initialize during SSR or build time
    if (typeof window === 'undefined') return;
    if (!tensorflowService) return;
    
    const initializeModel = async () => {
      try {
        setIsLoading(true);
        
        // Prevent multiple initializations in development
        if (process.env.NODE_ENV === 'development' && tensorflowService.isModelReady()) {
          console.log('🔄 Development mode: Model already ready, skipping initialization');
          setIsModelReady(true);
          setIsLoading(false);
          return;
        }

        // Try to load existing model
        const modelLoaded = await tensorflowService.loadModel();
        
        if (modelLoaded) {
          setIsModelReady(true);
          console.log('✅ Loaded existing TensorFlow.js model');
        } else {
          console.log('🤖 Training new TensorFlow.js model...');
          await tensorflowService.trainModel();
          setIsModelReady(true);
          console.log('✅ TensorFlow.js model trained successfully');
        }

        // Load learning count
        const storedCount = localStorage.getItem('learning-count');
        if (storedCount) {
          setLearningCount(parseInt(storedCount));
        }

        // Get performance stats
        if (tensorflowService && openaiService) {
          const tensorflowStats = tensorflowService.getPerformanceStats();
          const openaiStats = openaiService.getPerformanceStats();
          const combinedStats = {
            tensorflow: tensorflowStats,
            openai: openaiStats
          };
          setPerformanceStats(combinedStats);
          console.log('📊 Performance Stats:', combinedStats);
        }
        
        // Performance monitor is hidden by default, can be toggled
        setShowPerformanceMonitor(false);


      } catch (err) {
        console.error('❌ Error initializing model:', err);
        // Set model as ready even if training failed, so we can use simple matching
        setIsModelReady(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeModel();
  }, [tensorflowService, openaiService]);

  // Update performance stats periodically
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!tensorflowService || !openaiService) return;

    const updatePerformanceStats = () => {
      if (!tensorflowService || !openaiService) return;
      const tensorflowStats = tensorflowService.getPerformanceStats();
      const openaiStats = openaiService.getPerformanceStats();
      const combinedStats = {
        tensorflow: tensorflowStats,
        openai: openaiStats
      };
      setPerformanceStats(combinedStats);
      console.log('📊 Updated Performance Stats:', {
        tensorflow: tensorflowStats,
        openai: openaiStats
      });
    };

    // Update immediately
    updatePerformanceStats();

    // Update every 3 seconds
    const statsInterval = setInterval(updatePerformanceStats, 3000);
    
    return () => clearInterval(statsInterval);
  }, [tensorflowService, openaiService]);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && tensorflowService) {
        tensorflowService.cleanup();
      }
    };
  }, [tensorflowService, openaiService]);

  const toggleChat = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    // Notify parent component about chat state change
    if (onChatToggle) {
      onChatToggle(newIsOpen);
    }
  };

  const togglePerformanceMonitor = () => {
    setShowPerformanceMonitor(!showPerformanceMonitor);
  };

  const handleLearningExample = async (userInput: string, openAiResponse: string): Promise<{success: boolean, reason?: string}> => {
    try {
      if (!tensorflowService) return { success: false, reason: 'Service not initialized' };
      const result = await tensorflowService.addLearningExample(userInput, openAiResponse);
      
      if (result.success) {
        const newCount = learningCount + 1;
        setLearningCount(newCount);
        localStorage.setItem('learning-count', newCount.toString());
        console.log('🧠 Model learned from new example!');
      }
      
      return result;
    } catch (error) {
      console.error('Error adding learning example:', error);
      return { success: false, reason: 'Internal error occurred' };
    }
  };

  // Don't render during SSR
  if (typeof window === 'undefined') return null;
  if (!tensorflowService || !openaiService) return null;

  return (
    <>
      {/* Floating Chat Button */}
      <motion.img
        src="/LuisBot.png"
        alt="Luis AI Chatbot"
        onClick={toggleChat}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-16 h-16 md:w-20 md:h-20 cursor-pointer z-40 object-cover rounded-full shadow-lg border-2 border-white"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 15 
        }}
        role="button"
        tabIndex={0}
        aria-label="Open AI Chatbot"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleChat();
          }
        }}
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src.endsWith('/LuisBot.png')) {
            console.warn('PNG failed, trying ICO');
            target.src = '/LuisBot.ico';
          } else if (target.src.endsWith('/LuisBot.ico')) {
            console.warn('ICO failed, using default favicon');
            target.src = '/favicon.ico';
          } else {
            console.warn('All images failed, using emoji fallback');
            target.style.display = 'none';
            target.parentElement!.innerHTML = '🤖';
          }
        }}
        loading="eager"
        width="80"
        height="80"
      />




      {/* Performance Toggle Button */}
      <PerformanceToggle 
        onClick={togglePerformanceMonitor}
        isVisible={showPerformanceMonitor}
      />

      {/* Performance Monitor */}
      <PerformanceMonitor 
        stats={performanceStats} 
        isVisible={showPerformanceMonitor}
        onToggle={togglePerformanceMonitor}
      />


      {/* Chat Window */}
      <ChatWindow
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          // Notify parent component about chat state change
          if (onChatToggle) {
            onChatToggle(false);
          }
        }}
        tensorflowService={tensorflowService}
        openaiService={openaiService}
        onLearningExample={handleLearningExample}
      />
    </>
  );
};