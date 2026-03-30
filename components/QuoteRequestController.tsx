"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import UpperLayoutCTA from "./UpperLayoutCTA";

const QuoteRequestModal = dynamic(() => import("./QuoteRequestModal"), {
  ssr: false,
});

export default function QuoteRequestController({
  mergeRouteLinks = false,
}: {
  mergeRouteLinks?: boolean;
}) {
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  return (
    <>
      <UpperLayoutCTA
        mergeRouteLinks={mergeRouteLinks}
        onQuoteClick={() => setIsQuoteModalOpen(true)}
      />
      <QuoteRequestModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
      />
    </>
  );
}
