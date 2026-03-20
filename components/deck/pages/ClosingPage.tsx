"use client";

import React, { forwardRef } from "react";

type Props = {
  number?: number;
};

const ClosingPage = forwardRef<HTMLDivElement, Props>(({ number }, ref) => {
  return (
    <div
      ref={ref}
      className="h-[100vh] w-[100%] overflow-hidden rounded-2xl bg-white"
    >
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-950 to-slate-800 text-white">
        <div className="text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.3em] opacity-70">
            Page {number}
          </p>
          <h2 className="text-4xl font-bold">Thank You</h2>
        </div>
      </div>
    </div>
  );
});

ClosingPage.displayName = "ClosingPage";

export default ClosingPage;