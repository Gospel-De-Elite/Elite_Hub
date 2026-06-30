import { useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

// PLACEHOLDER CONTENT — these are illustrative, not real customer quotes.
// The landing doc calls for testimonials from a Business Owner, School
// Administrator, VTU Agent, and Developer, but inventing fake customer
// names/quotes presented as genuine testimonials would be a fabricated
// social-proof claim, not just a UI placeholder — so these are written as
// clearly generic illustrative text, not attributed to any specific named
// person. Swap in real customer quotes (with permission) before launch.
const testimonials = [
  {
    role: "Business Owner",
    quote:
      "[Replace with a real customer quote] — describing how Elite Hub simplified paying for business utilities and recharging staff lines.",
  },
  {
    role: "School Administrator",
    quote:
      "[Replace with a real customer quote] — describing using bulk SMS to reach parents and staff reliably.",
  },
  {
    role: "VTU Agent",
    quote:
      "[Replace with a real customer quote] — describing reseller pricing and commission earnings on the platform.",
  },
  {
    role: "Developer",
    quote:
      "[Replace with a real customer quote] — describing integrating the API into their own product.",
  },
];

export default function TestimonialsSection() {
  const [index, setIndex] = useState(0);
  const current = testimonials[index];

  function next() {
    setIndex((i) => (i + 1) % testimonials.length);
  }
  function prev() {
    setIndex((i) => (i - 1 + testimonials.length) % testimonials.length);
  }

  return (
    <section className="bg-landing-bg py-20">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <h2 className="text-center font-display text-2xl font-semibold text-white md:text-3xl">
          What Our Customers Say
        </h2>

        <div className="mt-12 rounded-2xl border border-white/10 bg-landing-card p-8 text-center">
          <Quote className="mx-auto h-8 w-8 text-landing-primary/50" />
          <p className="mt-4 text-lg italic text-white">{current.quote}</p>
          <p className="mt-4 text-sm font-medium text-landing-text-secondary">{current.role}</p>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={prev}
              aria-label="Previous testimonial"
              className="rounded-full border border-white/10 p-2 text-white/70 hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-1.5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === index ? "bg-landing-primary" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              aria-label="Next testimonial"
              className="rounded-full border border-white/10 p-2 text-white/70 hover:bg-white/5 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
