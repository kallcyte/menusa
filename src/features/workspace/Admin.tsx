import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  LogOut,
  Menu as MenuIcon,
  Plus,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "../../components";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "../../components/ui/sidebar";
import { createAdminRestaurant, fetchAdminItems, fetchAdminRestaurants, fetchSession, fetchSuperadminMe, logout } from "../../api";
import { useToast } from "../../components/ui/toast";
import type { Navigate } from "../shared";
import { errorMessage } from "../shared";
import {
  makeAddItem,
  makeItemActions,
  makePublishAll,
  makeReorderItem,
  makeRunItemAction,
  makeUpdateItem,
  type MutationDeps,
} from "./mutations";
import { MenuManager } from "./MenuManager";
import { MenuSettingsPanel } from "./MenuSettingsPanel";
import { AddItemModal } from "./AddItemModal";
import { AddRestaurantModal } from "./AddRestaurantModal";
import { WaitlistPanel } from "./WaitlistPanel";
import { AccountSettingsPanel } from "../auth/AccountSettingsPanel";

type AdminTab = "menu" | "menu-settings" | "waitlist" | "account";

export function Admin({
  navigate,
  initialTab = "menu",
}: {
  navigate: Navigate;
  initialTab?: AdminTab;
}) {
  const [tab, setTab] = useState<AdminTab>(initialTab);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [published, setPublished] = useState(true);
  const [restaurantId, setRestaurantId] = useState("restaurant-1");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  useEffect(() => {
    if (tab !== initialTab)
      navigate(
        tab === "menu"
          ? "/admin"
          : tab === "menu-settings"
            ? "/admin/menu-settings"
            : tab === "waitlist"
              ? "/admin/waitlist"
              : "/account/settings",
      );
  }, [initialTab, navigate, tab]);
  const sessionQuery = useQuery({
    queryKey: ["auth", "session"],
    queryFn: fetchSession,
    staleTime: 30_000,
  });
  const meQuery = useQuery({
    queryKey: ["superadmin", "me"],
    queryFn: fetchSuperadminMe,
    staleTime: 30_000,
    retry: false,
  });
  const isSuperadmin = meQuery.data?.user.role === "superadmin";
  useEffect(() => {
    if (meQuery.isSuccess && isSuperadmin) navigate("/superadmin");
  }, [meQuery.isSuccess, isSuperadmin, navigate]);
  useEffect(() => {
    if (
      sessionQuery.isSuccess &&
      !sessionQuery.isFetching &&
      !sessionQuery.data
    )
      navigate("/login");
  }, [
    sessionQuery.data,
    sessionQuery.isFetching,
    sessionQuery.isSuccess,
    navigate,
  ]);
  if (meQuery.isSuccess && isSuperadmin) {
    return (
      <div className="admin-shell" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <p className="waitlist-loading">Redirecting to command center…</p>
      </div>
    );
  }
  const restaurantsQuery = useQuery({
    queryKey: ["admin", "restaurants"],
    queryFn: fetchAdminRestaurants,
    staleTime: 30_000,
  });
  const ownedRestaurants = restaurantsQuery.data?.restaurants ?? [];
  const selectedRestaurant = ownedRestaurants.find(
    (restaurant) => restaurant.id === restaurantId,
  ) ??
    ownedRestaurants[0] ?? null;
  useEffect(() => {
    if (
      ownedRestaurants[0] &&
      !ownedRestaurants.some((restaurant) => restaurant.id === restaurantId)
    )
      setRestaurantId(ownedRestaurants[0].id);
  }, [ownedRestaurants, restaurantId]);
  useEffect(() => {
    if (selectedRestaurant) setPublished(selectedRestaurant.published === 1);
  }, [selectedRestaurant?.id, selectedRestaurant?.published]);
  const itemsQuery = useQuery({
    queryKey: ["admin", "items", restaurantId],
    queryFn: () => fetchAdminItems(restaurantId),
    enabled: Boolean(selectedRestaurant),
    staleTime: 30_000,
  });
  const items = itemsQuery.data ?? [];
  const deps: MutationDeps = {
    queryClient,
    restaurantId: selectedRestaurant?.id ?? restaurantId,
    slug: selectedRestaurant?.slug ?? "le-resto",
    published,
    setPublished,
    toast,
  };
  const runItemAction = makeRunItemAction(deps);
  const itemActions = makeItemActions(deps, runItemAction);
  const addItem = makeAddItem(deps);
  const updateItem = makeUpdateItem(deps);
  const publishAll = makePublishAll(deps);
  const reorderItem = makeReorderItem(deps);
  const createRestaurant = async (input: Parameters<typeof createAdminRestaurant>[0]) => {
    try {
      const result = await createAdminRestaurant(input);
      await queryClient.invalidateQueries({ queryKey: ["admin", "restaurants"] });
      setRestaurantId(result.restaurant.id);
      setShowAddRestaurant(false);
      toast({ title: `${input.name} created`, description: "Your new menu workspace is ready." });
      return true;
    } catch (err) {
      toast({ variant: "error", title: "Couldn't create restaurant", description: errorMessage(err, "Please try again.") });
      return false;
    }
  };
  const signOut = async () => {
    try {
      await logout();
    } catch (err) {
      toast({ variant: "error", title: "Couldn't sign out", description: errorMessage(err, "Please try again.") });
      return;
    }
    queryClient.setQueryData(["auth", "session"], null);
    queryClient.removeQueries({ queryKey: ["admin"] });
    navigate("/login");
  };
  return (
    <SidebarProvider className="admin-shell">
      <Sidebar className="admin-sidebar">
        <SidebarHeader className="admin-sidebar-header">
          <Logo />
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent className="admin-sidebar-content">
          <div className="admin-restaurant-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="admin-restaurant">
                  <div className="restaurant-avatar">
                    {selectedRestaurant?.name[0] ?? "?"}
                  </div>
                  <div>
                    <strong>{selectedRestaurant?.name ?? "No restaurant"}</strong>
                    <span>
                      {ownedRestaurants.length} restaurant
                      {ownedRestaurants.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ChevronDown size={15} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={8} className="restaurant-menu-content">
                {ownedRestaurants.map((restaurant) => (
                  <DropdownMenuItem
                    key={restaurant.id}
                    className="popover-item"
                    onSelect={() => {
                      setRestaurantId(restaurant.id);
                    }}
                  >
                    <span className="restaurant-avatar small">
                      {restaurant.name[0]}
                    </span>
                    <span>{restaurant.name}</span>
                    {restaurant.id === selectedRestaurant.id && (
                      <Check size={14} />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="popover-add" onSelect={() => setShowAddRestaurant(true)}>
                  <Plus size={14} /> Add restaurant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <SidebarMenu>
            <SidebarMenuButton
              className={tab === "menu" ? "nav-item selected" : "nav-item"}
              aria-label="Menu"
              onClick={() => setTab("menu")}
            >
              <MenuIcon size={18} /> <span className="sidebar-label">Menu</span>
            </SidebarMenuButton>
            <SidebarMenuButton
              className={
                tab === "menu-settings" ? "nav-item selected" : "nav-item"
              }
              aria-label="Restaurant settings"
              onClick={() => setTab("menu-settings")}
            >
              <Settings2 size={18} /> <span className="sidebar-label">Restaurant settings</span>
            </SidebarMenuButton>
            {isSuperadmin && (
              <SidebarMenuButton className="nav-item" aria-label="Superadmin" onClick={() => navigate("/superadmin")}>
                <ShieldCheck size={18} /> <span className="sidebar-label">Superadmin</span>
              </SidebarMenuButton>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="sidebar-bottom">
          <div className="status-pill">
            <span className="live-dot" /> <span className="sidebar-label">Live menu</span>
          </div>
          <button
            className="view-link"
            onClick={() => selectedRestaurant && navigate(`/${selectedRestaurant.slug}`)}
          >
            <ArrowUpRight size={15} /> <span className="sidebar-label">View public menu</span>
          </button>
        </SidebarFooter>
      </Sidebar>
      <section className="admin-main">
        <header className="admin-header">
          <div className="admin-heading-group">
            <button className="mobile-back" onClick={() => navigate("/")}>
              <ArrowLeft size={17} />
            </button>
            <div className="admin-heading-copy">
              <p className="section-kicker">Workspace</p>
               <span className="admin-heading-title">
                 {tab === "menu"
                   ? "Your menu"
                   : tab === "menu-settings"
                      ? "Restaurant settings"
                     : tab === "waitlist"
                      ? "Waitlist"
                     : "Account settings"}
               </span>
            </div>
          </div>
          <div className="admin-user-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="admin-user">
                  <div className="user-avatar">
                    {sessionQuery.data?.user.name.slice(0, 2).toUpperCase() ?? "AM"}
                  </div>
                  <span>{sessionQuery.data?.user.name ?? "Alex Morgan"}</span>
                  <ChevronDown size={15} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={10} className="account-menu-content">
                <div className="account-summary">
                  <strong>{sessionQuery.data?.user.name}</strong>
                  <span>{sessionQuery.data?.user.email}</span>
                </div>
                <DropdownMenuItem className="popover-item" onSelect={() => setTab("account")}>
                  <Settings2 size={15} /> Account settings
                </DropdownMenuItem>
                <DropdownMenuItem className="popover-item danger" onSelect={signOut}>
                  <LogOut size={15} /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {!selectedRestaurant && tab !== "account" && tab !== "waitlist" ? (
          <div className="waitlist-empty" style={{ margin: 24 }}>
            <h3>No restaurant yet</h3>
            <p>Create your first restaurant to start building your menu.</p>
            <button className="button dark-button" onClick={() => setShowAddRestaurant(true)}>Create restaurant</button>
          </div>
        ) : tab === "menu" ? (
          <MenuManager
            items={items}
            onAdd={() => setShowAdd(true)}
            onArchive={itemActions.archive}
            onRestore={itemActions.restore}
            onUpdate={updateItem}
            onPublishItem={itemActions.publish}
            onDraftItem={itemActions.draft}
            onReorder={reorderItem}
            onPublish={publishAll}
            onUnpublish={async () => { if (!selectedRestaurant) return false; const { unpublishAdminMenu } = await import("../../api"); try { await unpublishAdminMenu(selectedRestaurant.id); setPublished(false); queryClient.invalidateQueries({ queryKey: ["admin", "restaurants"] }); queryClient.invalidateQueries({ queryKey: ["public-menu", selectedRestaurant.slug] }); toast({ title: "Menu unpublished", description: "Your public menu is now hidden." }); return true; } catch (err) { toast({ variant: "error", title: "Couldn't unpublish", description: errorMessage(err, "Please try again.") }); return false; } }}
            published={published}
            loading={itemsQuery.isFetching}
            loadingInitial={itemsQuery.isPending && !itemsQuery.error}
            loadError={itemsQuery.error instanceof Error ? itemsQuery.error.message : null}
            onRetry={() => itemsQuery.refetch()}
          />
        ) : tab === "waitlist" ? (
          <WaitlistPanel />
        ) : tab === "menu-settings" ? (
           selectedRestaurant ? <MenuSettingsPanel
             restaurant={selectedRestaurant}
             onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin", "restaurants"] })}
           /> : null
        ) : (
          <AccountSettingsPanel
            user={sessionQuery.data?.user}
            onDeleted={() => navigate("/login")}
          />
        )}
      </section>
      {showAdd && (
        <AddItemModal
          onClose={() => setShowAdd(false)}
          onAdd={(item) => addItem(item).then((saved) => {
            if (saved) setShowAdd(false);
          })}
        />
      )}
      {showAddRestaurant && <AddRestaurantModal onClose={() => setShowAddRestaurant(false)} onCreate={createRestaurant} />}
    </SidebarProvider>
  );
}
