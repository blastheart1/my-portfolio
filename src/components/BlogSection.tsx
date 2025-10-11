'use client';

import { useState, useEffect, useRef } from 'react';
import { BlogPost } from '@/types/blog';
import BlogModal from './BlogModal';
import { useModal } from '@/contexts/ModalContext';

interface BlogSectionProps {
  className?: string;
}

export default function BlogSection({ className = '' }: BlogSectionProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const { isModalOpen, setIsModalOpen } = useModal();

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

  const handleReadMore = (post: BlogPost) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      // Swipe left - go to next page
      const nextPage = Math.min(Math.ceil(posts.length / 3) - 1, currentPage + 1);
      handlePageChange(nextPage);
    }
    
    if (isRightSwipe) {
      // Swipe right - go to previous page
      const prevPage = Math.max(0, currentPage - 1);
      handlePageChange(prevPage);
    }
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
              Insights on technology and software development
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
              Insights on technology and software development
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
              <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
                Blog & Case Studies
              </h2>
              <p className="text-neutral-400 text-lg">
                Insights on technology and software development
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
          {/* Mobile: Single card with swipe */}
          <div className="lg:hidden">
            <div 
              className="relative h-[400px] overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: `translateX(-${currentPage * 100}%)` }}>
                {posts.map((post) => (
                  <div key={post.id} className="w-full flex-shrink-0 px-2">
                    <BlogCard 
                      post={post} 
                      isTransitioning={isTransitioning}
                      transitionDelay={0}
                      roundedClass="rounded-xl"
                      onReadMore={handleReadMore}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop: Three card grid */}
          <div className="hidden lg:block relative h-[400px]">
            <div className="grid grid-cols-1 lg:grid-cols-3 items-center border border-neutral-700 divide-y lg:divide-y-0 lg:divide-x divide-neutral-700 rounded-xl">
              {[0, 1, 2].map((slotIndex) => {
                const postIndex = currentPage * 3 + slotIndex;
                const post = posts[postIndex];
                
                // Determine rounded corners based on position
                const getRoundedClasses = (index: number) => {
                  if (index === 0) return 'rounded-l-xl'; // First card - left rounded
                  if (index === 1) return ''; // Middle card - no rounded corners
                  return 'rounded-r-xl'; // Last card - right rounded
                };
                
                return (
                  <div key={`${currentPage}-${slotIndex}`}>
                    {post ? (
                      <BlogCard 
                        post={post} 
                        isTransitioning={isTransitioning}
                        transitionDelay={slotIndex * 100}
                        roundedClass={getRoundedClasses(slotIndex)}
                        onReadMore={handleReadMore}
                      />
                    ) : (
                      <div className={`h-full bg-neutral-900 flex items-center justify-center ${getRoundedClasses(slotIndex)}`} style={{ minHeight: '380px', maxHeight: '380px' }}>
                        <p className="text-neutral-500 text-sm">No content</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
            {posts.length > 0 && (
              <div className="mt-4 text-center">
                {/* Mobile pagination */}
                <div className="lg:hidden">
                  <p className="text-neutral-500 text-sm mb-2">Post {currentPage + 1} of {posts.length}</p>
                
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
                    aria-label="Previous post"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* Next button */}
                  <button
                    onClick={() => handlePageChange(Math.min(posts.length - 1, currentPage + 1))}
                    disabled={currentPage === posts.length - 1 || isTransitioning}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      currentPage === posts.length - 1 || isTransitioning
                        ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' 
                        : 'bg-neutral-700 text-blue-500 hover:bg-neutral-600'
                    }`}
                    aria-label="Next post"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Desktop pagination */}
              <div className="hidden lg:block">
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

                  {/* Pagination dots - max 5 dots */}
                  <div className="flex gap-3">
                    {Array.from({ length: Math.min(5, Math.ceil(posts.length / 3)) }).map((_, index) => (
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
            </div>
          )}
        </>
        )}
      </div>
      
      {/* Blog Modal */}
      <BlogModal 
        post={selectedPost} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </section>
  );
}

interface BlogCardProps {
  post: BlogPost;
  isTransitioning?: boolean;
  transitionDelay?: number;
  roundedClass?: string;
  onReadMore?: (post: BlogPost) => void;
}

function BlogCard({ post, isTransitioning = false, transitionDelay = 0, roundedClass = '', onReadMore }: BlogCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasScrollableContent, setHasScrollableContent] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [showScrollDownIndicator, setShowScrollDownIndicator] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScrollable = () => {
      if (contentRef.current) {
        const isScrollable = contentRef.current.scrollHeight > contentRef.current.clientHeight;
        setHasScrollableContent(isScrollable);
        setShowScrollIndicator(isScrollable);
        setShowScrollDownIndicator(isScrollable);
      }
    };
    
    checkScrollable();
    const timeoutId = setTimeout(checkScrollable, 100);
    
    window.addEventListener('resize', checkScrollable);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkScrollable);
    };
  }, [post.excerpt, post.sources, post.title]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop } = target;
    
    // Hide indicator when scrolled
    if (scrollTop > 0) {
      setShowScrollIndicator(false);
      setShowScrollDownIndicator(false);
    } else {
      setShowScrollIndicator(true);
      setShowScrollDownIndicator(true);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    // More precise boundary detection
    const isAtTop = scrollTop <= 1; // Allow 1px tolerance
    const isAtBottom = scrollTop >= scrollHeight - clientHeight - 1; // Allow 1px tolerance
    
    // Prevent scroll leakage at boundaries
    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  return (
    <div 
      className={`group relative z-10 p-4 md:p-6 h-full flex flex-col bg-neutral-900 focus:outline-hidden before:absolute before:inset-0 before:bg-linear-to-b hover:before:from-transparent hover:before:via-transparent hover:before:to-blue-500/10 before:via-80% focus:before:from-transparent focus:before:via-transparent focus:before:to-blue-500/10 before:-z-1 before:opacity-0 hover:before:opacity-100 focus:before:opacity-100 ${roundedClass}`}
      style={{ minHeight: '380px', maxHeight: '380px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Fixed header with icon and title */}
      <div className="flex-shrink-0 mb-4">
        <h3 
          className={`mt-4 font-medium text-lg text-white transition-all duration-500 ease-out ${
            isTransitioning ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
          }`}
          style={{
            transitionDelay: `${transitionDelay + 100}ms`
          }}
        >
          {post.title}
        </h3>
      </div>
      
      {/* Scrollable content area */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto scrollbar-hide relative min-h-0"
        onScroll={handleScroll}
        onWheel={handleWheel}
        onTouchStart={(e) => {
          // Prevent touch scroll leakage
          const target = e.currentTarget;
          const { scrollTop, scrollHeight, clientHeight } = target;
          const isAtTop = scrollTop <= 1;
          const isAtBottom = scrollTop >= scrollHeight - clientHeight - 1;
          
          if (isAtTop || isAtBottom) {
            e.stopPropagation();
          }
        }}
      >
        <div 
          className={`pr-2 pb-6 transition-all duration-500 ease-out ${
            isTransitioning ? 'opacity-0 translate-y-6 scale-98' : 'opacity-100 translate-y-0 scale-100'
          }`}
          style={{
            transitionDelay: `${transitionDelay + 200}ms`
          }}
        >
          <p className="text-neutral-400 leading-relaxed">{post.excerpt}</p>
          
          {/* Sources as badges */}
          {post.sources && post.sources.length > 0 && (
            <div 
              className={`mt-4 flex flex-wrap gap-2 transition-all duration-500 ease-out ${
                isTransitioning ? 'opacity-0 translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'
              }`}
              style={{
                transitionDelay: `${transitionDelay + 400}ms`
              }}
            >
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
        
        {/* Scroll indicator - fades when scrolled */}
        {isHovered && hasScrollableContent && showScrollIndicator && (
          <div className="absolute bottom-0 left-0 right-2 h-9 bg-gradient-to-t from-neutral-900 via-neutral-900/80 to-transparent pointer-events-none">
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>scroll to read more</span>
              </div>
            </div>
          </div>
        )}
        
      </div>
      
      {/* Mobile scroll down indicator - between content and footer */}
      <div className="lg:hidden">
        {hasScrollableContent && showScrollDownIndicator && (
            <div className="flex justify-center pt-1.5 pb-0">
            <div className="flex items-center gap-1 text-[10px] text-neutral-400">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span>scroll down for more</span>
            </div>
          </div>
        )}
      </div>
      
          {/* Fixed footer - always visible at bottom */}
          <div 
            className={`flex-shrink-0 mt-auto pt-2 transition-all duration-500 ease-out ${
              isTransitioning ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
            }`}
            style={{
              transitionDelay: `${transitionDelay + 300}ms`
            }}
          >
            <div className="h-6 flex items-center">
              {post.caseStudyLink ? (
                <a
                  href={post.caseStudyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm text-blue-500 pb-1 border-b-2 border-neutral-700 group-hover:border-blue-500 group-focus:border-blue-500 transition-all duration-300 ease-in-out focus:outline-hidden hover:text-blue-400"
                >
                  View Case Study →
                </a>
              ) : (
                <button
                  onClick={() => onReadMore?.(post)}
                  className="font-medium text-sm text-blue-500 pb-1 border-b-2 border-neutral-700 hover:border-blue-500 focus:border-blue-500 transition-all duration-300 ease-in-out focus:outline-hidden hover:text-blue-400 cursor-pointer"
                >
                  Click to read →
                </button>
              )}
            </div>
          </div>
    </div>
  );
}