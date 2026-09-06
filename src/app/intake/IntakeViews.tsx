import type { CriticalQuestion, Item } from "@/lib/types";

export function IntakeHeader() {
  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight">Sell something</h1>
      <p className="mt-1 text-muted">
        One clue + a photo. Hermes does the rest. That’s the whole job.
      </p>
    </div>
  );
}

export interface CameraCaptureProps {
  cameraRef: React.RefObject<HTMLInputElement>;
  img: string;
  shotTaken: boolean;
  onCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CameraCapture({
  cameraRef,
  img,
  shotTaken,
  onCapture,
}: CameraCaptureProps) {
  return (
    <div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onCapture}
        className="hidden"
      />
      <label className="label">Point at the thing you don’t want</label>
      {shotTaken ? (
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="mt-2 flex w-full flex-col items-center justify-center gap-3 rounded-sm border-2 border-cash bg-cash/5 p-3"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="Your item" className="h-52 w-full rounded-sm object-cover" />
          <span className="text-sm font-bold text-cashdim">Photo taken · tap to retake</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="relative mt-2 flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-sm bg-ink py-14 text-white transition active:brightness-110"
        >
          <span className="absolute left-0 top-0 h-2 w-2 bg-cash" />
          <span className="text-5xl">📷</span>
          <span className="text-lg font-black">Open camera</span>
          <span className="px-6 text-center text-xs text-white/60">
            Snap the item — that’s all Hermes needs to start
          </span>
        </button>
      )}
    </div>
  );
}

export interface SampleItem {
  clue: string;
  img: string;
}

export interface DemoItemPickerProps {
  samples: SampleItem[];
  currentImg: string;
  onSelectSample: (sample: SampleItem) => void;
}

