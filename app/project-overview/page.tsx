import FlipBookDeck from "@/components/deck/FlipBookDeck";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Project Overview",
  description:
    "Review the Trifecta Veranza project overview deck with curated highlights and presentation-ready storytelling.",
  keywords: [
    "project overview",
    "real estate presentation",
    "Trifecta Veranza deck",
    "project highlights",
  ],
});

export default function DeckPage() {
  return <FlipBookDeck />;
}
