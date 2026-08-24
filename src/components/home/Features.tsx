export default function Features() {
  return (
    <section className="panel grid gap-6 p-7 md:grid-cols-3">
      <div>
        <div className="label">The moat</div>
        <p className="mt-1 text-sm text-muted">
          Not “AI writes listings.” That’s commodity. This is{" "}
          <span className="text-ink">policy-bound autonomous commerce over messy,
          real-world physical inventory</span>{" "}
          — pricing, scam risk, logistics, custody, payout.
        </p>
      </div>
      <div>
        <div className="label">It’s opinionated</div>
        <p className="mt-1 text-sm text-muted">
          It decides, it doesn’t list five options. “Don’t ship this chair. Local pickup only. List
          at €35, accept €25+, ignore buyers asking for shipping.”
        </p>
      </div>
      <div>
        <div className="label">Earns · spends · operates</div>
        <p className="mt-1 text-sm text-muted">
          Earns buyer payment via Stripe. Spends on shipping labels within policy. Runs the whole
          op: listing, negotiation, support, logistics, P&amp;L.
        </p>
      </div>
    </section>
  );
}
