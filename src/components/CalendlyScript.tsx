'use client';
import { useEffect } from 'react';

export default function CalendlyScript() {
  useEffect(() => {
    // Add Calendly CSS
    const link = document.createElement('link');
    link.href = 'https://assets.calendly.com/assets/external/widget.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Add Calendly JS
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.type = 'text/javascript';
    script.async = true;
    document.body.appendChild(script);

    // Initialize badge widget
    const initScript = document.createElement('script');
    initScript.type = 'text/javascript';
    initScript.text = `
      window.onload = function() { 
        Calendly.initBadgeWidget({ 
          url: 'https://calendly.com/antonioluis-santos1/30min', 
          text: 'Schedule time with me', 
          color: '#0069ff', 
          textColor: '#ffffff', 
          branding: true 
        }); 
      }
    `;
    document.body.appendChild(initScript);

    // Cleanup when component unmounts
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (document.body.contains(initScript)) {
        document.body.removeChild(initScript);
      }
    };
  }, []);

  return null; // This component renders nothing
}
