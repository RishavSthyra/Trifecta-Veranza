import Walkthrough3D from "@/components/Walkthrough_3D";
import PanoViewer from "@/components/PanoViewer"

export default function Page() {
  return (
    <main className="h-dvh w-full bg-[#0a0a0a]">
      <Walkthrough3D modelUrl="/models/Flat.glb" className="h-full w-full" />
      {/* <PanoViewer /> */}
    </main>
  );
}
