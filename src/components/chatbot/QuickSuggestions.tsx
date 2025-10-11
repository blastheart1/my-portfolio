import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, DollarSign, Code, Users, Briefcase, HelpCircle } from 'lucide-react';

export interface Suggestion {
  id: string;
  text: string;
  icon: React.ReactNode;
  category: 'services' | 'pricing' | 'about' | 'contact' | 'skills' | 'general';
  triggerLead?: boolean; // Whether this suggestion should trigger lead generation
}

interface QuickSuggestionsProps {
  onSuggestionClick: (suggestion: string, triggerLead?: boolean) => void;
  isVisible: boolean;
  className?: string;
}

export const QuickSuggestions: React.FC<QuickSuggestionsProps> = ({
  onSuggestionClick,
  isVisible,
  className = ''
}) => {
  const suggestions: Suggestion[] = [
    {
      id: 'services',
      text: 'What services do you offer?',
      icon: <Briefcase className="w-4 h-4" />,
      category: 'services',
      triggerLead: true
    },
    {
      id: 'pricing',
      text: 'What are your rates?',
      icon: <DollarSign className="w-4 h-4" />,
      category: 'pricing',
      triggerLead: true
    },
    {
      id: 'website',
      text: 'Can you build me a website?',
      icon: <Code className="w-4 h-4" />,
      category: 'services',
      triggerLead: true
    },
    {
      id: 'chatbot',
      text: 'Do you create chatbots?',
      icon: <MessageSquare className="w-4 h-4" />,
      category: 'services',
      triggerLead: true
    },
    {
      id: 'ecommerce',
      text: 'Can you build an e-commerce site?',
      icon: <Code className="w-4 h-4" />,
      category: 'services',
      triggerLead: true
    },
    {
      id: 'consulting',
      text: 'Do you offer consulting services?',
      icon: <Briefcase className="w-4 h-4" />,
      category: 'services',
      triggerLead: true
    },
    {
      id: 'about',
      text: 'Tell me about yourself',
      icon: <Users className="w-4 h-4" />,
      category: 'about'
    },
    {
      id: 'skills',
      text: 'What are your skills?',
      icon: <HelpCircle className="w-4 h-4" />,
      category: 'skills'
    }
  ];

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className={`quick-suggestions ${className}`}
    >
      <div className="mb-2 md:mb-3">
        <p className="text-xs md:text-sm text-gray-500 font-medium">Quick questions:</p>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((suggestion) => (
          <motion.button
            key={suggestion.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSuggestionClick(suggestion.text, suggestion.triggerLead)}
            className={`
              flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg border text-left transition-all duration-200
              ${suggestion.triggerLead 
                ? 'border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 text-blue-800' 
                : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700'
              }
              shadow-sm hover:shadow-md min-h-[44px]
            `}
          >
            <div className={`
              flex-shrink-0 p-2 rounded-lg
              ${suggestion.triggerLead ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
            `}>
              {suggestion.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs md:text-sm font-medium leading-tight">
                {suggestion.text}
              </span>
              {suggestion.triggerLead && (
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-blue-600 font-medium">Lead opportunity</span>
                </div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
      
      <div className="mt-2 md:mt-3 text-xs text-gray-400 text-center">
        Click any suggestion to start the conversation
      </div>
    </motion.div>
  );
};
