import exteriorNodes from "@/data/trifecta_pano_walkthrough_data_Exterior.json";
import ExteriorPanoWalkthrough from "@/components/tour/ExteriorPanoWalkthrough";
import type { ExteriorPanoNodeSource } from "@/lib/exterior-tour/types";

const exteriorTourNodes = exteriorNodes as ExteriorPanoNodeSource[];

const preferredInitialNodeId =
  exteriorTourNodes.find((node) => node.id === "BP_panoPath_Exterior10_F0039")?.id ??
  exteriorTourNodes[0]?.id;

/** Preconnect to the panorama CDN — saves ~100-300ms on first connection setup. */
const CDN_BASE = "https://cdn.sthyra.com";

/**
 * Resource hints for the exterior walkthrough page.
 * Placed as a data component so Next.js can render them into <head>.
 */
function ExteriorWalkthroughHead() {
  return (
    <>
      {/* Preconnect: establish TCP/TLS handshake before any requests are made */}
      <link rel="preconnect" href={CDN_BASE} crossOrigin="anonymous" />
      <link rel="dns-prefetch" href={CDN_BASE} />
      {/* Preload the initial node's preview image — it renders as CSS bg instantly */}
      <link
        rel="preload"
        as="image"
        href={`${CDN_BASE}/panos/LS_Exterior10_F0039/preview.jpg`}
        fetchPriority="high"
      />
    </>
  );
}

export default function ExteriorTourPage() {
  return (
    <main className="app-screen bg-[#040608]">
      <ExteriorWalkthroughHead />
      <div className="h-full w-full">
        <ExteriorPanoWalkthrough
          nodes={exteriorTourNodes}
          cdnBaseUrl={`${CDN_BASE}/panos`}
          initialNodeId={preferredInitialNodeId}
          className="h-full w-full"
          title="Trifecta Exterior Walkthrough"
          subtitle="Fast panoramic browsing with directional node navigation tuned for a lighter exterior experience."
        />
      </div>
    </main>
  );
}

