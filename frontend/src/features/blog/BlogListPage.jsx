/**
 * BlogListPage — /blog
 * Public page showing all published posts. No login required.
 * Uses the landing page dark design system since it sits outside the dashboard.
 */

import { useQuery } from "@tanstack/react-query";
import { Link }     from "react-router-dom";
import apiClient    from "@/api/client";
import { readingTime } from "@/lib/markdown";
import { Calendar, Clock, ArrowRight } from "lucide-react";

function PostCard({ post }) {
  const mins = readingTime(post.excerpt + " " + (post.content || ""));
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-NG", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-landing-card transition-colors hover:border-landing-primary/40"
    >
      {post.coverImageUrl && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      {!post.coverImageUrl && (
        <div className="aspect-video w-full bg-gradient-to-br from-landing-primary/20 to-landing-surface flex items-center justify-center">
          <span className="text-4xl font-display font-bold text-landing-primary/30">
            {post.title[0]}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3 text-xs text-landing-text-secondary">
          {date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {date}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {mins} min read
          </span>
        </div>

        <h2 className="mt-3 font-display text-lg font-semibold text-white group-hover:text-landing-primary transition-colors line-clamp-2">
          {post.title}
        </h2>

        <p className="mt-2 text-sm text-landing-text-secondary line-clamp-3 flex-1">
          {post.excerpt}
        </p>

        <div className="mt-4 flex items-center justify-between">
          {post.author && (
            <span className="text-xs text-landing-text-secondary">
              {post.author.firstName} {post.author.lastName}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-landing-primary">
            Read more <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function BlogListPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["blog-posts"],
    queryFn:  async () => {
      const { data } = await apiClient.get("/blog/posts?limit=12");
      return data.data;
    },
  });

  return (
    <div className="min-h-screen bg-landing-bg text-white">
      {/* Top nav — minimal, links back to landing */}
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

      <main className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="mb-12 text-center">
          <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
            From Our Blog
          </h1>
          <p className="mt-4 text-landing-text-secondary">
            Tips, updates, and insights from the Elite Hub team.
          </p>
        </div>

        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-landing-surface" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-center text-landing-text-secondary">
            Unable to load posts right now. Please try again later.
          </p>
        )}

        {data?.posts?.length === 0 && (
          <p className="text-center text-landing-text-secondary">
            No posts published yet. Check back soon.
          </p>
        )}

        {data?.posts?.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
