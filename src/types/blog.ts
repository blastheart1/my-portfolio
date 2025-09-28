export interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  type: 'blog' | 'case-study';
  topic: string;
  metrics?: {
    percentage: number;
    description: string;
  };
  sources?: {
    title: string;
    url: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  published: boolean;
}

export interface ContentGenerationRequest {
  topic: string;
  type: 'blog' | 'case-study';
  previousContent?: BlogPost[];
}

export interface ContentGenerationResponse {
  title: string;
  content: string;
  excerpt: string;
  metrics?: {
    percentage: number;
    description: string;
  };
}