"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseSnapListViewportOptions = {
  itemCount: number;
  targetVisibleCards: number;
};

type UseSnapListViewportResult = {
  setFirstItemNode: (node: HTMLElement | null) => void;
  setListNode: (node: HTMLDivElement | null) => void;
  setScrollAreaNode: (node: HTMLDivElement | null) => void;
  viewportHeight: number | null;
};

export function useSnapListViewport({
  itemCount,
  targetVisibleCards,
}: UseSnapListViewportOptions): UseSnapListViewportResult {
  const scrollAreaNodeRef = useRef<HTMLDivElement | null>(null);
  const listNodeRef = useRef<HTMLDivElement | null>(null);
  const firstItemNodeRef = useRef<HTMLElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  const measure = useCallback(() => {
    const scrollArea = scrollAreaNodeRef.current;
    const list = listNodeRef.current;
    const firstItem = firstItemNodeRef.current;

    if (!scrollArea || !list || !firstItem || itemCount === 0) {
      setViewportHeight(null);
      return;
    }

    const itemHeight = firstItem.getBoundingClientRect().height;
    const computedListStyles = window.getComputedStyle(list);
    const gap =
      Number.parseFloat(
        computedListStyles.rowGap || computedListStyles.gap || "0",
      ) || 0;

    if (!itemHeight) {
      return;
    }

    const visibleCards = Math.min(itemCount, targetVisibleCards);
    const nextViewportHeight =
      visibleCards * itemHeight + Math.max(0, visibleCards - 1) * gap;

    setViewportHeight((currentHeight) => {
      if (
        currentHeight !== null &&
        Math.abs(currentHeight - nextViewportHeight) < 0.5
      ) {
        return currentHeight;
      }

      return nextViewportHeight;
    });
  }, [itemCount, targetVisibleCards]);

  useEffect(() => {
    const handleResize = () => {
      measure();
    };

    window.addEventListener("resize", handleResize);

    const frameId = window.requestAnimationFrame(() => {
      measure();
    });

    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", handleResize);
      };
    }

    const observer = new ResizeObserver(() => {
      measure();
    });
    const observedNodes = [
      scrollAreaNodeRef.current,
      listNodeRef.current,
      firstItemNodeRef.current,
    ].filter((node): node is HTMLElement => node !== null);

    observedNodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [measure]);

  const setScrollAreaNode = useCallback((node: HTMLDivElement | null) => {
    scrollAreaNodeRef.current = node;
  }, []);

  const setListNode = useCallback((node: HTMLDivElement | null) => {
    listNodeRef.current = node;
  }, []);

  const setFirstItemNode = useCallback((node: HTMLElement | null) => {
    firstItemNodeRef.current = node;
  }, []);

  return {
    setFirstItemNode,
    setListNode,
    setScrollAreaNode,
    viewportHeight,
  };
}
