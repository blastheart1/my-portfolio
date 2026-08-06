'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ChatLauncher from './chatbot/ChatLauncher';

/**
 * Lazy boundary for the chatbot.
 *
 * The Chatbot subtree pulls in @tensorflow/tfjs (~1.1 MB) and trains an intent
 * classifier on the main thread during initialisation. Previously this
 * component rendered <Chatbot> unconditionally on mount, so every visitor paid
 * both costs immediately after hydration — during the exact window they are
 * forming a first impression — even though most never open the chat.
 *
 * Now only the launcher button renders up front. Chatbot (and therefore
 * TensorFlow) is fetched on the first click and stays mounted afterwards, so
 * closing and reopening the chat does not retrain the model.
 *
 * Do NOT hoist the Chatbot import to the top of this file, and do not render
 * <Chatbot> before `everOpened` — either change silently restores the 1.1 MB
 * eager download.
 */
const Chatbot = dynamic(
  () => import('./chatbot/Chatbot').then(mod => ({ default: mod.Chatbot })),
  {
    ssr: false,
    // The launcher is already on screen; no placeholder needed.
    loading: () => null,
  }
);

export default function PortfolioChatbotWrapper() {
  const [mounted, setMounted] = useState(false);
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Pre-first-open: a plain button with no chatbot or TensorFlow imports.
  if (!everOpened) {
    return <ChatLauncher onClick={() => setEverOpened(true)} />;
  }

  return <Chatbot startOpen confidenceThreshold={0.75} />;
}
