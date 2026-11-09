import { APP_NAME } from "@/lib/config";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-[100dvh] flex-col">
      <header className="relative overflow-hidden bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-600 px-6 pb-16 pt-[max(env(safe-area-inset-top),2.5rem)] text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-white/5" />
        <div className="relative mx-auto w-full max-w-md">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="h-9 w-9 rounded-lg ring-2 ring-white/30" />
            <span className="text-sm font-semibold uppercase tracking-wider text-teal-50">
              {APP_NAME}
            </span>
          </div>
          <h1 className="mt-6 text-3xl font-bold leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-teal-50/90">{subtitle}</p>}
        </div>
      </header>
      <section className="relative -mt-8 flex-1 rounded-t-3xl bg-stone-50 px-6 pb-[max(env(safe-area-inset-bottom),2rem)] pt-8">
        <div className="mx-auto w-full max-w-md">
          {children}
          {footer && <div className="mt-8 text-center text-sm text-stone-600">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
