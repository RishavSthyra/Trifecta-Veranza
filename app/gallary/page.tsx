import AmenityImageGallery from "@/components/ui/AmenityImageGallery";
import {
  AMENITY_IMAGE_PLACEHOLDER_URL,
  exteriorAmenities,
} from "@/data/exteriorAmenities";

const galleryAmenities = exteriorAmenities.filter(
  (amenity) => amenity.image !== AMENITY_IMAGE_PLACEHOLDER_URL,
);

export default function page() {
  return <AmenityImageGallery amenities={galleryAmenities} />;
}
