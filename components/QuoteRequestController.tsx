"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import UpperLayoutCTA from "./UpperLayoutCTA";

const QuoteRequestModal = dynamic(() => import("./QuoteRequestModal"), {
  ssr: false,
});

export default function QuoteRequestController() {
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  return (
    <>
      <UpperLayoutCTA onQuoteClick={() => setIsQuoteModalOpen(true)} />
      <QuoteRequestModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
      />
    </>
  );
}
