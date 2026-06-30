import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-landing-surface py-20">
      <div className="absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-landing-primary/15 blur-[120px]" />

      <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
        <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
          Start Sending SMS And Processing Transactions Today.
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-landing-primary hover:bg-landing-primary-hover">
            <Link to="/register">
              Create Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5">
            <a href="#contact">Contact Sales</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
