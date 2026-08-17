import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileMenu } from "@/components/profile-menu";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Sea Cargo Tracker | Live voyage simulation",
  description:
    "Track container voyages with Firestore, OpenStreetMap routing, berth timelines, and an operations admin — sea logistics only."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-bold tracking-tight text-marine-700 dark:text-marine-400">
                Sea Cargo Tracker
              </Link>
              <nav className="hidden items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
                <Link href="/#track-shipment" className="hover:text-marine-700 dark:hover:text-marine-400">
                  Track
                </Link>
                <Link href="/shipments" className="hover:text-marine-700 dark:hover:text-marine-400">
                  Shipments
                </Link>
                <Link href="/support" className="hover:text-marine-700 dark:hover:text-marine-400">
                  Support
                </Link>
                <Link href="/privacy" className="hover:text-marine-700 dark:hover:text-marine-400">
                  Privacy
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <ProfileMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
