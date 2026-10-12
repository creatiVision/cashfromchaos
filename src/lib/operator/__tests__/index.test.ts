import { getOperator, resetOperatorCache } from "../index";

describe("getOperator Factory Function", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    resetOperatorCache();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("returns HermesBrain by default when OPERATOR_BRAIN is not set", () => {
    delete process.env.OPERATOR_BRAIN;
    const operator = getOperator();
    expect(operator.name).toBe("hermes");
    expect(operator.constructor.name).toBe("HermesBrain");
  });

  it("returns FixtureBrain when OPERATOR_BRAIN='fixture'", () => {
    process.env.OPERATOR_BRAIN = "fixture";
    const operator = getOperator();
    expect(operator.name).toBe("fixture");
    expect(operator.constructor.name).toBe("FixtureBrain");
  });

  it("returns HermesBrain when OPERATOR_BRAIN='llm'", () => {
    process.env.OPERATOR_BRAIN = "llm";
    const operator = getOperator();
    expect(operator.name).toBe("hermes");
    expect(operator.constructor.name).toBe("HermesBrain");
  });

  it("returns HermesBrain when OPERATOR_BRAIN='hermes'", () => {
    process.env.OPERATOR_BRAIN = "hermes";
    const operator = getOperator();
    expect(operator.name).toBe("hermes");
    expect(operator.constructor.name).toBe("HermesBrain");
  });

  it("handles case insensitivity e.g. OPERATOR_BRAIN='FIXTURE'", () => {
    process.env.OPERATOR_BRAIN = "FIXTURE";
    const operator = getOperator();
    expect(operator.name).toBe("fixture");
    expect(operator.constructor.name).toBe("FixtureBrain");
  });

  it("handles leading and trailing whitespace e.g. OPERATOR_BRAIN='  fixture  '", () => {
    process.env.OPERATOR_BRAIN = "  fixture  ";
    const operator = getOperator();
    expect(operator.name).toBe("fixture");
    expect(operator.constructor.name).toBe("FixtureBrain");
  });

  it("falls back to HermesBrain for empty string OPERATOR_BRAIN=''", () => {
    process.env.OPERATOR_BRAIN = "";
    const operator = getOperator();
    expect(operator.name).toBe("hermes");
    expect(operator.constructor.name).toBe("HermesBrain");
  });

  it("falls back to HermesBrain for unknown mode e.g. OPERATOR_BRAIN='unknown'", () => {
    process.env.OPERATOR_BRAIN = "unknown";
    const operator = getOperator();
    expect(operator.name).toBe("hermes");
    expect(operator.constructor.name).toBe("HermesBrain");
  });

  it("caches and returns the same instance on subsequent calls", () => {
    process.env.OPERATOR_BRAIN = "fixture";
    const op1 = getOperator();
    // Change env variable after first call without resetting cache
    process.env.OPERATOR_BRAIN = "hermes";
    const op2 = getOperator();
    expect(op1).toBe(op2);
    expect(op2.name).toBe("fixture");
    expect(op2.constructor.name).toBe("FixtureBrain");
  });

  it("resetOperatorCache clears cached instance allowing env variable updates", () => {
    process.env.OPERATOR_BRAIN = "fixture";
    const op1 = getOperator();
    expect(op1.name).toBe("fixture");

    // Change env and reset cache
    process.env.OPERATOR_BRAIN = "hermes";
    resetOperatorCache();

    const op2 = getOperator();
    expect(op2.name).toBe("hermes");
    expect(op1).not.toBe(op2);
  });

  it("returned brain fulfills the OperatorBrain contract interface methods", () => {
    process.env.OPERATOR_BRAIN = "fixture";
    const operator = getOperator();

    expect(typeof operator.analyzeItem).toBe("function");
    expect(typeof operator.chooseMarketplace).toBe("function");
    expect(typeof operator.buildPolicy).toBe("function");
    expect(typeof operator.draftListings).toBe("function");
    expect(typeof operator.handleBuyerMessage).toBe("function");
    expect(typeof operator.decideFulfillment).toBe("function");
  });
});
