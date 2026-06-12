import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveAdminActor } from "@/features/accounts/services/permissions/actor";
import { canAccessAdminSettings } from "@/features/accounts/services/permissions/resolve";

export const metadata: Metadata = { title: "Settings – Admin" };

interface SettingRow {
  label: string;
  key: string;
  value: string;
  hint?: string;
  type?: string;
}

const SETTINGS: SettingRow[] = [
  {
    label: "Site owner",
    key: "NEXT_PUBLIC_SITE_OWNER",
    value: process.env.NEXT_PUBLIC_SITE_OWNER ?? "",
    hint: "Displayed in page title and hero",
  },
  {
    label: "Contact email",
    key: "NEXT_PUBLIC_CONTACT_EMAIL",
    value: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
    type: "email",
  },
  {
    label: "GitHub user",
    key: "NEXT_PUBLIC_GITHUB_USER",
    value: process.env.NEXT_PUBLIC_GITHUB_USER ?? "",
    hint: "Used for repo fetching",
  },
  {
    label: "Featured work URL",
    key: "NEXT_PUBLIC_FEATURED_WORK",
    value: process.env.NEXT_PUBLIC_FEATURED_WORK ?? "",
    type: "url",
  },
];

export default async function SettingsPage() {
  const actor = await resolveAdminActor();
  const allowed =
    actor.kind === "full" ||
    (actor.kind === "account" && canAccessAdminSettings(actor.slugs, actor.username));
  if (!allowed) redirect("/admin");

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">
          Configuration
        </p>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Site config */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-4">
            Site
          </p>
          <div className="glass rounded-xl divide-y divide-white/5">
            {SETTINGS.map(({ label, key, value, hint, type }) => (
              <div key={key} className="px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-8">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-[11px] font-mono text-gray-600 mt-0.5">{key}</p>
                    {hint && (
                      <p className="text-[11px] text-gray-700 mt-1">{hint}</p>
                    )}
                  </div>
                  <input
                    type={type ?? "text"}
                    defaultValue={value}
                    disabled
                    className="admin-input w-full sm:w-64 shrink-0 opacity-60 cursor-not-allowed"
                    title="Edit in .env.local"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-700">
            These values are read from <span className="font-mono">.env.local</span>. Edit the file
            and restart the server to apply changes.
          </p>
        </section>

        {/* Auth section */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-4">
            Authentication
          </p>
          <div className="glass rounded-xl divide-y divide-white/5">
            {[
              { label: "Admin password", key: "ADMIN_PASSWORD", hint: "Hashed on server, never exposed" },
              { label: "Session secret", key: "ADMIN_SESSION_SECRET", hint: "HMAC-SHA256 signing key" },
            ].map(({ label, key, hint }) => (
              <div key={key} className="px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-8">
                  <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-[11px] font-mono text-gray-600 mt-0.5">{key}</p>
                    <p className="text-[11px] text-gray-700 mt-1">{hint}</p>
                  </div>
                  <input
                    type="password"
                    defaultValue="••••••••••••"
                    disabled
                    className="admin-input w-full sm:w-64 shrink-0 opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-red-800 mb-4">
            Danger zone
          </p>
          <div className="border border-red-900/40 rounded-xl p-5">
            <p className="text-sm font-medium text-white mb-1">Rebuild site cache</p>
            <p className="text-[12px] text-gray-600 mb-4">
              Triggers a full revalidation of all cached GitHub data.
            </p>
            <button type="button" className="admin-btn admin-btn--danger admin-btn--md" disabled>
              Revalidate cache
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
