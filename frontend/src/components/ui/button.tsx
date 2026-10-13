import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva("button", {
  variants: {
    variant: { primary: "button-primary", secondary: "button-secondary", ghost: "button-ghost", dark: "button-dark" },
    size: { default: "", small: "button-small", icon: "button-icon" },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

export function Button({ className, variant, size, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
