"use client";

import { useState } from "react";
import type { CriticalQuestion, Item } from "@/lib/types";
import type { ReachOption } from "./IntakeViews";

export type Phase = "intake" | "questions" | "done";

export interface IntakeAnalysisInput {
  clue: string;
  img: string;
  notes: string;
  reach: ReachOption;
}

export function useItemAnalysis(input: IntakeAnalysisInput) {
  const [phase, setPhase] = useState<Phase>("intake");
  const [busy, setBusy] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [questions, setQuestions] = useState<CriticalQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  async function analyze(extraAnswers?: Record<string, string>) {
    setBusy(true);
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clue: input.clue,
        photos: [input.img],
        notes: input.notes,
        answers: extraAnswers,
        fulfillmentOverride: input.reach,
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
    await analyze(answers);
    setPhase("done");
  }

  return {
    phase,
    setPhase,
    busy,
    item,
    setItem,
    questions,
    setQuestions,
    answers,
    setAnswers,
    analyze,
    submitAnswers,
  };
}
