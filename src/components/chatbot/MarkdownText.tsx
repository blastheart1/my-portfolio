import React from 'react';

interface MarkdownTextProps {
  content: string;
  className?: string;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ content, className = '' }) => {
  const parseMarkdown = (text: string) => {
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((paragraph, pIndex) => {
      const lines = paragraph.split('\n');
      
      return (
        <div key={pIndex} className={pIndex > 0 ? 'mt-3' : ''}>
          {lines.map((line, lIndex) => {
            const elements = [];
            let lastIndex = 0;
            
            const boldRegex = /\*\*(.*?)\*\*/g;
            let match;
            
            while ((match = boldRegex.exec(line)) !== null) {
              if (match.index > lastIndex) {
                elements.push(
                  <span key={`${lIndex}-${lastIndex}`}>
                    {parseLinks(line.slice(lastIndex, match.index))}
                  </span>
                );
              }
              
              elements.push(
                <strong key={`${lIndex}-bold-${match.index}`} className="font-semibold">
                  {parseLinks(match[1])}
                </strong>
              );
              
              lastIndex = match.index + match[0].length;
            }
            
            if (lastIndex < line.length) {
              elements.push(
                <span key={`${lIndex}-end`}>
                  {parseLinks(line.slice(lastIndex))}
                </span>
              );
            }
            
            return (
              <div key={lIndex} className={lIndex > 0 ? 'mt-1' : ''}>
                {elements.length > 0 ? elements : parseLinks(line)}
              </div>
            );
          })}
        </div>
      );
    });
  };
  
  const parseLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };
  
  return (
    <div className={className}>
      {parseMarkdown(content)}
    </div>
  );
};

