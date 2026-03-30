"use client";

import { useEffect, useState } from "react";
import HeroSection from "@/components/sections/HeroSection";
import TrifectaPreloader from "@/components/ui/Preloader";

export default function Home() {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let value = 0;

    const timer = setInterval(() => {
      value += 2;
      setProgress(value);

      if (value >= 100) {
        clearInterval(timer);
        setTimeout(() => setLoading(false), 250);
      }
    }, 40);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {loading ? <TrifectaPreloader progress={progress} /> : null}
      <main className="app-screen overflow-hidden bg-neutral-950 text-white">
        <HeroSection />
      </main>
    </>
  );
}
