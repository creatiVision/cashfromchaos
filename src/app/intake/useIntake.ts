"use client";

import { useIntakeForm } from "./useIntakeForm";
import { useItemAnalysis, type Phase } from "./useItemAnalysis";

export type { Phase };

export function useIntake() {
  const form = useIntakeForm();
  const analysis = useItemAnalysis({
    clue: form.clue,
    img: form.img,
    notes: form.notes,
    reach: form.reach,
  });

  return {
    ...form,
    ...analysis,
  };
}
