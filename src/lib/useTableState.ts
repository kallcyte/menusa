import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { fuzzyFilter, sortBy } from "./search";

type TableState = {
  q: string;
  sort: string;
  order: "asc" | "desc";
  filters: Record<string, string>;
};

export function useTableState<T extends Record<string, unknown>>(opts: {
  data: T[];
  searchKeys: Array<string | ((item: T) => string)>;
  defaultSort?: string;
  defaultOrder?: "asc" | "desc";
  locale?: string;
  syncUrl?: boolean;
}) {
  const search = (opts.syncUrl ? useSearch({ strict: false } as never) : {}) as Record<string, string | undefined>;
  const navigate = opts.syncUrl ? useNavigate() : null;

  const initialQ = (search.q as string) ?? "";
  const initialSort = (search.sort as string) ?? opts.defaultSort ?? "";
  const initialOrder = (search.order as "asc" | "desc") ?? opts.defaultOrder ?? "asc";

  const [q, setQ] = useState(initialQ);
  const [sortKey, setSortKey] = useState(initialSort);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialOrder);
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    for (const [k, v] of Object.entries(search)) {
      if (k.startsWith("filter_") && typeof v === "string" && v) f[k.slice(7)] = v;
    }
    return f;
  });

  // Debounced URL sync
  useEffect(() => {
    if (!opts.syncUrl || !navigate) return;
    const t = setTimeout(() => {
      const next: Record<string, string | undefined> = {};
      if (q) next.q = q;
      if (sortKey) next.sort = sortKey;
      if (sortDir !== "asc") next.order = sortDir;
      for (const [k, v] of Object.entries(filters)) if (v) next[`filter_${k}`] = v;
      void navigate({ to: "." as never, search: next as never, replace: true });
    }, 200);
    return () => clearTimeout(t);
  }, [q, sortKey, sortDir, filters, opts.syncUrl, navigate]);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      if (!value) {
        const { [key]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const filtered = useMemo(() => {
    let out = [...opts.data];
    // Exact filters
    for (const [k, v] of Object.entries(filters)) {
      if (!v) continue;
      out = out.filter((item) => String((item as Record<string, unknown>)[k] ?? "").toLowerCase() === v.toLowerCase());
    }
    // Fuzzy search
    if (q.trim()) out = fuzzyFilter(out, q, opts.searchKeys);
    // Sort
    if (sortKey) out = sortBy(out, sortKey, sortDir, opts.locale ?? "id");
    return out;
  }, [opts.data, opts.searchKeys, q, sortKey, sortDir, filters, opts.locale]);

  const toggleSort = useCallback(
    (key: string) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const clearFilters = useCallback(() => {
    setQ("");
    setFilters({});
  }, []);

  return { q, setQ, sortKey, sortDir, filters, setFilter, filtered, toggleSort, clearFilters, setSortKey, setSortDir };
}
