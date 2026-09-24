import React from "react";
import { renderToString } from "react-dom/server";
import { useIntake } from "../useIntake";

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
