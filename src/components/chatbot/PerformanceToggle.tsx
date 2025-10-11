import React from 'react';
import { motion } from 'framer-motion';

interface PerformanceToggleProps {
  onClick: () => void;
  isVisible: boolean;
}

export const PerformanceToggle: React.FC<PerformanceToggleProps> = ({ 
  onClick, 
  isVisible 
}) => {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-4 left-4 w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-colors"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title={isVisible ? "Hide performance monitor" : "Show performance monitor"}
    >
      {isVisible ? (
        <span className="text-sm">📊</span>
      ) : (
        <span className="text-sm">📈</span>
      )}
    </motion.button>
  );
};
