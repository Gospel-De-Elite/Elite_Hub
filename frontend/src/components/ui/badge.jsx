import { cn } from "@/lib/utils";

const variants = {
  success: "bg-emerald-500/10 text-emerald-500",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-amber-500/10 text-amber-500",
  default: "bg-secondary text-muted-foreground",
};

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
