"use client";

import { useGameStore } from "@/state/store";
import OnboardingFlow from "@/components/OnboardingFlow";
import TempleScreen from "@/components/TempleScreen";

export default function Home() {
  const entered = useGameStore((s) => s.entered);

  return (
    <main className="h-screen w-screen">
      {entered ? <TempleScreen /> : <OnboardingFlow />}
    </main>
  );
}
