export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-marine-700 dark:text-marine-400">Legal</p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          This policy explains what data Sea Cargo Tracker collects, why we collect it, and how we protect it.
        </p>
      </header>

      <div className="card space-y-5">

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">Data We Collect</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <li>Account information: name, email, and UID.</li>
            <li>Shipment tracking data you create or manage in the simulation.</li>
            <li>Support messages you submit through the support chat page.</li>
            <li>Preference settings such as notification and display options.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">How We Use Data</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <li>Authenticate your account and keep you signed in securely.</li>
            <li>Display shipment tracking information and progress updates.</li>
            <li>Route support complaints to admin and deliver responses.</li>
            <li>Store your settings so your experience stays personalized.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">Security and Access</h3>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Data is stored in Firebase services with access restricted by authentication and Firestore security rules.
            Admin-only features are limited to authorized email accounts.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">Your Controls</h3>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            You can update your account details, request password reset, and delete your account from the Account page.
          </p>
        </section>
      </div>
    </section>
  );
}
