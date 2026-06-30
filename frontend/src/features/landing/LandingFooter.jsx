import { Link } from "react-router-dom";
import { Twitter, Instagram, Linkedin } from "lucide-react";

const columns = [
  {
    title: "Products",
    links: [
      { label: "Airtime", href: "#" },
      { label: "Data", href: "#" },
      { label: "SMS", href: "#" },
      { label: "Bills", href: "#" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Docs", href: "#api" },
      { label: "Sandbox", href: "#" },
      { label: "SDKs", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
];

// Legal documents carry real weight and aren't placeholder marketing
// copy — linking these to fabricated Terms/Privacy/Refund text would risk
// shipping something that looks like a real legal policy but isn't. These
// stay as "#" until real legal documents exist to link to.
const legalLinks = [
  { label: "Terms", href: "#" },
  { label: "Privacy", href: "#" },
  { label: "Refund Policy", href: "#" },
];

// Handles from the business plan doc — included as styled placeholders;
// actually reserving/verifying these accounts is a business action, not
// something this build can do on your behalf.
const socials = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-landing-bg py-12">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="font-display text-xl font-semibold text-white">
              Elite Hub
            </Link>
            <p className="mt-3 max-w-xs text-sm text-landing-text-secondary">
              One Hub. Endless Connections. Reliable VTU, bulk SMS, bill payments, and developer APIs — all in one
              platform by De Elite Digitals.
            </p>
            <div className="mt-4 flex gap-3">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="rounded-full border border-white/10 p-2 text-white/60 hover:border-landing-primary/40 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-white">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-landing-text-secondary hover:text-white">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-sm font-semibold text-white">Legal</p>
            <ul className="mt-3 space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-landing-text-secondary hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-landing-text-secondary">
          © {new Date().getFullYear()} De Elite Digitals. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
