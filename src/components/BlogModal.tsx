'use client';

import { useEffect } from 'react';
import { BlogPost } from '@/types/blog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BlogModalProps {
  post: BlogPost | null;
  isOpen: boolean;
  onClose: () => void;
}

// Function to format content properly
const formatContent = (content: string) => {
  try {
    // Check if content is JSON structure
    if (content.includes('{"introduction"') || content.includes('"body":[') || content.includes('"conclusion"')) {
      const parsed = JSON.parse(content);
      
      let formattedContent = '';
      
      if (parsed.introduction) {
        formattedContent += `<p class="mb-6 text-gray-700 dark:text-gray-300 leading-relaxed">${parsed.introduction}</p>`;
      }
      
      if (parsed.body && Array.isArray(parsed.body)) {
        parsed.body.forEach((paragraph: string) => {
          if (paragraph.trim()) {
            formattedContent += `<p class="mb-6 text-gray-700 dark:text-gray-300 leading-relaxed">${paragraph.trim()}</p>`;
          }
        });
      }
      
      if (parsed.conclusion) {
        formattedContent += `<p class="mb-6 text-gray-700 dark:text-gray-300 leading-relaxed font-medium">${parsed.conclusion}</p>`;
      }
      
      return <div dangerouslySetInnerHTML={{ __html: formattedContent }} />;
    }
    
    // If not JSON, format as regular text
    return content
      .split('\n\n')
      .map((paragraph, index) => 
        paragraph.trim() 
          ? <p key={index} className="mb-6 text-gray-700 dark:text-gray-300 leading-relaxed">{paragraph.trim()}</p>
          : null
      )
      .filter(Boolean);
  } catch {
    // If JSON parsing fails, treat as regular text
    return content
      .split('\n\n')
      .map((paragraph, index) => 
        paragraph.trim() 
          ? <p key={index} className="mb-6 text-gray-700 dark:text-gray-300 leading-relaxed">{paragraph.trim()}</p>
          : null
      )
      .filter(Boolean);
  }
};

export default function BlogModal({ post, isOpen, onClose }: BlogModalProps) {

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!post) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Dimmed backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          />

          {/* Modal wrapper - EXACTLY like your reference */}
          <motion.div
            className="relative z-50 w-full max-w-3xl mx-4 max-h-[95dvh] flex flex-col"
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            <Card className="flex flex-col flex-1 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md relative overflow-hidden safe-area-padding">
              {/* Fade overlays */}
              <div className="absolute top-0 left-0 w-full h-6 bg-gradient-to-b from-white/90 dark:from-gray-800/90 to-transparent pointer-events-none rounded-t-2xl" />
              <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-white/90 dark:from-gray-800/90 to-transparent pointer-events-none rounded-b-2xl" />

              {/* Close Button */}
              <div className="absolute top-4 right-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="rounded-full bg-transparent hover:bg-transparent active:bg-transparent
             text-gray-600 hover:text-gray-900
             dark:text-white dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <CardHeader className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold">
                  {post.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    {post.type === 'case-study' ? 'Case Study' : 'Blog Post'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300">
                    {post.topic}
                  </span>
                </div>
              </CardHeader>

              {/* Scrollable content - EXACTLY like your reference */}
              <CardContent className="flex-1 flex flex-col gap-6 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {post.topic}
                  </span>
                </div>

                {/* Full Content */}
                <div className="max-w-none">
                  <div 
                    className="text-gray-700 dark:text-gray-300 leading-relaxed text-base"
                    style={{ 
                      lineHeight: '1.7'
                    }}
                  >
                    {formatContent(post.content)}
                  </div>
                </div>

                {/* Case Study Link */}
                {post.caseStudyLink && (
                  <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Source Case Study</h4>
                        <a
                          href={post.caseStudyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline break-all"
                        >
                          {post.caseStudyLink}
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sources */}
                {post.sources && post.sources.length > 0 && (
                  <div className="mt-8">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Sources</h4>
                    <div className="space-y-2">
                      {post.sources.map((source, index) => (
                        <a
                          key={index}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{source.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}