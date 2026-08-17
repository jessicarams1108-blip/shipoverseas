import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h3 className="text-4xl font-extrabold tracking-tight text-ocean-700 dark:text-ocean-400">SEACARGOTRACKER</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Global cargo visibility with modern sea-shipping tracking, support, and delivery intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-6 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4 dark:text-slate-200">
          <div className="space-y-1.5">
            <p className="mb-2 font-semibold uppercase tracking-wide text-slate-500">Helpful Links</p>
            <FooterLink href="/support" label="Contact Support" />
            <FooterLink href="/shipments" label="Fleet overview" />
            <FooterLink href="/settings" label="Account Settings" />
            <FooterLink href="/privacy" label="Privacy & Security" />
          </div>
          <div className="space-y-1.5">
            <p className="mb-2 font-semibold uppercase tracking-wide text-slate-500">Operations</p>
            <FooterLink href="/" label="Track a shipment" />
            <FooterLink href="/admin" label="Admin console" />
            <FooterLink href="/" label="Port network" />
            <FooterLink href="/" label="Carrier partners" />
          </div>
          <div className="space-y-1.5">
            <p className="mb-2 font-semibold uppercase tracking-wide text-slate-500">Voyage tools</p>
            <FooterLink href="/" label="Route monitoring" />
            <FooterLink href="/" label="Berth & customs" />
            <FooterLink href="/" label="ETA intelligence" />
            <FooterLink href="/" label="Notifications (mock)" />
          </div>
          <div className="space-y-1.5">
            <p className="mb-2 font-semibold uppercase tracking-wide text-slate-500">Legal</p>
            <FooterLink href="/privacy" label="Privacy Policy" />
            <FooterLink href="/" label="Terms of Use" />
            <FooterLink href="/" label="Fair Access Policy" />
            <FooterLink href="/" label="Accessibility Statement" />
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <p>Copyright © {new Date().getFullYear()} Sea Cargo Tracker. All rights reserved.</p>
          <p className="mt-2">Follow us: Facebook · Instagram · X · YouTube</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block leading-6 hover:text-ocean-700 dark:hover:text-ocean-400">
      {label}
    </Link>
  );
}
