"use client";

import { useState } from "react";
import QuoteRequestModal from "./QuoteRequestModal";
import UpperLayoutCTA from "./UpperLayoutCTA";

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
