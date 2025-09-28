'use client';

import { useState, useEffect } from 'react';
import { BlogPost } from '@/types/blog';

interface BlogSectionProps {
  className?: string;
}

export default function BlogSection({ className = '' }: BlogSectionProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/blog?limit=3');
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
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Blog & Case Studies
          </h2>
          <p className="text-neutral-400 text-lg mb-6">
            AI-generated insights on technology and software development
          </p>
          <button
            onClick={generateNewContent}
            disabled={loading}
            className="px-6 py-2 bg-[#ff0] text-black font-semibold rounded-lg hover:bg-[#ff0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : 'Generate New Content'}
          </button>
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
        <div className="space-y-8">
          {/* Latest 3 posts in grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {posts.slice(0, 3).map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
          
          {/* Show more posts if available */}
          {posts.length > 3 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-white mb-4">More Articles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.slice(3).map((post) => (
                  <BlogCard key={post.id} post={post} compact />
                ))}
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </section>
  );
}

interface BlogCardProps {
  post: BlogPost;
  compact?: boolean;
}

function BlogCard({ post, compact = false }: BlogCardProps) {
  const getIcon = (topic: string) => {
    // Return relevant icons based on topic
    const icons = {
      'Generative AI': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#FFE01B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="#FFE01B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="#FFE01B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      'Software Quality Assurance': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12L11 14L15 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#10B981" strokeWidth="2"/>
        </svg>
      ),
      'Machine Learning': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      'DevOps': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      'Cloud Computing': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 10H16.74C16.37 8.28 14.82 7 13 7C11.55 7 10.3 7.9 9.7 9.2C9.1 7.9 7.85 7 6.4 7C4.42 7 2.8 8.6 2.8 10.6C2.8 10.6 2.8 10.6 2.8 10.6C1.2 10.6 0 11.8 0 13.4C0 15 1.2 16.2 2.8 16.2H18C19.1 16.2 20 15.3 20 14.2C20 13.1 19.1 10 18 10Z" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      'Cybersecurity': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22S8 18 8 13V6L12 4L16 6V13C16 18 12 22 12 22Z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 12L11 14L15 10" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      'Data Science': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3V21H21" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 9L12 6L16 10L20 6" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      'Web Development': (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      default: (
        <svg className="shrink-0 size-8" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2V8H20" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    };
    
    return icons[topic as keyof typeof icons] || icons.default;
  };

  return (
    <div className={`group relative z-10 ${compact ? 'p-4' : 'p-4 md:p-6'} h-full flex flex-col bg-neutral-900 focus:outline-hidden rounded-xl before:absolute before:inset-0 before:bg-linear-to-b hover:before:from-transparent hover:before:via-transparent hover:before:to-[#ff0]/10 before:via-80% focus:before:from-transparent focus:before:via-transparent focus:before:to-[#ff0]/10 before:-z-1 before:opacity-0 hover:before:opacity-100 focus:before:opacity-100`}>
      <div className="mb-5">
        {getIcon(post.topic)}
        
        <div className="mt-5">
          <h3 className={`font-medium text-white ${compact ? 'text-base' : 'text-lg'}`}>{post.title}</h3>
          <p className={`mt-1 text-neutral-400 ${compact ? 'text-sm' : 'text-base'}`}>{post.excerpt}</p>
          {post.metrics && !compact && (
            <div className="mt-3 p-2 bg-neutral-800 rounded-lg">
              <p className="text-sm text-neutral-300">
                <span className="text-[#ff0] font-semibold">Key Result:</span> {post.metrics.description}
              </p>
            </div>
          )}
        </div>
      </div>
      <p className="mt-auto">
        <span className="font-medium text-sm text-[#ff0] pb-1 border-b-2 border-neutral-700 group-hover:border-[#ff0] group-focus:border-[#ff0] transition focus:outline-hidden">
          {post.type === 'case-study' ? 'Case study' : 'Blog post'}
        </span>
      </p>
    </div>
  );
}