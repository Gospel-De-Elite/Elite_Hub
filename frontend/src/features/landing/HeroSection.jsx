import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileCode } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-landing-bg pb-20 pt-32 md:pb-32 md:pt-40">
      {/* Subtle brand-colored glow behind the headline — restrained, not a
          full gradient background, per the landing doc's "avoid excessive
          gradients" brand guidance. */}
      <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-landing-primary/20 blur-[120px]" />

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Automate Airtime, Data &amp; SMS Delivery Across Nigeria.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-landing-text-secondary">
              Reliable VTU services, bulk SMS, utility bill payments and developer APIs — all in one powerful
              platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-landing-primary hover:bg-landing-primary-hover">
                <Link to="/register">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5">
                <a href="#api">
                  <FileCode className="mr-2 h-4 w-4" />
                  View API Docs
                </a>
              </Button>
            </div>
          </div>

          {/* Floating glass dashboard card mockup, per the landing doc's
              "Hero Visual" spec — the exact figures are illustrative copy
              from the brief, not pulled from real data (this is a logged-out
              marketing page, not the authenticated dashboard). */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-landing-card/80 p-6 shadow-2xl backdrop-blur-xl">
              <p className="text-sm text-landing-text-secondary">Today&apos;s Revenue</p>
              <p className="font-display text-3xl font-bold text-white">₦245,000</p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-landing-text-secondary">Transactions</p>
                  <p className="font-display text-lg font-semibold text-white">1,257</p>
                </div>
                <div>
                  <p className="text-xs text-landing-text-secondary">Success Rate</p>
                  <p className="font-display text-lg font-semibold text-white">99.8%</p>
                </div>
                <div>
                  <p className="text-xs text-landing-text-secondary">SMS Delivered</p>
                  <p className="font-display text-lg font-semibold text-white">12,450</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
