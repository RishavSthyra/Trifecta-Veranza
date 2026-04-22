"use client";

import { forwardRef } from "react";
import Image from "next/image";

type Props = {
  side: "left" | "right";
  number?: number;
};

const OVERVIEW_FRAME_SRC = "https://cdn.sthyra.com/images/first_frame_overview.jpg";

const FullImageSpreadPage = forwardRef<HTMLDivElement, Props>(
  ({ side, number: _number }, ref) => {
    void _number;

    return (
      <div
        ref={ref}
        className={`relative h-full w-full overflow-hidden bg-black ${
          side === "left"
            ? "rounded-l-[24px] sm:rounded-l-2xl"
            : "rounded-r-[24px] sm:rounded-r-2xl"
        }`}
      >
        <div
          className={`absolute inset-y-0 w-[200%] ${
            side === "left" ? "left-0" : "-left-full"
          }`}
        >
          <Image
            src={OVERVIEW_FRAME_SRC}
            alt="Trifecta Veranza project overview"
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </div>
    );
  },
);

FullImageSpreadPage.displayName = "FullImageSpreadPage";

export default FullImageSpreadPage;

