export interface BlogPost {
  id: string;
  /**
   * The post's permanent URL segment.
   *
   * Optional because rows written before the slug column existed have none,
   * and because the reads tolerate the column being absent entirely — the SQL
   * is applied by hand in the Supabase console, so code that selects it can
   * reach production before the migration does. A post without a slug simply
   * has no page; it does not take the whole blog down.
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