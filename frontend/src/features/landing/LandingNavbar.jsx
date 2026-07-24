import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

// Links without a real destination yet (Pricing, Blog, Changelog, Help
// Center, SDKs, Webhooks, Sandbox, API Status, Careers, Partners, Terms)
// are intentionally "#" — building a full marketing site's worth of
// sub-pages is well beyond "build the landing page". Links that map to
// something real (API Docs, the in-page FAQ once it ships) point there.
const menus = {
  Products: [
    { label: "Airtime", description: "Instant top-up across networks" },
    { label: "Data", description: "Cheap data bundles" },
    { label: "Bulk SMS", description: "Fast SMS delivery" },
    { label: "Bills", description: "Electricity & TV subscriptions" },
    { label: "Agent Services", description: "Earn from transactions" },
  ],
  Developers: [
    { label: "API Documentation", href: "#api" },
    { label: "SDKs" },
    { label: "Webhooks" },
    { label: "Sandbox" },
    { label: "API Status" },
  ],
  Resources: [{ label: "Pricing" }, { label: "FAQ", href: "#faq" }, { label: "Blog", href: "/blog" }, { label: "Changelog" }, { label: "Help Center" }],
  Company: [{ label: "About Us" }, { label: "Contact" }, { label: "Careers" }, { label: "Partners" }, { label: "Terms & Policies" }],
};

/** Collapsible section used inside the mobile Sheet */
function MobileMenuSection({ label, items }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between py-3 text-sm font-semibold text-white"
      >
        {label}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("h-4 w-4 text-white/60 transition-transform duration-200", open && "rotate-180")}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="flex flex-col pb-3 pl-2">
          {items.map((item) => (
            <a
              key={item.label}
              href={item.href || "#"}
              className="py-1.5 text-sm text-landing-text-secondary hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-white/10 bg-landing-bg/70 backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link to="/" className="font-display text-xl font-semibold text-white">
          Elite Hub
        </Link>

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {Object.entries(menus).map(([label, items]) => (
              <NavigationMenuItem key={label}>
                <NavigationMenuTrigger>{label}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[320px] gap-1 p-3">
                    {items.map((item) => (
                      <li key={item.label}>
                        <NavigationMenuLink asChild>
                          <a href={item.href || "#"} className="block rounded-lg p-3 hover:bg-white/5">
                            <p className="text-sm font-medium text-white">{item.label}</p>
                            {item.description && (
                              <p className="mt-0.5 text-xs text-landing-text-secondary">{item.description}</p>
                            )}
                          </a>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className="text-sm font-medium text-white/80 hover:text-white">
            Login
          </Link>
          <Button asChild className="bg-landing-primary hover:bg-landing-primary-hover">
            <Link to="/register">Get Started</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger className="text-white md:hidden">
            <Menu className="h-6 w-6" />
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col border-white/10 bg-landing-bg">
            <SheetHeader>
              <SheetTitle className="text-white">Menu</SheetTitle>
            </SheetHeader>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto py-2">
              {Object.entries(menus).map(([label, items]) => (
                <MobileMenuSection key={label} label={label} items={items} />
              ))}
            </div>

            {/* Auth buttons pinned to the bottom */}
            <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
              <SheetClose asChild>
                <Link to="/login" className="text-center text-sm font-medium text-white">
                  Login
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild className="bg-landing-primary hover:bg-landing-primary-hover">
                  <Link to="/register">Get Started</Link>
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
