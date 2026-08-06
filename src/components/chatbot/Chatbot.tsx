import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ChatLauncher from './ChatLauncher';
import TrainingToast, { type TrainingPhase } from './TrainingToast';
import { ChatWindow } from './ChatWindow';
import { getConsent, setConsent } from '@/lib/chatbot/localModelConsent';
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

  // On-device model opt-in state.
  const [showConsent, setShowConsent] = useState(false);
  const [toastPhase, setToastPhase] = useState<TrainingPhase | null>(null);
  const [trainingProgress, setTrainingProgress] = useState(0);

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

  /**
   * Bring up the on-device model.
   *
   * Never called without consent. A cached model loads straight from
   * IndexedDB (fast, no toast beyond a brief "ready"); only a first-ever grant
   * pays for training, which reports progress so the toast can show it.
   */
  const initializeModel = useCallback(async () => {
    if (typeof window === 'undefined' || !tensorflowService) return;

    try {
      setIsLoading(true);
      setToastPhase('downloading');

      // Loading the module and any cached weights. This is where the ~1.1 MB
      // download happens, so the toast is already up.
      const modelLoaded = await tensorflowService.loadModel();

      if (!modelLoaded) {
        setToastPhase('training');
        setTrainingProgress(0);
        await tensorflowService.trainModel(p => setTrainingProgress(p.progress));
      }

      setIsModelReady(true);
      setToastPhase('ready');

      const storedCount = localStorage.getItem('learning-count');
      if (storedCount) setLearningCount(parseInt(storedCount));
    } catch (err) {
      console.error('Error initializing on-device model:', err);
      // Non-fatal: the chat continues to work through /api/chatbot/generate.
      setIsModelReady(false);
      setToastPhase('error');
    } finally {
      setIsLoading(false);
    }
  }, [tensorflowService]);

  // Decide, on mount, whether to prompt / auto-load / do nothing.
  useEffect(() => {
    if (typeof window === 'undefined' || !tensorflowService) return;

    const consent = getConsent();

    if (consent === 'granted') {
      // Already opted in — bring the model up without asking again.
      void initializeModel();
    } else {
      // No model, no download. The chat works via the server route.
      setIsLoading(false);
      setShowConsent(consent === 'unset');
    }
  }, [tensorflowService, initializeModel]);

  const handleAcceptLocalModel = useCallback(() => {
    setConsent('granted');
    setShowConsent(false);
    void initializeModel();
  }, [initializeModel]);

  const handleDeclineLocalModel = useCallback(() => {
    setConsent('declined');
    setShowConsent(false);
  }, []);

  // Auto-dismiss the terminal toast states; keep progress states pinned.
  useEffect(() => {
    if (toastPhase !== 'ready' && toastPhase !== 'error') return;
    const t = setTimeout(() => setToastPhase(null), 4000);
    return () => clearTimeout(t);
  }, [toastPhase]);

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

      {/* On-device model progress. Only animates because training yields
          between batches — see tensorflowModel.trainModel. */}
      <TrainingToast
        phase={toastPhase}
        progress={trainingProgress}
        onDismiss={() => setToastPhase(null)}
      />

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
        showLocalModelConsent={showConsent}
        onAcceptLocalModel={handleAcceptLocalModel}
        onDeclineLocalModel={handleDeclineLocalModel}
      />
    </>
  );
};