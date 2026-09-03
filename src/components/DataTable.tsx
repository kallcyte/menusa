import { useTranslation } from "react-i18next";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

export type ColumnDef<T> = {
  accessorKey: string;
  header: string;
  sortable?: boolean;
  filterType?: "text" | "select" | "multi";
  filterOptions?: Array<{ value: string; label: string }>;
  cell?: (item: T) => React.ReactNode;
};

export function DataTable<T extends Record<string, unknown>>(props: {
  data: T[];
  columns: ColumnDef<T>[];
  filteredData: T[];
  q: string;
  setQ: (v: string) => void;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  onRowClick?: (item: T) => void;
  emptyLabel?: string;
  onClearFilters?: () => void;
}) {
  const { t } = useTranslation("common");
  const hasActiveFilters = Boolean(props.q) || Object.values(props.filters).some(Boolean);

  return (
    <div className="data-table-wrap">
      <div className="data-table-toolbar">
        <div className="data-table-search">
          <Input
            value={props.q}
            onChange={(e) => props.setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className="data-table-search-input"
          />
        </div>
        <div className="data-table-filters">
          {props.columns
            .filter((c) => c.filterType === "select" && c.filterOptions?.length)
            .map((col) => (
              <Select
                key={col.accessorKey}
                value={props.filters[col.accessorKey] ?? ""}
                onValueChange={(v) => props.setFilter(col.accessorKey, v)}
              >
                <option value="">{col.header}: Semua</option>
                {col.filterOptions!.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ))}
          {hasActiveFilters && props.onClearFilters && (
            <button type="button" className="data-table-clear" onClick={props.onClearFilters}>
              {t("clearFilters")}
            </button>
          )}
        </div>
      </div>

      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {props.columns.map((col) => (
                <th key={col.accessorKey}>
                  {col.sortable ? (
                    <button type="button" className="data-table-sort" onClick={() => props.onSort(col.accessorKey)}>
                      {col.header}
                      {props.sortKey === col.accessorKey && <span className="data-table-sort-dir">{props.sortDir === "asc" ? " ↑" : " ↓"}</span>}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.filteredData.length === 0 ? (
              <tr>
                <td colSpan={props.columns.length} className="data-table-empty">
                  {props.emptyLabel ?? t("noResults")}
                  {hasActiveFilters && props.onClearFilters && (
                    <button type="button" className="data-table-empty-clear" onClick={props.onClearFilters}>
                      {t("clearFilters")}
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              props.filteredData.map((row, idx) => (
                <tr key={(row.id as string) ?? String(idx)} onClick={props.onRowClick ? () => props.onRowClick!(row) : undefined} className={props.onRowClick ? "data-table-row-clickable" : undefined}>
                  {props.columns.map((col) => (
                    <td key={col.accessorKey}>{col.cell ? col.cell(row) : String((row as Record<string, unknown>)[col.accessorKey] ?? "")}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
