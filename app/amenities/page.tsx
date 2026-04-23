import AmenitiesPageClient, {
  type AmenitiesPageData,
} from "@/components/amenities/AmenitiesPageClient";
import amenitiesPageData from "@/data/amenitiesPage.json";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Amenities",
  description:
    "Explore the amenity collection at Trifecta Veranza with videos, thumbnails, and details powered by editable page data.",
  keywords: [
    "Trifecta Veranza amenities",
    "rooftop leisure deck",
    "residential amenities",
    "project amenities",
  ],
});

export default function AmenitiesPage() {
  return <AmenitiesPageClient data={amenitiesPageData as AmenitiesPageData} />;
}
