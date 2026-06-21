import * as React from "react";
import { cn } from "@/lib/utils";

const Alert = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      "relative w-full rounded-lg border p-4 text-sm",
      variant === "destructive"
        ? "border-destructive/50 bg-destructive/10 text-destructive"
        : "border-border bg-secondary text-foreground",
      className
    )}
    {...props}
  />
));
Alert.displayName = "Alert";

export { Alert };
