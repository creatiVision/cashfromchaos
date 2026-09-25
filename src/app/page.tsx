import { HeroSection } from "@/components/HeroSection";
import { OperatorStepsSection } from "@/components/OperatorStepsSection";
import { ValuePropsSection } from "@/components/ValuePropsSection";

export default function Home() {
  return (
    <div className="space-y-16">
      <HeroSection />
      <OperatorStepsSection />
      <ValuePropsSection />
    </div>
  );
}
