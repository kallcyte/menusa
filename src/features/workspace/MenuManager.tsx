import { useState } from "react";
import {
  Archive,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  TriangleAlert,
} from "lucide-react";
import { Button } from "../../components";
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
  onDraftItem: (id: string) => Promise<boolean>;
  onReorder: (id: string, direction: -1 | 1) => Promise<boolean>;
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
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const statusFilters = [
    { value: "ALL" as const, label: "All items" },
    { value: "DRAFT" as const, label: "Drafts" },
    { value: "PUBLISHED" as const, label: "Published" },
    { value: "ARCHIVED" as const, label: "Archived" },
  ];
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
              ? "Review dishes, pricing and availability for this restaurant. Publishing makes changes live."
              : "Add dishes, update prices, and make your menu yours. Changes go live when you publish."}
          </p>
        </div>
        <Button variant="default" onClick={onAdd}>
          <Plus size={18} /> Add item
        </Button>
      </div>
      <div className="publish-banner">
        <div>
          <span className="banner-icon">
            <Check size={17} />
          </span>
          <div>
            <strong>
              {published ? "Your menu is live" : "Changes ready to publish"}
            </strong>
            <p>
              {published
                ? "Anyone with your link can see the latest version."
                : "Publish when your menu is ready for guests."}
            </p>
          </div>
        </div>
        <div className="publish-banner-actions">
          {published && onUnpublish && (
            <Button variant="outline" onClick={() => onUnpublish()} className="publish-banner-unpublish">
              <EyeOff size={14} /> Unpublish
            </Button>
          )}
          <Button variant="outline" onClick={() => onPublish()}>
            {published ? "Publish updates" : "Publish menu"}{" "}
            <ArrowUpRight size={15} />
          </Button>
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
          return <div className={itemStatus === "ARCHIVED" ? "menu-item-row archived" : "menu-item-row"} key={item.id}>
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
              {index > 0 && <button className="more-button menu-item-action" onClick={() => onReorder(item.id, -1)} aria-label={`Move ${item.name} up`}><ChevronUp size={14} /></button>}
              {index < visibleItems.length - 1 && <button className="more-button menu-item-action" onClick={() => onReorder(item.id, 1)} aria-label={`Move ${item.name} down`}><ChevronDown size={14} /></button>}
              {itemStatus !== "ARCHIVED" && <button className="more-button menu-item-action" onClick={() => setEditingItem(item)} aria-label={`Edit ${item.name}`}><Pencil size={14} /> <span>Edit</span></button>}
              {itemStatus === "DRAFT" && <button className="more-button menu-item-action publish-item-action" onClick={() => onPublishItem(item.id)} aria-label={`Publish ${item.name}`}><Send size={14} /> <span>Publish</span></button>}
              {itemStatus === "PUBLISHED" && <button className="more-button menu-item-action draft-item-action" onClick={() => onDraftItem(item.id)} aria-label={`Move ${item.name} to draft`}><EyeOff size={14} /> <span>Draft</span></button>}
              <button className="more-button menu-item-action" onClick={() => itemStatus === "ARCHIVED" ? onRestore(item.id) : onArchive(item.id)} aria-label={`${itemStatus === "ARCHIVED" ? "Restore" : "Archive"} ${item.name}`}>
                {itemStatus === "ARCHIVED" ? <><RotateCcw size={14} /> <span>Restore</span></> : <><Archive size={14} /> <span>Archive</span></>}
              </button>
            </div>
          </div>
        })}
        {!loadingInitial && !loadError && !visibleItems.length && <div className="menu-empty-state"><p>No {statusFilter === "ALL" ? "menu" : statusFilter.toLowerCase()} items yet.</p><Button variant="outline" size="sm" onClick={onAdd}>Add an item</Button></div>}
      </div>
      {editingItem && <AddItemModal initialItem={editingItem} onClose={() => setEditingItem(null)} onSave={(item) => { onUpdate(item).then((saved) => { if (saved) setEditingItem(null); }); }} />}
    </div>
  );
}
