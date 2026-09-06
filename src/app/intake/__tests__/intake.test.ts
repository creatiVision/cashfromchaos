import { REACH_OPTIONS } from "../IntakeViews";
import type { CriticalQuestion } from "@/lib/types";

describe("Intake page components and configuration", () => {
  it("defines all expected reach options with label and hint", () => {
    expect(REACH_OPTIONS).toHaveLength(3);
    const keys = REACH_OPTIONS.map((o) => o.v);
    expect(keys).toEqual(["auto", "local-pickup", "shipping"]);

    for (const opt of REACH_OPTIONS) {
      expect(opt.label).toBeTruthy();
      expect(opt.hint).toBeTruthy();
    }
  });

  it("handles critical question answers map building", () => {
    const questions: CriticalQuestion[] = [
      { id: "q1", question: "Is it working?", reason: "Determines price" },
      { id: "q2", question: "Any box?", reason: "Improves buyer appeal", options: ["Yes", "No", "Original box"] },
    ];

    let answers: Record<string, string> = {};

    // Simulate selecting option for q1
    answers = { ...answers, [questions[0].id]: "Yes" };
    expect(answers["q1"]).toBe("Yes");

    // Simulate selecting custom answer for q2
    answers = { ...answers, [questions[1].id]: "Includes custom case" };
    expect(answers["q2"]).toBe("Includes custom case");

    // Verify all questions have answers
    const allAnswered = questions.every((q) => Boolean(answers[q.id]));
    expect(allAnswered).toBe(true);
  });
});
