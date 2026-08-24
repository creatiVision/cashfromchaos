import Link from "next/link";

export default function Hero() {
  return (
    <section className="scanline relative overflow-hidden rounded-3xl border border-edge bg-panel/60 px-5 py-12 text-center sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <span className="chip mx-auto mb-6 border-cash/40 text-cash">
          autonomous recommerce operator
        </span>
        <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Point your camera at things
          <br />
          you don’t want.
          <br />
          <span className="text-cash">Hermes sells them.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
          You only need to know one thing:{" "}
          <span className="text-ink">“I don’t want this.”</span> CashFromChaos handles the
          whole operation — analysis, listing, negotiation, payment and payout.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/intake" className="btn-cash">
            Sell something →
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            See the operation
          </Link>
          <Link href="/market" className="btn-ghost">
            Open buyer sandbox
          </Link>
        </div>
        <p className="mt-6 font-mono text-xs text-muted">
          “Thanks. Relax, enjoy your life. I’ll tell you when there’s a buyer.”
        </p>
      </div>
    </section>
  );
}
