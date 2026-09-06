"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { CriticalQuestion, Item } from "@/lib/types";
import {
  DonePhaseView,
  IntakeHeader,
  IntakePhaseView,
  QuestionsPhaseView,
  type ReachOption,
  type SampleItem,
} from "./IntakeViews";

const SAMPLE: SampleItem[] = [
  { clue: "I want to sell these Pokémon cards", img: "/img/pokemon.jpg" },
  { clue: "I want to sell this guitar pedal", img: "/img/pedal.jpg" },
  { clue: "I want to sell this chair", img: "/img/furniture.jpg" },
  { clue: "I want to sell this kids stroller", img: "/img/stroller.jpg" },
];

type Phase = "intake" | "questions" | "done";

export default function IntakePage() {
  const router = useRouter();
  const [clue, setClue] = useState("");
  const [img, setImg] = useState<string>("/img/generic.jpg");
  const [notes, setNotes] = useState("");
  const [reach, setReach] = useState<ReachOption>("auto");
  const [phase, setPhase] = useState<Phase>("intake");
  const [busy, setBusy] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [questions, setQuestions] = useState<CriticalQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [shotTaken, setShotTaken] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);

  function onCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImg(String(reader.result));
      setShotTaken(true);
    };
    reader.readAsDataURL(file);
  }

  function onSelectSample(s: SampleItem) {
    setImg(s.img);
    setShotTaken(true);
    if (!clue) setClue(s.clue);
  }

  async function analyze(extraAnswers?: Record<string, string>) {
    setBusy(true);
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Re-submitting with answers? Reuse the existing item id so we update it
      // in place instead of creating a duplicate entry.
      body: JSON.stringify({
        clue,
        photos: [img],
        notes,
        answers: extraAnswers,
        fulfillmentOverride: reach,
        id: extraAnswers ? item?.id : undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return;
    const it: Item = data.item;
    setItem(it);
    if (it.analysis.missingInfo.length && !extraAnswers) {
      setQuestions(it.analysis.missingInfo);
      setPhase("questions");
    } else {
      setPhase("done");
    }
  }

  async function submitAnswers() {
    // Re-run analysis with answers so price/policy reflect them.
    await analyze(answers);
    setPhase("done");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <IntakeHeader />

      {phase === "intake" && (
        <IntakePhaseView
          clue={clue}
          setClue={setClue}
          img={img}
          notes={notes}
          setNotes={setNotes}
          reach={reach}
          setReach={setReach}
          shotTaken={shotTaken}
          busy={busy}
          cameraRef={cameraRef}
          samples={SAMPLE}
          onCapture={onCapture}
          onSelectSample={onSelectSample}
          onAnalyze={() => analyze()}
        />
      )}

      {phase === "questions" && (
        <QuestionsPhaseView
          questions={questions}
          answers={answers}
          setAnswers={setAnswers}
          busy={busy}
          onSubmitAnswers={submitAnswers}
        />
      )}

      {phase === "done" && item && (
        <DonePhaseView
          item={item}
          onSeeOperation={() => router.push(`/item/${item.id}`)}
          onViewListing={() => router.push(`/market/${item.id}`)}
        />
      )}
    </div>
  );
}
