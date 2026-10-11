import React from "react";
import { renderToString } from "react-dom/server";
import { useIntake } from "../useIntake";
import { useIntakeForm } from "../useIntakeForm";
import { useItemAnalysis } from "../useItemAnalysis";

describe("useIntake hook", () => {
  it("initializes with default state values and renders intake view correctly", () => {
    let hookResult: ReturnType<typeof useIntake> | undefined;

    function TestComponent() {
      const hook = useIntake();
      hookResult = hook;
      return <div data-phase={hook.phase}>{hook.clue}</div>;
    }

    renderToString(<TestComponent />);

    expect(hookResult).toBeDefined();
    expect(hookResult?.clue).toBe("");
    expect(hookResult?.img).toBe("/img/generic.jpg");
    expect(hookResult?.notes).toBe("");
    expect(hookResult?.reach).toBe("auto");
    expect(hookResult?.phase).toBe("intake");
    expect(hookResult?.busy).toBe(false);
    expect(hookResult?.item).toBeNull();
    expect(hookResult?.questions).toEqual([]);
    expect(hookResult?.answers).toEqual({});
    expect(hookResult?.shotTaken).toBe(false);
  });

  it("handles sample item selection logic", () => {
    let hookResult: ReturnType<typeof useIntake> | undefined;

    function TestComponent() {
      const hook = useIntake();
      hookResult = hook;
      return <div>{hook.clue}</div>;
    }

    renderToString(<TestComponent />);

    expect(hookResult).toBeDefined();
    if (hookResult) {
      hookResult.onSelectSample({
        clue: "I want to sell this guitar pedal",
        img: "/img/pedal.jpg",
      });
      // Verification of handler execution
    }
  });
});

describe("useIntakeForm hook", () => {
  it("initializes form state correctly", () => {
    let formResult: ReturnType<typeof useIntakeForm> | undefined;

    function TestComponent() {
      const form = useIntakeForm();
      formResult = form;
      return <div>{form.clue}</div>;
    }

    renderToString(<TestComponent />);

    expect(formResult).toBeDefined();
    expect(formResult?.clue).toBe("");
    expect(formResult?.img).toBe("/img/generic.jpg");
    expect(formResult?.notes).toBe("");
    expect(formResult?.reach).toBe("auto");
    expect(formResult?.shotTaken).toBe(false);
    expect(formResult?.cameraRef).toBeDefined();
  });
});

describe("useItemAnalysis hook", () => {
  it("initializes item analysis state correctly", () => {
    let analysisResult: ReturnType<typeof useItemAnalysis> | undefined;

    function TestComponent() {
      const analysis = useItemAnalysis({
        clue: "Test item",
        img: "/img/generic.jpg",
        notes: "Some notes",
        reach: "auto",
      });
      analysisResult = analysis;
      return <div data-phase={analysis.phase}>{analysis.phase}</div>;
    }

    renderToString(<TestComponent />);

    expect(analysisResult).toBeDefined();
    expect(analysisResult?.phase).toBe("intake");
    expect(analysisResult?.busy).toBe(false);
    expect(analysisResult?.item).toBeNull();
    expect(analysisResult?.questions).toEqual([]);
    expect(analysisResult?.answers).toEqual({});
  });
});
