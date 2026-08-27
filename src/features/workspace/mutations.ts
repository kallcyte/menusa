import { useQueryClient } from "@tanstack/react-query";
import {
  archiveAdminItem,
  createAdminItem,
  draftAdminItem,
  publishAdminItem,
  publishAdminMenu,
  restoreAdminItem,
  reorderAdminItem,
  setRestaurantVisibility,
  unpublishAdminMenu,
  updateAdminItem,
} from "../../api";
import type { MenuItem } from "../../data";
import { errorMessage } from "../shared";

export type SaveItem = (item: MenuItem) => Promise<boolean>;

export type MutationDeps = {
  queryClient: ReturnType<typeof useQueryClient>;
  restaurantId: string;
  slug: string;
  published: boolean;
  setPublished: (value: boolean) => void;
  toast: (input: { title: string; description?: string; variant?: "success" | "error" }) => void;
};

const itemsKey = (restaurantId: string) => ["admin", "items", restaurantId] as const;

function applyItems(deps: MutationDeps, updater: (current: MenuItem[]) => MenuItem[]) {
  deps.queryClient.setQueryData<MenuItem[]>(
    itemsKey(deps.restaurantId),
    (current) => (current ? updater(current) : current),
  );
}

function rollback(
  deps: MutationDeps,
  previousItems: MenuItem[] | undefined,
  previousPublished: boolean,
  title: string,
  err: unknown,
  fallback: string,
): false {
  deps.queryClient.setQueryData(itemsKey(deps.restaurantId), previousItems);
  deps.setPublished(previousPublished);
  deps.toast({ variant: "error", title, description: errorMessage(err, fallback) });
  return false;
}

export function makeAddItem(deps: MutationDeps): SaveItem {
  return async (item) => {
    const previousItems = deps.queryClient.getQueryData<MenuItem[]>(itemsKey(deps.restaurantId));
    const previousPublished = deps.published;
    applyItems(deps, (current) => [item, ...current]);
    deps.setPublished(false);
    try {
      await createAdminItem(item, deps.restaurantId);
      await Promise.all([
        deps.queryClient.invalidateQueries({ queryKey: itemsKey(deps.restaurantId) }),
        deps.queryClient.invalidateQueries({ queryKey: ["public-menu", deps.slug] }),
      ]);
      deps.toast({ title: `${item.name} added`, description: "Saved as a draft. Publish when it's ready." });
      return true;
    } catch (err) {
      return rollback(deps, previousItems, previousPublished, `Couldn't add ${item.name}`, err, "Please try again.");
    }
  };
}

export function makeRunItemAction(deps: MutationDeps) {
  return async (id: string, action: () => Promise<unknown>, nextStatus: NonNullable<MenuItem["status"]>, successMessage?: string): Promise<boolean> => {
    const previousItems = deps.queryClient.getQueryData<MenuItem[]>(itemsKey(deps.restaurantId));
    const previousPublished = deps.published;
    applyItems(deps, (current) => current.map((item) => item.id === id ? { ...item, status: nextStatus } : item));
    if (nextStatus !== "PUBLISHED") deps.setPublished(false);
    try {
      await action();
      await deps.queryClient.invalidateQueries({ queryKey: ["public-menu", deps.slug] });
      if (successMessage) deps.toast({ title: successMessage });
      return true;
    } catch (err) {
      return rollback(deps, previousItems, previousPublished, "Change not saved", err, "The item was restored to its previous status.");
    }
  };
}

export function makeUpdateItem(deps: MutationDeps): SaveItem {
  return async (item) => {
    const previousItems = deps.queryClient.getQueryData<MenuItem[]>(itemsKey(deps.restaurantId));
    const previousPublished = deps.published;
    applyItems(deps, (current) => current.map((currentItem) => currentItem.id === item.id ? item : currentItem));
    deps.setPublished(false);
    try {
      await updateAdminItem(item, deps.restaurantId);
      await Promise.all([
        deps.queryClient.invalidateQueries({ queryKey: itemsKey(deps.restaurantId) }),
        deps.queryClient.invalidateQueries({ queryKey: ["public-menu", deps.slug] }),
      ]);
      deps.toast({ title: `${item.name} updated` });
      return true;
    } catch (err) {
      return rollback(deps, previousItems, previousPublished, `Couldn't save ${item.name}`, err, "Your edits were reverted.");
    }
  };
}

export function makePublishAll(deps: MutationDeps): () => Promise<boolean> {
  return async () => {
    const previousItems = deps.queryClient.getQueryData<MenuItem[]>(itemsKey(deps.restaurantId));
    const previousPublished = deps.published;
    applyItems(deps, (current) => current.map((item) => item.status === "DRAFT" || !item.status ? { ...item, status: "PUBLISHED" } : item));
    deps.setPublished(true);
    try {
      await publishAdminMenu(deps.restaurantId);
      await deps.queryClient.invalidateQueries({ queryKey: ["public-menu", deps.slug] });
      deps.toast({ title: "Menu published", description: "Your latest changes are live." });
      return true;
    } catch (err) {
      return rollback(deps, previousItems, previousPublished, "Publish failed", err, "Your menu wasn't published.");
    }
  };
}

export function makeReorderItem(deps: MutationDeps): (id: string, direction: -1 | 1) => Promise<boolean> {
  return async (id, direction) => {
    const previousItems = deps.queryClient.getQueryData<MenuItem[]>(itemsKey(deps.restaurantId));
    const current = previousItems ?? [];
    const index = current.findIndex(item => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return true;
    const reordered = [...current];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    applyItems(deps, () => reordered);
    try {
      await Promise.all(reordered.map((item, itemIndex) => reorderAdminItem(item.id, itemIndex, deps.restaurantId)));
      await deps.queryClient.invalidateQueries({ queryKey: ["public-menu", deps.slug] });
      return true;
    } catch (err) {
      return rollback(deps, previousItems, deps.published, "Order not saved", err, "The previous order was restored.");
    }
  };
}

export function makeItemActions(deps: MutationDeps, runAction: ReturnType<typeof makeRunItemAction>) {
  return {
    archive: (id: string) => runAction(id, () => archiveAdminItem(id, deps.restaurantId), "ARCHIVED"),
    restore: (id: string) => runAction(id, () => restoreAdminItem(id, deps.restaurantId), "DRAFT"),
    publish: (id: string) => runAction(id, () => publishAdminItem(id, deps.restaurantId), "PUBLISHED", "Item published."),
    draft: (id: string) => runAction(id, () => draftAdminItem(id, deps.restaurantId), "DRAFT"),
  };
}
