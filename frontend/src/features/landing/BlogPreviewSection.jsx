/**
 * BlogPreviewSection — "From Our Blog"
 * Shows the 3 most recent published posts on the landing page.
 * Placed between Testimonials and FAQ per the landing page spec.
 */

import { useQuery } from "@tanstack/react-query";
import { Link }     from "react-router-dom";
import apiClient    from "@/api/client";
import { ArrowRight, Calendar } from "lucide-react";

function PostCard({ post }) {
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-NG", {
        day: "numeric", month: "short", year: "numeric",
      })
    : null;

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-landing-card transition-all hover:border-landing-primary/40 hover:-translate-y-1"
    >
      {post.coverImageUrl ? (
        <div className="aspect-video overflow-hidden">
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-landing-primary/10 to-landing-surface flex items-center justify-center">
          <span className="font-display text-5xl font-bold text-landing-primary/20">
            {post.title[0]}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {date && (
          <span className="flex items-center gap-1 text-xs text-landing-text-secondary">
            <Calendar className="h-3 w-3" /> {date}
          </span>
        )}
        <h3 className="mt-2 font-display text-base font-semibold text-white group-hover:text-landing-primary transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="mt-2 text-sm text-landing-text-secondary line-clamp-2 flex-1">
          {post.excerpt}
        </p>
        <span className="mt-4 flex items-center gap-1 text-xs text-landing-primary">
          Read more <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

export default function BlogPreviewSection() {
  const { data } = useQuery({
    queryKey: ["landing-blog-preview"],
    queryFn:  async () => {
      const { data } = await apiClient.get("/blog/posts?limit=3");
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // cache 5 min — landing page doesn't need live data
  });

  // Don't render the section at all if no posts exist yet
  if (!data?.posts?.length) return null;

  return (
    <section className="py-20 bg-landing-bg" id="blog">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-landing-primary">
              From Our Blog
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
              Insights & Updates
            </h2>
          </div>
          <Link
            to="/blog"
            className="flex items-center gap-1.5 text-sm text-landing-primary hover:text-landing-primary-hover"
          >
            View all posts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
