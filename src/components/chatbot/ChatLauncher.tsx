'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * The floating chatbot button.
 *
 * Deliberately free of any TensorFlow or chatbot-service import. This is what
 * PortfolioChatbotWrapper renders before the user has ever opened the chat, so
 * pulling in @tensorflow/tfjs (~1.1 MB) from here would defeat the whole point
 * of the lazy boundary. Keep this component's import list trivial.
 *
 * Chatbot renders the same component once mounted, so the button looks and
 * behaves identically before and after the swap — only with `animateIn` off,
 * since it has already played its entrance.
 */
interface ChatLauncherProps {
  onClick: () => void;
  /** Play the entrance animation. False when re-rendered after the mount swap. */
  animateIn?: boolean;
}

export default function ChatLauncher({ onClick, animateIn = true }: ChatLauncherProps) {
  return (
    <motion.img
      src="/LuisBot.png"
      alt="Luis AI Chatbot"
      onClick={onClick}
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-16 h-16 md:w-20 md:h-20 cursor-pointer z-40"
      style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
      whileHover={{
        scale: 1.1,
        rotate: [0, -5, 5, -5, 0],
        filter: 'drop-shadow(0 8px 12px rgba(0, 0, 0, 0.2))',
      }}
      whileTap={{ scale: 0.9, rotate: 0 }}
      initial={animateIn ? { scale: 0, opacity: 0, y: 20 } : false}
      animate={{ scale: 1, opacity: 1, y: 0, rotate: [0, 0, 0, 0, 0] }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        rotate: { duration: 0.5, ease: 'easeInOut' },
      }}
      role="button"
      tabIndex={0}
      aria-label="Open AI Chatbot"
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onError={e => {
        const target = e.currentTarget;
        if (target.src.endsWith('/LuisBot.png')) {
          target.src = '/LuisBot.ico';
        } else if (target.src.endsWith('/LuisBot.ico')) {
          target.src = '/favicon.ico';
        } else {
          target.style.display = 'none';
          target.parentElement!.innerHTML = '🤖';
        }
      }}
      loading="eager"
      width="80"
      height="80"
    />
  );
}
