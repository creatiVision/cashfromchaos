import Hero from "@/components/home/Hero";
import Process from "@/components/home/Process";
import Features from "@/components/home/Features";

export default function Home() {
  return (
    <div className="space-y-16">
      <Hero />
      <Process />
      <Features />
    </div>
  );
}
