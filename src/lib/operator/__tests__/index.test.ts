describe("getOperator Factory Function", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("returns HermesBrain by default when OPERATOR_BRAIN is not set", () => {
    delete process.env.OPERATOR_BRAIN;
    let getOperatorFn: typeof import("../index").getOperator;
    jest.isolateModules(() => {
      getOperatorFn = require("../index").getOperator;
    });
    const operator = getOperatorFn!();
    expect(operator.name).toBe("hermes");
    expect(operator.constructor.name).toBe("HermesBrain");
  });

  it("returns FixtureBrain when OPERATOR_BRAIN='fixture'", () => {
    process.env.OPERATOR_BRAIN = "fixture";
    let getOperatorFn: typeof import("../index").getOperator;
    jest.isolateModules(() => {
      getOperatorFn = require("../index").getOperator;
    });
    const operator = getOperatorFn!();
    expect(operator.name).toBe("fixture");
    expect(operator.constructor.name).toBe("FixtureBrain");
  });

  it("returns HermesBrain when OPERATOR_BRAIN='llm'", () => {
    process.env.OPERATOR_BRAIN = "llm";
    let getOperatorFn: typeof import("../index").getOperator;
    jest.isolateModules(() => {
      getOperatorFn = require("../index").getOperator;
    });
    const operator = getOperatorFn!();
    expect(operator.name).toBe("hermes");
    expect(operator.constructor.name).toBe("HermesBrain");
  });

  it("returns HermesBrain when OPERATOR_BRAIN='hermes'", () => {
    process.env.OPERATOR_BRAIN = "hermes";
    let getOperatorFn: typeof import("../index").getOperator;
    jest.isolateModules(() => {
      getOperatorFn = require("../index").getOperator;
    });
    const operator = getOperatorFn!();
    expect(operator.name).toBe("hermes");
    expect(operator.constructor.name).toBe("HermesBrain");
  });

  it("handles case insensitivity e.g. OPERATOR_BRAIN='FIXTURE'", () => {
    process.env.OPERATOR_BRAIN = "FIXTURE";
    let getOperatorFn: typeof import("../index").getOperator;
    jest.isolateModules(() => {
      getOperatorFn = require("../index").getOperator;
    });
    const operator = getOperatorFn!();
    expect(operator.name).toBe("fixture");
    expect(operator.constructor.name).toBe("FixtureBrain");
  });

  it("falls back to HermesBrain for unknown mode e.g. OPERATOR_BRAIN='unknown'", () => {
    process.env.OPERATOR_BRAIN = "unknown";
    let getOperatorFn: typeof import("../index").getOperator;
    jest.isolateModules(() => {
      getOperatorFn = require("../index").getOperator;
    });
    const operator = getOperatorFn!();
    expect(operator.name).toBe("hermes");
    expect(operator.constructor.name).toBe("HermesBrain");
  });

  it("caches and returns the same instance on subsequent calls", () => {
    process.env.OPERATOR_BRAIN = "fixture";
    let getOperatorFn: typeof import("../index").getOperator;
    jest.isolateModules(() => {
      getOperatorFn = require("../index").getOperator;
    });
    const op1 = getOperatorFn!();
    // Change env variable after first call
    process.env.OPERATOR_BRAIN = "hermes";
    const op2 = getOperatorFn!();
    expect(op1).toBe(op2);
    expect(op2.name).toBe("fixture");
    expect(op2.constructor.name).toBe("FixtureBrain");
  });
});
