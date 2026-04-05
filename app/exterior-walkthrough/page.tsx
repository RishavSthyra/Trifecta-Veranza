import exteriorNodes from "@/data/trifecta_pano_walkthrough_data_Exterior.json";
import ExteriorPanoWalkthrough from "@/components/tour/ExteriorPanoWalkthrough";
import type { ExteriorPanoNodeSource } from "@/lib/exterior-tour/types";

const exteriorTourNodes = exteriorNodes as ExteriorPanoNodeSource[];

const preferredInitialNodeId =
  exteriorTourNodes.find((node) => node.id === "BP_panoPath_Exterior10_F0039")?.id ??
  exteriorTourNodes[0]?.id;

export default function ExteriorTourPage() {
  return (
    <main className="app-screen bg-[#040608]">
      <div className="h-full w-full">
        <ExteriorPanoWalkthrough
          nodes={exteriorTourNodes}
          cdnBaseUrl="https://cdn.sthyra.com/panos"
          initialNodeId={preferredInitialNodeId}
          className="h-full w-full"
          title="Trifecta Exterior Walkthrough"
          subtitle="Fast panoramic browsing with directional node navigation tuned for a lighter exterior experience."
        />
      </div>
    </main>
  );
}
