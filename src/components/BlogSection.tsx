'use client';

import { useState, useEffect, useRef } from 'react';
import { BlogPost } from '@/types/blog';

interface BlogSectionProps {
  className?: string;
}

export default function BlogSection({ className = '' }: BlogSectionProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/blog');
      const data = await response.json();
      
      if (data.posts) {
        setPosts(data.posts);
      } else {
        setError('Failed to load posts');
      }
    } catch (err) {
      setError('Failed to load posts');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage || isTransitioning) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(newPage);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }, 300);
  };

  const generateNewContent = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh the posts
        await fetchPosts();
      } else {
        setError('Failed to generate new content');
      }
    } catch (err) {
      setError('Failed to generate new content');
      console.error('Error generating content:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <section className={`py-16 px-4 ${className}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Blog & Case Studies
            </h2>
            <p className="text-neutral-400 text-lg">
              AI-generated insights on technology and software development
            </p>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff0]"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`py-16 px-4 ${className}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Blog & Case Studies
            </h2>
            <p className="text-neutral-400 text-lg">
              AI-generated insights on technology and software development
            </p>
          </div>
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchPosts}
              className="px-6 py-2 bg-[#ff0] text-black font-semibold rounded-lg hover:bg-[#ff0]/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
            Blog & Case Studies
          </h2>
          <p className="text-neutral-400 text-lg">
            AI-generated insights on technology and software development
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-400 text-lg mb-6">No content available yet.</p>
            <button
              onClick={generateNewContent}
              disabled={loading}
              className="px-6 py-2 bg-[#ff0] text-black font-semibold rounded-lg hover:bg-[#ff0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate First Content'}
            </button>
          </div>
        ) : (
        <>
          <div className="relative h-[400px] overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 h-full border border-neutral-700 divide-y lg:divide-y-0 lg:divide-x divide-neutral-700 rounded-xl">
              {[0, 1, 2].map((slotIndex) => {
                const postIndex = currentPage * 3 + slotIndex;
                const post = posts[postIndex];
                
                return (
                  <div key={`${currentPage}-${slotIndex}`}>
                    {post ? (
                      <BlogCard 
                        post={post} 
                        isTransitioning={isTransitioning}
                        transitionDelay={slotIndex * 100}
                      />
                    ) : (
                      <div className="h-full bg-neutral-900 rounded-xl flex items-center justify-center">
                        <p className="text-neutral-500 text-sm">No content</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {posts.length > 3 && (
            <div className="mt-8 text-center">
              <p className="text-neutral-500 text-sm mb-4">Page {currentPage + 1} of {Math.ceil(posts.length / 3)}</p>
              
              <div className="flex items-center justify-center gap-4">
                {/* Previous button */}
                <button
                  onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0 || isTransitioning}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    currentPage === 0 || isTransitioning
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' 
                      : 'bg-neutral-700 text-blue-500 hover:bg-neutral-600'
                  }`}
                  aria-label="Previous page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Pagination dots */}
                <div className="flex gap-3">
                  {Array.from({ length: Math.ceil(posts.length / 3) }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handlePageChange(index)}
                      disabled={isTransitioning}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        currentPage === index 
                          ? 'bg-blue-500 scale-125' 
                          : isTransitioning
                          ? 'bg-neutral-600 cursor-not-allowed'
                          : 'bg-neutral-600 hover:bg-neutral-500'
                      }`}
                      aria-label={`Go to page ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Next button */}
                <button
                  onClick={() => handlePageChange(Math.min(Math.ceil(posts.length / 3) - 1, currentPage + 1))}
                  disabled={currentPage === Math.ceil(posts.length / 3) - 1 || isTransitioning}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    currentPage === Math.ceil(posts.length / 3) - 1 || isTransitioning
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' 
                      : 'bg-neutral-700 text-blue-500 hover:bg-neutral-600'
                  }`}
                  aria-label="Next page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
        )}
      </div>
    </section>
  );
}

interface BlogCardProps {
  post: BlogPost;
  isTransitioning?: boolean;
  transitionDelay?: number;
}

function BlogCard({ post, isTransitioning = false, transitionDelay = 0 }: BlogCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasScrollableContent, setHasScrollableContent] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScrollable = () => {
      if (contentRef.current) {
        const isScrollable = contentRef.current.scrollHeight > contentRef.current.clientHeight;
        setHasScrollableContent(isScrollable);
      }
    };
    
    // Check immediately and after a short delay to ensure content is rendered
    checkScrollable();
    const timeoutId = setTimeout(checkScrollable, 100);
    
    window.addEventListener('resize', checkScrollable);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkScrollable);
    };
  }, [post.excerpt, post.sources]); // Re-check when content changes
  const getIcon = (topic: string) => {
    // Return professional icons based on topic
    const icons = {
      'Generative AI': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-5 0v-15A2.5 2.5 0 0 1 9.5 2Z" fill="#FFE01B"/>
          <path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-5 0v-15A2.5 2.5 0 0 1 14.5 2Z" fill="#FFE01B"/>
          <path d="M12 8v8" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 12h8" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      'Software Quality Assurance': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12L11 14L15 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#10B981" strokeWidth="2"/>
          <path d="M12 8v4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M12 16h.01" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      'Machine Learning': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="2" fill="#3B82F6"/>
        </svg>
      ),
      'DevOps': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 8h8" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 12h8" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      'Cloud Computing': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 10H16.74C16.37 8.28 14.82 7 13 7C11.55 7 10.3 7.9 9.7 9.2C9.1 7.9 7.85 7 6.4 7C4.42 7 2.8 8.6 2.8 10.6C2.8 10.6 2.8 10.6 2.8 10.6C1.2 10.6 0 11.8 0 13.4C0 15 1.2 16.2 2.8 16.2H18C19.1 16.2 20 15.3 20 14.2C20 13.1 19.1 10 18 10Z" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 12h4" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M8 14h2" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      'Cybersecurity': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22S8 18 8 13V6L12 4L16 6V13C16 18 12 22 12 22Z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 12L11 14L15 10" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 8v4" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      'Data Science': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3V21H21" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 9L12 6L16 10L20 6" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="9" cy="9" r="1" fill="#06B6D4"/>
          <circle cx="12" cy="6" r="1" fill="#06B6D4"/>
          <circle cx="16" cy="10" r="1" fill="#06B6D4"/>
        </svg>
      ),
      'Web Development': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 8v8" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      default: (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2V8H20" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 13H8" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M16 17H8" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )
    };
    
    return icons[topic as keyof typeof icons] || icons.default;
  };

  return (
    <div 
      className="group relative z-10 p-4 md:p-6 h-full flex flex-col bg-neutral-900 focus:outline-hidden first:rounded-t-xl last:rounded-b-xl lg:first:rounded-l-xl lg:first:rounded-tr-none lg:last:rounded-r-xl lg:last:rounded-bl-none before:absolute before:inset-0 before:bg-linear-to-b hover:before:from-transparent hover:before:via-transparent hover:before:to-blue-500/10 before:via-80% focus:before:from-transparent focus:before:via-transparent focus:before:to-blue-500/10 before:-z-1 last:before:rounded-b-xl lg:first:before:rounded-s-xl lg:last:before:rounded-e-xl lg:last:before:rounded-bl-none before:opacity-0 hover:before:opacity-100 focus:before:opacity-100"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Scrollable content area */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto scrollbar-hide relative"
      >
        <div 
          className={`pr-2 pb-6 transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            transitionDelay: `${transitionDelay}ms`
          }}
        >
          {/* Icon and title now included in fade animation */}
          <div className="mb-4">
            {getIcon(post.topic)}
            <h3 className="mt-4 font-medium text-lg text-white">{post.title}</h3>
          </div>
          
          <p className="text-neutral-400 leading-relaxed">{post.excerpt}</p>
          
          {/* Sources as badges */}
          {post.sources && post.sources.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.sources.slice(0, 2).map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-neutral-800 text-neutral-300 rounded-md hover:bg-neutral-700 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {source.title}
                </a>
              ))}
              {post.sources.length > 2 && (
                <span className="text-xs text-neutral-500">+{post.sources.length - 2} more</span>
              )}
            </div>
          )}
        </div>
        
        {/* Scroll indicator - only show if hovered and has scrollable content */}
        {isHovered && hasScrollableContent && (
          <div className="absolute bottom-0 left-0 right-2 h-8 bg-gradient-to-t from-neutral-900 via-neutral-900/80 to-transparent pointer-events-none">
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center gap-1 text-xs text-neutral-400 bg-neutral-800/90 px-3 py-1 rounded-full backdrop-blur-sm">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>scroll for more</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Fixed footer - always visible at bottom */}
      <div className="flex-shrink-0 mt-auto pt-4">
        <span className="font-medium text-sm text-blue-500 pb-1 border-b-2 border-neutral-700 group-hover:border-blue-500 group-focus:border-blue-500 transition focus:outline-hidden">
          {post.type === 'case-study' ? 'Case study' : 'Blog post'}
        </span>
      </div>
    </div>
  );
}