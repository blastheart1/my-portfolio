// Global type definitions for the portfolio

export interface CalendlyWindow {
  Calendly?: {
    showPopupWidget: (url: string) => void;
    closePopupWidget?: () => void;
  };
  calendlyLoaded?: boolean;
  calendlyError?: boolean;
}

export interface Project {
  title: string;
  description: string;
  tech: string[];
  link: string;
  image?: string;
  github?: string;
}

export interface Experience {
  role: string;
  company: string;
  description: string;
  year: string;
  current?: boolean;
}

export interface Skill {
  name: string;
  category: 'frontend' | 'backend' | 'tools' | 'testing' | 'ai' | 'database';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface ContactInfo {
  email: string;
  linkedin: string;
  instagram: string;
  location: string;
  calendly: string;
}

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  mounted: boolean;
}

// Extend the global Window interface
declare global {
  interface Window {
    Calendly?: {
      showPopupWidget: (url: string) => void;
      closePopupWidget?: () => void;
    };
    calendlyLoaded?: boolean;
    calendlyError?: boolean;
  }
}
