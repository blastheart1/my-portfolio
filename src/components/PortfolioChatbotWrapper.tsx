'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the chatbot to avoid SSR issues
const Chatbot = dynamic(
  () => import('./chatbot/Chatbot').then(mod => ({ default: mod.Chatbot })),
  { ssr: false }
);

export default function PortfolioChatbotWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Chatbot
      openaiApiKey={process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''}
      confidenceThreshold={0.75}
    />
  );
}

