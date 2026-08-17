import { TrackingSearchForm } from "@/components/tracking-search-form";

export default function HomePage() {
  /** Deck + containers photo in `public/hero-cargo.png`; overlay ~40% tint so stacks/ships stay ~60% visibly strong */
  const heroBg =
    "linear-gradient(165deg, rgba(0, 18, 36, 0.42) 0%, rgba(0, 50, 80, 0.48) 45%, rgba(0, 32, 55, 0.55) 100%), url('/hero-cargo.png')";

  return (
    <section className="mx-auto flex max-w-lg flex-col gap-10 pb-20 sm:max-w-xl md:max-w-3xl">
      {/* Hero: ~60% viewport tall, full-bleed cargo ship + containers */}
      <div className="relative z-0">
        <div
          className="relative min-h-[50vh] overflow-hidden rounded-[1.375rem] border border-black/[0.08] shadow-xl ring-1 ring-black/5 dark:border-white/[0.08] dark:ring-white/10 sm:min-h-[55vh] md:min-h-[60vh]"
          style={{
            backgroundImage: heroBg,
            backgroundPosition: "center 35%",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat"
          }}
        >
          <div className="relative flex min-h-[50vh] flex-col justify-end space-y-4 px-6 pb-28 pt-12 sm:min-h-[55vh] sm:space-y-5 sm:px-9 sm:pb-24 sm:pt-14 md:min-h-[60vh] md:pb-[6.75rem] md:pt-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/95 sm:text-xs md:text-[13px]">
              GLOBAL MARINE LOGISTICS
            </p>
            <h1 className="max-w-xl text-[1.6rem] font-bold leading-snug tracking-tight text-white sm:text-3xl md:text-[2rem] lg:text-[2.25rem]">
              Professional Sea Cargo Tracking Platform
            </h1>
            <p className="max-w-xl text-[0.95rem] leading-relaxed text-white sm:text-base">
              Track every shipment with real-time simulation updates, vessel route progress, and delivery intelligence
              built for modern shipping operations.
            </p>
          </div>
        </div>

        {/* Overlap tracking card (marketing layout) */}
        <div className="relative z-10 -mt-14 px-3 sm:-mt-[4.75rem] sm:px-5 md:-mt-[5rem] md:px-6">
          <TrackingSearchForm
            variant="stacked"
            anchorId="track-shipment"
            className="rounded-[1.25rem] border-slate-200/95 p-6 shadow-xl ring-1 ring-slate-900/[0.04] dark:border-slate-700"
          />
        </div>
      </div>

      <div className="card mx-auto mt-4 w-full rounded-[1.25rem] border border-slate-200/95 p-7 shadow-lg dark:border-slate-700 md:mx-0 md:max-w-none">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">About Sea Cargo Tracker</h2>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-slate-600 dark:text-slate-300">
          Sea Cargo Tracker is a digital cargo-shipping experience built to mirror real-world marine logistics, including
          route visibility across the ocean, timeline milestones, and customer support operations—so every voyage feels
          connected from berth to final delivery.
        </p>
      </div>
    </section>
  );
}
