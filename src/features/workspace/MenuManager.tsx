import { useState } from "react";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Info,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  TriangleAlert,
} from "lucide-react";
import { Button } from "../../components";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import type { MenuItem } from "../../data";
import { AddItemModal } from "./AddItemModal";

export function MenuManager({
  items,
  onAdd,
  onArchive,
  onRestore,
  onUpdate,
  onPublishItem,
  onDraftItem,
  onReorder,
  onReorderTo,
  onPublish,
  onUnpublish,
  published,
  loading,
  loadingInitial,
  loadError,
  onRetry,
  variant = "workspace",
}: {
  items: MenuItem[];
  onAdd: () => void;
  onArchive: (id: string) => Promise<boolean>;
  onRestore: (id: string) => Promise<boolean>;
  onUpdate: (item: MenuItem) => Promise<boolean>;
  onPublishItem: (id: string) => Promise<boolean>;
  onReorder: (id: string, direction: -1 | 1) => Promise<boolean>;
  onReorderTo: (id: string, targetId: string) => Promise<boolean>;
  onPublish: () => Promise<boolean>;
  onUnpublish?: () => Promise<boolean>;
  published: boolean;
  loading: boolean;
  loadingInitial: boolean;
  loadError: string | null;
  onRetry: () => void;
  variant?: "workspace" | "superadmin";
}) {
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED">("ALL");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const clearDragState = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  };
  const handleDrop = (targetId: string) => {
    if (draggedItemId && draggedItemId !== targetId) void onReorderTo(draggedItemId, targetId);
    clearDragState();
  };
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const statusFilters = [
    { value: "ALL" as const, label: "All items" },
    { value: "DRAFT" as const, label: "Drafts" },
    { value: "PUBLISHED" as const, label: "Published" },
    { value: "ARCHIVED" as const, label: "Archived" },
  ];
  const statusOf = (item: MenuItem) => item.status ?? "PUBLISHED";
  const visibleItems = items.filter((item) => statusFilter === "ALL" || statusOf(item) === statusFilter);
  return (
    <div className="manager">
      <div className="manager-intro">
        <div>
          <p className="muted">
            {items.length} items ·{" "}
            {loading ? "Syncing with D1..." : variant === "superadmin" ? "Managed centrally" : "Synced with workspace"}
          </p>
          <h1>{variant === "superadmin" ? "Menu items" : "Keep it fresh."}</h1>
          <p className="intro-copy">
            {variant === "superadmin"
              ? "Review dishes, pricing and availability. Changes save automatically."
              : "Add dishes, update prices, and make your menu yours. Changes save automatically."}
          </p>
        </div>
        <Button variant="default" onClick={onAdd}>
          <Plus size={18} /> Add item
        </Button>
      </div>
      <div className="publish-banner">
        <div>
          <span className={published ? "banner-icon" : "banner-icon banner-icon-hidden"}>
            {published ? <Check size={17} /> : <EyeOff size={17} />}
          </span>
          <div>
            <strong>
              {published ? "Your menu is visible" : "Your menu is hidden"}
            </strong>
            <p>
              {published
                ? "Visitors can view your menu using its public link."
                : "Visitors cannot view your menu until you show it."}
            </p>
          </div>
        </div>
        <div className="publish-banner-actions">
          {published && onUnpublish ? (
            <Button variant="outline" onClick={() => onUnpublish()} className="publish-banner-unpublish">
              <EyeOff size={14} /> Hide menu
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onPublish()}>
              <Eye size={14} /> Show menu
            </Button>
          )}
        </div>
      </div>
      {loadError && (
        <div className="publish-banner" role="alert">
          <div>
            <span className="banner-icon">
              <TriangleAlert size={17} />
            </span>
            <div>
              <strong>Couldn't load your menu</strong>
              <p>{loadError}</p>
            </div>
          </div>
          <Button variant="outline" onClick={onRetry}>
            Try again <RotateCcw size={15} />
          </Button>
        </div>
      )}
      <div className="menu-filter-row">
        {statusFilters.map((filter) => {
          const count = filter.value === "ALL" ? items.length : items.filter((item) => statusOf(item) === filter.value).length;
          return <button key={filter.value} className={statusFilter === filter.value ? "menu-filter active" : "menu-filter"} onClick={() => setStatusFilter(filter.value)}>{filter.label}<span>{count}</span></button>;
        })}
        <span className="menu-order-hint"><Info size={13} /> Drag rows to reorder</span>
      </div>
      <div className="item-table menu-list-shell">
        <div className="table-head menu-list-head">
          <span>Item</span>
          <span>Category</span>
          <span>Price</span>
          <span>Status</span>
          <span />
        </div>
        {loadingInitial && [0, 1, 2].map(row => (
          <div className="skeleton-row" key={row} aria-hidden="true">
            <div className="item-cell">
              <span className="skeleton-bone h-[52px] w-[52px] rounded" />
              <span className="flex-1 space-y-2">
                <span className="skeleton-bone h-4 w-1/3" />
                <span className="skeleton-bone h-3 w-2/3" />
              </span>
            </div>
            <span className="skeleton-bone h-6 w-[90px] rounded-full" />
            <span className="skeleton-bone h-4 w-10" />
            <span className="skeleton-bone h-4 w-16" />
            <span />
          </div>
        ))}
        {visibleItems.map((item, index) => {
          const itemStatus = statusOf(item);
          return <div
            className={`${itemStatus === "ARCHIVED" ? "menu-item-row archived" : "menu-item-row"}${dragOverItemId === item.id ? " drag-over" : ""}${draggedItemId === item.id ? " dragging" : ""}`}
            key={item.id}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", item.id);
              setDraggedItemId(item.id);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              if (draggedItemId !== item.id) setDragOverItemId(item.id);
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(item.id);
            }}
            onDragEnd={clearDragState}
          >
            <div className="item-cell">
              <img className="menu-item-thumb" src={item.image} alt="" />
              <div className="menu-item-copy">
                <div className="menu-item-name-row">
                  <strong>{item.name}</strong>
                  {item.tag && <span className="menu-item-tag">{item.tag}</span>}
                </div>
                <span>{item.description}</span>
              </div>
            </div>
            <span className="table-category menu-item-category">{item.category}</span>
            <span className="table-price menu-item-price">${item.price}</span>
            <span>
              <span className={`menu-item-status ${itemStatus.toLowerCase()}`}>
                <span className="live-dot" /> {itemStatus === "DRAFT" ? "Draft" : itemStatus === "ARCHIVED" ? "Archived" : "Published"}
              </span>
            </span>
            <div className="menu-item-actions">
              {index > 0 && <Button variant="subtle" size="icon" className="h-8 min-h-8 w-8" onClick={() => onReorder(item.id, -1)} aria-label={`Move ${item.name} up`}><ChevronUp size={14} /></Button>}
              {index < visibleItems.length - 1 && <Button variant="subtle" size="icon" className="h-8 min-h-8 w-8" onClick={() => onReorder(item.id, 1)} aria-label={`Move ${item.name} down`}><ChevronDown size={14} /></Button>}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="subtle" size="icon" className="h-8 min-h-8 w-8" aria-label={`Actions for ${item.name}`}>
                    <MoreHorizontal size={15} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={6} className="min-w-[150px]">
                  {itemStatus !== "ARCHIVED" && (
                    <DropdownMenuItem onSelect={() => setEditingItem(item)}>
                      <Pencil size={14} /> Edit item
                    </DropdownMenuItem>
                  )}
                  {itemStatus !== "ARCHIVED" && <DropdownMenuSeparator />}
                  {itemStatus === "DRAFT" && (
                    <DropdownMenuItem onSelect={() => { void onPublishItem(item.id); }}>
                      <Send size={14} /> Publish item
                    </DropdownMenuItem>
                  )}
                  {itemStatus === "PUBLISHED" && (
                    <DropdownMenuItem onSelect={() => { void onDraftItem(item.id); }}>
                      <EyeOff size={14} /> Move to draft
                    </DropdownMenuItem>
                  )}
                  {itemStatus !== "ARCHIVED" && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    className={itemStatus === "ARCHIVED" ? undefined : "text-[#b04b39] focus:bg-[#fff0ed]"}
                    onSelect={() => { void (itemStatus === "ARCHIVED" ? onRestore(item.id) : onArchive(item.id)); }}
                  >
                    {itemStatus === "ARCHIVED" ? <><RotateCcw size={14} /> Restore item</> : <><Archive size={14} /> Archive item</>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        })}
        {!loadingInitial && !loadError && !visibleItems.length && <div className="menu-empty-state"><p>No {statusFilter === "ALL" ? "menu" : statusFilter.toLowerCase()} items yet.</p><Button variant="outline" size="sm" onClick={onAdd}>Add an item</Button></div>}
      </div>
      {editingItem && <AddItemModal initialItem={editingItem} onClose={() => setEditingItem(null)} onSave={(item) => { onUpdate(item).then((saved) => { if (saved) setEditingItem(null); }); }} />}
    </div>
  );
}
