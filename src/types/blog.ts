export interface BlogPost {
  id: string;
  /**
   * The post's permanent URL segment.
   *
   * Optional rather than required because the reads tolerate a row without
   * one: it simply has no page, instead of taking the whole blog down. On
   * Neon the column is NOT NULL from the first migration, so this should not
   * occur — but a read path that assumes its own schema is the one that fails
   * hardest when it is wrong.
   */
  slug?: string;
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
  caseStudyLink?: string;
  createdAt: Date;
  updatedAt: Date;
  published: boolean;
}

export interface ContentGenerationRequest {
  topic: string;
  type: 'blog' | 'case-study';
  previousContent?: BlogPost[];
  /**
   * Reasons a previous attempt was rejected by the publish gate.
   *
   * Present only on a repair pass. A rewrite that is not told what was wrong
   * tends to reproduce the same fault, so these are fed back verbatim.
   */
  revisionNotes?: string[];
}

export interface ContentGenerationResponse {
  title: string;
  content: string;
  excerpt: string;
  metrics?: {
    percentage: number;
    description: string;
  };
  sources?: {
    title: string;
    url: string;
  }[];
  /** null when the model had nothing credible to cite. */
  caseStudyLink?: string | null;
}