export function DemoItemPicker({
  samples,
  currentImg,
  onSelectSample,
}: DemoItemPickerProps) {
  return (
    <details className="group">
      <summary className="label cursor-pointer list-none select-none">
        No camera? Use a demo item ▾
      </summary>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {samples.map((s) => (
          <button
            key={s.img}
            type="button"
            onClick={() => onSelectSample(s)}
            className={`overflow-hidden rounded-sm border ${
              currentImg === s.img ? "border-cash shadow-glow" : "border-edge"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.img} alt={s.clue} className="h-16 w-full object-cover" />
          </button>
        ))}
      </div>
    </details>
  );
}

export type ReachOption = "auto" | "shipping" | "local-pickup";

export interface ReachSelectorProps {
  reach: ReachOption;
  onChange: (value: ReachOption) => void;
}

export const REACH_OPTIONS: Array<{ v: ReachOption; label: string; hint: string }> = [
  { v: "auto", label: "Auto", hint: "Hermes decides" },
  { v: "local-pickup", label: "Pickup only", hint: "No shipping" },
  { v: "shipping", label: "Ship only", hint: "No pickup" },
];

export function ReachSelector({ reach, onChange }: ReachSelectorProps) {
  return (
    <div>
      <label className="label">Reach (optional)</label>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {REACH_OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-sm border p-2 text-left ${
              reach === o.v ? "border-cash shadow-glow" : "border-edge"
            }`}
          >
            <span className="block text-sm font-bold">{o.label}</span>
            <span className="block text-xs text-muted">{o.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export interface IntakePhaseViewProps {
  clue: string;
  setClue: (clue: string) => void;
  img: string;
  notes: string;
  setNotes: (notes: string) => void;
  reach: ReachOption;
  setReach: (reach: ReachOption) => void;
  shotTaken: boolean;
  busy: boolean;
  cameraRef: React.RefObject<HTMLInputElement>;
  samples: SampleItem[];
  onCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectSample: (sample: SampleItem) => void;
  onAnalyze: () => void;
}

export function IntakePhaseView({
  clue,
  setClue,
  img,
  notes,
  setNotes,
  reach,
  setReach,
  shotTaken,
  busy,
  cameraRef,
  samples,
  onCapture,
  onSelectSample,
  onAnalyze,
}: IntakePhaseViewProps) {
  return (
    <div className="panel space-y-5 p-6">
      <CameraCapture
        cameraRef={cameraRef}
        img={img}
        shotTaken={shotTaken}
        onCapture={onCapture}
      />

      <div>
        <label className="label">What is it? (one line)</label>
        <input
          autoFocus
          value={clue}
          onChange={(e) => setClue(e.target.value)}
          placeholder="e.g. “I want to sell this guitar pedal”"
          className="mt-2 w-full rounded-sm border border-edge bg-panel2 px-4 py-3 text-ink outline-none focus:border-cash"
        />
      </div>

      <DemoItemPicker
        samples={samples}
        currentImg={img}
        onSelectSample={onSelectSample}
      />

      <div>
        <label className="label">Anything to add? (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional context — condition, accessories, anything obvious."
          className="mt-2 w-full rounded-sm border border-edge bg-panel2 px-4 py-3 text-sm text-ink outline-none focus:border-cash"
        />
      </div>

      <ReachSelector reach={reach} onChange={setReach} />

      <button
        disabled={!clue || busy}
        onClick={onAnalyze}
        className="btn-cash w-full disabled:opacity-40"
      >
        {busy ? "Hermes is analyzing…" : "Hand it to Hermes →"}
      </button>
    </div>
  );
}

export interface QuestionsPhaseViewProps {
  questions: CriticalQuestion[];
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  busy: boolean;
  onSubmitAnswers: () => void;
}

export function QuestionsPhaseView({
  questions,
  answers,
  setAnswers,
  busy,
  onSubmitAnswers,
}: QuestionsPhaseViewProps) {
  return (
    <div className="panel space-y-5 p-6">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulseline rounded-full bg-cash" />
        <p className="text-sm text-muted">
          Hermes only needs <span className="text-ink">{questions.length}</span> critical
          detail{questions.length > 1 ? "s" : ""} before going live.
        </p>
      </div>
      {questions.map((q) => {
        const opts = q.options ?? ["Yes", "No"];
        const current = answers[q.id];
        const isCustom = current !== undefined && !opts.includes(current);
        return (
          <div key={q.id} className="panel-2 p-4">
            <p className="font-medium">{q.question}</p>
            <p className="mt-1 text-xs text-muted">Why it matters: {q.reason}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {opts.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                  className={`chip cursor-pointer ${
                    current === opt ? "border-cash text-cash" : ""
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input
              value={isCustom ? current : ""}
              onChange={(e) => {
                const v = e.target.value;
                setAnswers((a) => {
                  const next = { ...a };
                  if (v.trim()) next[q.id] = v;
                  else delete next[q.id];
                  return next;
                });
              }}
              placeholder="…or type your own answer"
              className={`mt-2 w-full rounded-sm border bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-cash ${
                isCustom ? "border-cash" : "border-edge"
              }`}
            />
          </div>
        );
      })}
      <button
        disabled={busy || Object.keys(answers).length < questions.length}
        onClick={onSubmitAnswers}
        className="btn-cash w-full disabled:opacity-40"
      >
        {busy ? "Updating plan…" : "Confirm — go live"}
      </button>
    </div>
  );
}

export interface DonePhaseViewProps {
  item: Item;
  onSeeOperation: () => void;
  onViewListing: () => void;
}

export function DonePhaseView({
  item,
  onSeeOperation,
  onViewListing,
}: DonePhaseViewProps) {
  return (
    <div className="panel space-y-4 p-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cash/15 text-2xl">
        ✅
      </div>
      <h2 className="text-xl font-bold">Relax. I’ll handle it.</h2>
      <p className="text-sm text-muted">
        {item.analysis.title} is live on{" "}
        <span className="text-ink">{item.plan.primary.name}</span>. I’ll ping you when
        there’s a buyer.
      </p>
      <div className="flex justify-center gap-3">
        <button onClick={onSeeOperation} className="btn-cash">
          See the operation →
        </button>
        <button onClick={onViewListing} className="btn-ghost">
          View buyer listing
        </button>
      </div>
    </div>
  );
}
