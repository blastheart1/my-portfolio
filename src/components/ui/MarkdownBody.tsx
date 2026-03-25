'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface Props {
  children: string;
  /** Base paragraph style — defaults to match the About section body */
  className?: string;
}

// Only allow safe URL protocols in links
function isSafeHref(href: string | undefined): boolean {
  if (!href) return false;
  return href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('#');
}

const components: Components = {
  // Paragraph — matches current About body style exactly
  p: ({ children }) => (
    <p className="text-lg text-muted-foreground leading-relaxed indent-8 text-justify mb-4 last:mb-0">
      {children}
    </p>
  ),

  // Headings
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-3 leading-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-5 mb-2 leading-tight">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">
      {children}
    </h3>
  ),

  // Inline
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-gray-700 dark:text-gray-300">{children}</em>
  ),

  // Links — safe href only, open in new tab
  a: ({ href, children }) => {
    if (!isSafeHref(href)) return <span>{children}</span>;
    const isExternal = href?.startsWith('http');
    return (
      <a
        href={href}
        className="text-[var(--color-brand)] underline underline-offset-2 hover:no-underline transition-colors"
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  },

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-6 space-y-1 text-lg text-muted-foreground leading-relaxed my-3">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-6 space-y-1 text-lg text-muted-foreground leading-relaxed my-3">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[var(--color-brand)] pl-4 my-4 text-gray-600 dark:text-gray-400 italic">
      {children}
    </blockquote>
  ),

  // Inline code
  code: ({ children }) => (
    <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm font-mono text-gray-800 dark:text-gray-200">
      {children}
    </code>
  ),

  // Horizontal rule
  hr: () => (
    <hr className="my-6 border-gray-200 dark:border-gray-700" />
  ),
};

export default function MarkdownBody({ children, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
