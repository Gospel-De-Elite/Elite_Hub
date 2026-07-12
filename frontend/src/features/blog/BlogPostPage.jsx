/**
 * BlogPostPage — /blog/:slug
 * Public single post view. Renders the markdown content with our
 * built-in converter. No login required.
 */

import { useQuery }   from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import apiClient      from "@/api/client";
import { markdownToHtml, readingTime } from "@/lib/markdown";
import { Calendar, Clock, ArrowLeft } from "lucide-react";

export default function BlogPostPage() {
  const { slug } = useParams();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn:  async () => {
      const { data } = await apiClient.get(`/blog/posts/${slug}`);
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-landing-bg">
        <div className="mx-auto max-w-3xl px-4 py-24 md:px-8">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-3/4 rounded bg-landing-surface" />
            <div className="h-4 w-1/2 rounded bg-landing-surface" />
            <div className="h-96 rounded-2xl bg-landing-surface" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-landing-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-landing-text-secondary text-lg">Post not found.</p>
          <Link to="/blog" className="mt-4 inline-block text-landing-primary hover:underline">
            ← Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-NG", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;
  const mins = readingTime(post.content);
  const html = markdownToHtml(post.content);

  return (
    <div className="min-h-screen bg-landing-bg text-white">
      {/* Top nav */}
      <header className="border-b border-white/10 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="font-display text-xl font-semibold text-white hover:text-landing-primary">
            Elite Hub
          </Link>
          <Link to="/login" className="text-sm text-landing-text-secondary hover:text-white">
            Sign in →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-landing-text-secondary hover:text-white mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>

        {/* Cover image */}
        {post.coverImageUrl && (
          <div className="mb-8 aspect-video w-full overflow-hidden rounded-2xl">
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Title + meta */}
        <h1 className="font-display text-3xl font-bold text-white md:text-4xl leading-tight">
          {post.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-landing-text-secondary">
          {post.author && (
            <span className="font-medium text-white">
              {post.author.firstName} {post.author.lastName}
            </span>
          )}
          {date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {date}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {mins} min read
          </span>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-white/10" />

        {/* Markdown content */}
        <article
          className="prose-blog text-landing-text-secondary"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Bottom nav */}
        <div className="mt-16 border-t border-white/10 pt-8 text-center">
          <Link to="/blog" className="text-landing-primary hover:underline text-sm">
            ← View all posts
          </Link>
        </div>
      </main>
    </div>
  );
}
