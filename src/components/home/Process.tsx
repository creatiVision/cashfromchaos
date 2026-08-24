const LOOP = ["Camera", "Understand", "List", "Negotiate", "Paid", "Payout"];

const STEPS = [
  ["Point", "Send photos + a one-line clue: “I want to sell this.”"],
  ["Understand", "Hermes IDs the item, asks only the critical questions."],
  ["Route", "It picks the right marketplace — not just the default one."],
  ["Negotiate", "Bounded by your policy: floor, counters, escalation."],
  ["Collect", "Stripe-powered held payment, released on delivery."],
  ["Payout", "You just ship it. The net lands. Done."],
];

export default function Process() {
  return (
    <section>
      <h2 className="mb-6 text-center text-sm font-bold uppercase tracking-widest text-muted">
        Minimal human clue · maximal autonomous operation
      </h2>
      {/* Mobile: the operator loop at a glance — no walls of text. */}
      <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 sm:hidden">
        {LOOP.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="chip border-cash/30 text-cash">{s}</span>
            {i < LOOP.length - 1 && <span className="text-cash">→</span>}
          </span>
        ))}
      </div>
      {/* Desktop: the detailed step cards. */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map(([t, d], i) => (
          <div key={t} className="panel p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-cash/15 font-mono text-xs text-cash">
                {i + 1}
              </span>
              <span className="font-semibold">{t}</span>
            </div>
            <p className="text-sm text-muted">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
