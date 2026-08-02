import React, { useState, useEffect, useMemo } from 'react';
import ChatLauncher from './ChatLauncher';
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
  /**
   * Open the window on mount. Set by PortfolioChatbotWrapper, which only
   * mounts this component after the user clicks the launcher — so the click
   * that caused the mount should also open the chat.
   */
  startOpen?: boolean;
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
  startOpen = false,
  confidenceThreshold = 0.75,
  onStatusChange,
  onChatToggle
}) => {
  const [isOpen, setIsOpen] = useState(startOpen);
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
  
  // No API key on the client — completions go through /api/chatbot/generate,
  // which resolves the provider key from server-only env vars.
  const openaiService = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new OpenAIService({});
  }, []);

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
          setIsModelReady(true);
          setIsLoading(false);
          return;
        }

        // Try to load existing model
        const modelLoaded = await tensorflowService.loadModel();
        
        if (modelLoaded) {
          setIsModelReady(true);
        } else {
          await tensorflowService.trainModel();
          setIsModelReady(true);
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

  // Update performance stats periodically — only while the monitor is open.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!tensorflowService || !openaiService) return;
    if (!showPerformanceMonitor) return;

    const updatePerformanceStats = () => {
      if (!tensorflowService || !openaiService) return;
      const tensorflowStats = tensorflowService.getPerformanceStats();
      const openaiStats = openaiService.getPerformanceStats();
      const combinedStats = {
        tensorflow: tensorflowStats,
        openai: openaiStats
      };
      setPerformanceStats(combinedStats);
    };

    // Update immediately
    updatePerformanceStats();

    // Update every 3 seconds
    const statsInterval = setInterval(updatePerformanceStats, 3000);

    return () => clearInterval(statsInterval);
    // showPerformanceMonitor is in the guard above AND the deps: without it
    // this polled every 3s for the lifetime of the page while the monitor was
    // hidden (its default), doing work nobody could see and keeping the
    // TensorFlow service graph reachable so it could never be collected.
  }, [tensorflowService, openaiService, showPerformanceMonitor]);

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
      {/* Floating Chat Button — same component the wrapper renders pre-mount,
          with the entrance animation suppressed since it already played. */}
      <ChatLauncher onClick={toggleChat} animateIn={false} />

      {/* Performance Monitor - Disabled in Production */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <PerformanceToggle 
            onClick={togglePerformanceMonitor}
            isVisible={showPerformanceMonitor}
          />
          <PerformanceMonitor 
            stats={performanceStats} 
            isVisible={showPerformanceMonitor}
            onToggle={togglePerformanceMonitor}
          />
        </>
      )}


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