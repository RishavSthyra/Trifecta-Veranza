import type * as React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        alt?: string;
        autoplay?: boolean;
        "camera-controls"?: boolean;
        "disable-zoom"?: boolean;
        "disable-pan"?: boolean;
        "interaction-prompt"?: string;
        "shadow-intensity"?: string | number;
        exposure?: string | number;
        orientation?: string;
        style?: React.CSSProperties;
      };
    }
  }
}

export {};