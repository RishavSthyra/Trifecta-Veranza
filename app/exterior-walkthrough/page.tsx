import exteriorNodes from "@/data/trifecta_pano_walkthrough_data_Exterior1.json";
import ExteriorPanoWalkthrough from "@/components/tour/ExteriorPanoWalkthrough";
import type { ExteriorPanoNodeSource } from "@/lib/exterior-tour/types";
import { buildPageMetadata } from "@/lib/metadata";

function isIgnoredExteriorPano(node: ExteriorPanoNodeSource) {
  return (
    /\.0000(?:\.[^/.]+)?$/i.test(node.id) ||
    /\.0000(?:\.[^/.]+)?$/i.test(node.image_filename)
  );
}

const exteriorTourNodes = (exteriorNodes as ExteriorPanoNodeSource[]).filter(
  (node) => !isIgnoredExteriorPano(node),
);

const preferredInitialNodeId =
  exteriorTourNodes.find((node) => node.id === "BP_panoPath_Exterior_GateEntry_F0000")?.id ??
  exteriorTourNodes[0]?.id;

/** Preconnect to the panorama CDN — saves ~100-300ms on first connection setup. */
const CDN_BASE = "https://cdn.sthyra.com";
const EXTERIOR_PANO_BASE = `${CDN_BASE}/exterior-panos-trifecta`;

export const metadata = buildPageMetadata({
  title: "Exterior Walkthrough",
  description:
    "Experience the exterior panoramic walkthrough for Trifecta Veranza with directional navigation and fast node-to-node transitions.",
  keywords: [
    "exterior walkthrough",
    "panorama tour",
    "site walkthrough",
    "Trifecta Veranza exterior",
  ],
});

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
        href={`${EXTERIOR_PANO_BASE}/LS_BP_panoPath_Exterior_GateEntry_F0000/preview.jpg`}
        fetchPriority="high"
      />
    </>
  );
}

export default function ExteriorTourPage() {
  return (
    <main className="relative h-[100svh] min-h-[100svh] w-full overflow-hidden bg-[#040608]">
      <ExteriorWalkthroughHead />

      <div className="absolute inset-0">
        <ExteriorPanoWalkthrough
          nodes={exteriorTourNodes}
          cdnBaseUrl={EXTERIOR_PANO_BASE}
          initialNodeId={preferredInitialNodeId}
          className="h-full w-full rounded-none"
          title="Trifecta Exterior Walkthrough"
          subtitle="Fast panoramic browsing with directional node navigation tuned for a lighter exterior experience."
        />
      </div>
    </main>
  );
}

