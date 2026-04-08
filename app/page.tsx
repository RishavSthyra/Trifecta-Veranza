import HomePageClient from "@/components/HomePageClient";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Home | Trifecta Veranza",
  description:
    "Discover Trifecta Veranza through a cinematic home experience with fast entry into the master plan, walkthroughs, and project details.",
  keywords: [
    "Trifecta Veranza",
    "luxury apartments",
    "master plan",
    "project overview",
    "real estate walkthrough",
  ],
});

export default function HomePage() {
  return <HomePageClient />;
}
