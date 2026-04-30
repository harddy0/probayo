import Link from "next/link";

export default async function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-6 py-8 text-zinc-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_30%),radial-gradient(circle_at_right,_rgba(255,255,255,0.08),_transparent_24%),linear-gradient(135deg,_rgba(24,24,27,0.98),_rgba(9,9,11,1))]" />
      <div className="absolute left-10 top-14 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute right-12 top-20 h-52 w-52 rounded-full bg-white/5 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 px-6 py-10 shadow-2xl shadow-black/30 backdrop-blur sm:px-8 lg:px-10">
        <section className="flex w-full flex-col items-start justify-center max-w-2xl">
          <div className="flex w-full items-center justify-between text-sm text-zinc-500">
            <span>Probayo system</span>
            <span>Support portal</span>
          </div>

          <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.45em] text-zinc-500">
              Support access
            </p>

            <h1 className="mt-5 max-w-xl text-5xl font-semibold tracking-tight text-white md:text-6xl">
              Support portal for device issues.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300 md:text-lg">
              Short, practical access point for login, requests, and problem
              resolution.
            </p>

            <p className="mt-6 max-w-lg text-sm leading-6 text-zinc-500">
              For troubleshooting, service requests, and device support.
            </p>

            <Link
              href="/login"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-r from-white via-zinc-100 to-zinc-200 px-6 text-sm font-medium text-zinc-950 shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:from-zinc-50 hover:to-white"
            >
              Open login
            </Link>
          </div>
        </section>

        <div className="pointer-events-none hidden flex-1 lg:block" />
      </div>
    </main>
  );
}
