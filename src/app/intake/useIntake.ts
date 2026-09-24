"use client";

import { useRef, useState } from "react";
import type { CriticalQuestion, Item } from "@/lib/types";
import type { ReachOption, SampleItem } from "./IntakeViews";

export type Phase = "intake" | "questions" | "done";

export function useIntake() {
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

  return {
    // State
    clue,
    setClue,
    img,
    setImg,
    notes,
    setNotes,
    reach,
    setReach,
    phase,
    setPhase,
    busy,
    item,
    questions,
    answers,
    setAnswers,
    shotTaken,
    cameraRef,
    // Actions
    onCapture,
    onSelectSample,
    analyze,
    submitAnswers,
  };
}
