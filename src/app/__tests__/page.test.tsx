import Home from "../page";
import { HeroSection } from "@/components/HeroSection";
import { OperatorStepsSection } from "@/components/OperatorStepsSection";
import { ValuePropsSection } from "@/components/ValuePropsSection";

describe("Home Page and Subcomponents", () => {
  it("renders Home component structure without throwing", () => {
    const homeElement = Home();
    expect(homeElement).toBeDefined();
    expect(homeElement.type).toBe("div");
  });

  it("renders HeroSection component without throwing", () => {
    const heroElement = HeroSection();
    expect(heroElement).toBeDefined();
    expect(heroElement.type).toBe("section");
  });

  it("renders OperatorStepsSection component without throwing", () => {
    const stepsElement = OperatorStepsSection();
    expect(stepsElement).toBeDefined();
    expect(stepsElement.type).toBe("section");
  });

  it("renders ValuePropsSection component without throwing", () => {
    const propsElement = ValuePropsSection();
    expect(propsElement).toBeDefined();
    expect(propsElement.type).toBe("section");
  });
});
