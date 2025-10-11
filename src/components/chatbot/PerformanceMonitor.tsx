import React from 'react';

interface PerformanceStats {
  tensorflow?: {
    cacheStats: {
      size: number;
      maxSize: number;
    };
    trainingMetrics: {
      startTime: number;
      endTime: number;
      epochs: number;
      finalLoss: number;
      finalAccuracy: number;
    };
    modelReady: boolean;
  };
  openai?: {
    cacheStats: {
      size: number;
      maxSize: number;
    };
    usageStats: {
      totalRequests: number;
      totalTokens: number;
      totalCost: number;
      averageResponseTime: number;
    };
    rateLimitDelay: number;
  };
}

interface PerformanceMonitorProps {
  stats: PerformanceStats | null;
  isVisible?: boolean;
  onToggle?: () => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  stats, 
  isVisible = false,
  onToggle
}) => {
  if (!isVisible || !stats) return null;

  const tensorflowStats = stats.tensorflow;
  const openaiStats = stats.openai;

  const trainingTime = tensorflowStats?.trainingMetrics?.endTime && tensorflowStats.trainingMetrics.endTime > 0 
    ? ((tensorflowStats.trainingMetrics.endTime - tensorflowStats.trainingMetrics.startTime) / 1000).toFixed(2)
    : 'N/A';

  const tensorflowCacheHitRate = tensorflowStats?.cacheStats?.size && tensorflowStats.cacheStats.size > 0 
    ? ((tensorflowStats.cacheStats.size / tensorflowStats.cacheStats.maxSize) * 100).toFixed(1)
    : '0';

  const openaiCacheHitRate = openaiStats?.cacheStats?.size && openaiStats.cacheStats.size > 0 
    ? ((openaiStats.cacheStats.size / openaiStats.cacheStats.maxSize) * 100).toFixed(1)
    : '0';

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-40">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-800">🚀 Performance Monitor</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${tensorflowStats?.modelReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
          {onToggle && (
            <button
              onClick={onToggle}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
              title="Hide performance monitor"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      <div className="space-y-3 text-xs">
        {/* TensorFlow Stats */}
        {tensorflowStats && (
          <div className="border-b border-gray-100 pb-2">
            <div className="font-semibold text-gray-700 mb-2">🧠 TensorFlow</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Training Time:</span>
                <span className="font-mono text-blue-600">{trainingTime}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Epochs:</span>
                <span className="font-mono text-blue-600">{tensorflowStats.trainingMetrics?.epochs || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Accuracy:</span>
                <span className="font-mono text-green-600">
                  {((tensorflowStats.trainingMetrics?.finalAccuracy || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cache:</span>
                <span className="font-mono text-purple-600">
                  {tensorflowStats.cacheStats?.size || 0}/{tensorflowStats.cacheStats?.maxSize || 0} ({tensorflowCacheHitRate}%)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* OpenAI Stats */}
        {openaiStats && (
          <div>
            <div className="font-semibold text-gray-700 mb-2">🤖 OpenAI</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Requests:</span>
                <span className="font-mono text-blue-600">{openaiStats.usageStats?.totalRequests || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tokens:</span>
                <span className="font-mono text-green-600">{(openaiStats.usageStats?.totalTokens || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cost:</span>
                <span className="font-mono text-red-600">${(openaiStats.usageStats?.totalCost || 0).toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Response:</span>
                <span className="font-mono text-purple-600">{(openaiStats.usageStats?.averageResponseTime || 0).toFixed(0)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cache:</span>
                <span className="font-mono text-orange-600">
                  {openaiStats.cacheStats?.size || 0}/{openaiStats.cacheStats?.maxSize || 0} ({openaiCacheHitRate}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          💡 Optimized: TensorFlow (50 epochs, caching) + OpenAI (rate limiting, response compression, token limits)
        </div>
      </div>
    </div>
  );
};
