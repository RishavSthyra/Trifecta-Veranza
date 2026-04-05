import { Suspense } from "react";
import Walkthrough3D from "@/components/Walkthrough_3D";

export default function Page() {
  return (
    <main className="h-dvh w-full bg-[#0a0a0a]">
      <Suspense fallback={<div className="h-full w-full bg-[#0a0a0a]" />}>
        <Walkthrough3D modelUrl="/models/Flat.glb" className="h-full w-full" />
      </Suspense>
    </main>
  );
}
