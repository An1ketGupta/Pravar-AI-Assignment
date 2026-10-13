import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadFlow — Your leads, in focus",
  description: "A thoughtful workspace for your leads, conversations, and follow-ups.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
