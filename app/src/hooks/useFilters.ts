"use client";

import { useQueryStates, parseAsString, parseAsFloat } from "nuqs";

export function useFilters() {
  const [filters, setFilters] = useQueryStates({
    type: parseAsString,
    arrondissement: parseAsString,
    musique: parseAsString,
    fourchette: parseAsString,
    note_min: parseAsFloat,
    q: parseAsString,
    sort: parseAsString.withDefault("note"),
    page: parseAsString.withDefault("1"),
  });

  const clearFilters = () => {
    setFilters({
      type: null,
      arrondissement: null,
      musique: null,
      fourchette: null,
      note_min: null,
      q: null,
      sort: "note",
      page: "1",
    });
  };

  const activeCount = Object.entries(filters).filter(
    ([key, value]) =>
      value !== null && key !== "sort" && key !== "page"
  ).length;

  return { filters, setFilters, clearFilters, activeCount };
}
