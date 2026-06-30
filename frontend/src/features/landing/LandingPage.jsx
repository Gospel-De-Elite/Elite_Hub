import LandingNavbar from "./LandingNavbar";
import HeroSection from "./HeroSection";
import TrustSection from "./TrustSection";
import ServicesSection from "./ServicesSection";
import DashboardPreviewSection from "./DashboardPreviewSection";
import ApiSection from "./ApiSection";
import WhyChooseUsSection from "./WhyChooseUsSection";
import TestimonialsSection from "./TestimonialsSection";
import FaqSection from "./FaqSection";
import FinalCtaSection from "./FinalCtaSection";
import LandingFooter from "./LandingFooter";

// Full assembly — Phase 12 complete. Every section from the landing page
// design doc is represented here, in spec order.
export default function LandingPage() {
  return (
    <div className="bg-landing-bg">
      <LandingNavbar />
      <HeroSection />
      <TrustSection />
      <ServicesSection />
      <DashboardPreviewSection />
      <ApiSection />
      <WhyChooseUsSection />
      <TestimonialsSection />
      <FaqSection />
      <FinalCtaSection />
      <LandingFooter />
    </div>
  );
}
