declare module '@/lib/chatbot/data/*.json' {
  interface Intent {
    tag: string;
    patterns: string[];
    responses: string[];
  }

  interface Data {
    intents: Intent[];
  }

  const data: Data;
  export = data;
}

