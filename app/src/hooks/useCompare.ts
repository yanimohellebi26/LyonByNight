"use client";

import { useState, useCallback } from "react";

const MAX_COMPARE = 3;

export function useCompare() {
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const addToCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id) || prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  }, []);

  const removeFromCompare = useCallback((id: string) => {
    setCompareIds((prev) => prev.filter((item) => item !== id));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareIds([]);
  }, []);

  const isInCompare = useCallback(
    (id: string) => compareIds.includes(id),
    [compareIds]
  );

  return {
    compareIds,
    addToCompare,
    removeFromCompare,
    clearCompare,
    isInCompare,
    isFull: compareIds.length >= MAX_COMPARE,
    count: compareIds.length,
  };
}
