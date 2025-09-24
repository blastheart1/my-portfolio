'use client';
import { useEffect, useState } from 'react';
import { CalendlyWindow } from '@/types/global';

export default function CalendlyScript() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let link: HTMLLinkElement | null = null;
    let script: HTMLScriptElement | null = null;

    const loadCalendly = async () => {
      try {
        // Add Calendly CSS
        link = document.createElement('link');
        link.href = 'https://assets.calendly.com/assets/external/widget.css';
        link.rel = 'stylesheet';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);

        // Add Calendly JS
        script = document.createElement('script');
        script.src = 'https://assets.calendly.com/assets/external/widget.js';
        script.async = true;
        script.crossOrigin = 'anonymous';
        
        script.onload = () => {
          setIsLoaded(true);
          setHasError(false);
        };
        
        script.onerror = () => {
          setHasError(true);
          setIsLoaded(false);
        };

        document.body.appendChild(script);
      } catch (error) {
        console.error('Failed to load Calendly:', error);
        setHasError(true);
      }
    };

    loadCalendly();

    // Cleanup when component unmounts
    return () => {
      if (link && document.head.contains(link)) {
        document.head.removeChild(link);
      }
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Expose loading state globally for other components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as Window & CalendlyWindow).calendlyLoaded = isLoaded;
      (window as Window & CalendlyWindow).calendlyError = hasError;
    }
  }, [isLoaded, hasError]);

  return null; // This component renders nothing
}
