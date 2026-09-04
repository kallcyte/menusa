import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, ClipboardList, LogOut, Mail, QrCode, Settings2, ShieldCheck, Store, Users, UtensilsCrossed, Tag } from "lucide-react"
import { Logo } from "../../components"
import { LanguageSwitcher } from "../../components/LanguageSwitcher"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../../components/ui/dropdown-menu"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "../../components/ui/sidebar"
import { createAdminRestaurant, fetchAdminRestaurants, fetchSession, fetchSuperadminMe, logout } from "../../api"
import { useToast } from "../../components/ui/toast"
import { errorMessage } from "../shared"
import { AddRestaurantModal } from "../workspace/AddRestaurantModal"
import { useTranslation } from "react-i18next"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common")
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [restaurantId, setRestaurantId] = useState("")
  const [showAddRestaurant, setShowAddRestaurant] = useState(false)

  const sessionQuery = useQuery({ queryKey: ["auth", "session"], queryFn: fetchSession, staleTime: 30_000 })
  const meQuery = useQuery({ queryKey: ["superadmin", "me"], queryFn: fetchSuperadminMe, staleTime: 30_000, retry: false, enabled: typeof window !== 'undefined' })
  const isSuperadmin = meQuery.data?.user.role === "superadmin"
  const isRoleLoading = meQuery.isPending
  const isRegularUser = !isRoleLoading && !isSuperadmin

  useEffect(() => {
    if (sessionQuery.isSuccess && !sessionQuery.isFetching && !sessionQuery.data) void navigate({ to: "/login" })
  }, [sessionQuery.data, sessionQuery.isFetching, sessionQuery.isSuccess, navigate])

  const restaurantsQuery = useQuery({ queryKey: ["admin", "restaurants"], queryFn: fetchAdminRestaurants, staleTime: 30_000, enabled: isRegularUser })
  const ownedRestaurants = restaurantsQuery.data?.restaurants ?? []
  const selectedRestaurant = ownedRestaurants.find((r) => r.id === restaurantId) ?? ownedRestaurants[0] ?? null

  useEffect(() => {
    if (ownedRestaurants[0] && !ownedRestaurants.some((r) => r.id === restaurantId)) setRestaurantId(ownedRestaurants[0].id)
  }, [ownedRestaurants, restaurantId])

  const pathname = location.pathname
  const isRootPath = pathname === "/admin" || pathname === "/admin/" || pathname === "/app" || pathname === "/app/"
  const routePath = pathname.replace(/^\/app/, "/admin")
  const activeTab =
    isRootPath ? (isRoleLoading ? "loading" : isSuperadmin ? "overview" : "menu") :
    (routePath.startsWith("/admin/add") || routePath.startsWith("/admin/edit/")) ? (isSuperadmin ? "restaurants" : "menu") :
    routePath.startsWith("/admin/qr") ? "qr" :
    routePath.startsWith("/admin/menu-settings") ? "menu-settings" :
    routePath.startsWith("/admin/waitlist") ? "waitlist" :
    routePath.startsWith("/admin/account") ? "account" :
    routePath.startsWith("/admin/promos") ? "promos" :
    routePath.startsWith("/admin/users") ? "users" :
    routePath.startsWith("/admin/restaurant/") || routePath.startsWith("/admin/restaurants") ? "restaurants" :
    routePath.startsWith("/admin/campaigns") ? "campaigns" :
    "menu"

  const headingTitle =
    isRoleLoading ? "Memuat workspace…" :
    activeTab === "overview" ? "Overview" :
    activeTab === "menu" ? t("admin:menu") :
    activeTab === "qr" ? "QR code" :
    activeTab === "menu-settings" ? t("admin:menuSettings") :
    activeTab === "waitlist" ? "Waitlist" :
    activeTab === "promos" ? t("admin:promos") :
    activeTab === "users" ? t("superadmin:users") :
    activeTab === "restaurants" ? t("superadmin:restaurants") :
    activeTab === "campaigns" ? t("superadmin:campaigns") :
    t("admin:account")

  const createRestaurant = async (input: Parameters<typeof createAdminRestaurant>[0]) => {
    try {
      const result = await createAdminRestaurant(input)
      await queryClient.invalidateQueries({ queryKey: ["admin", "restaurants"] })
      setRestaurantId(result.restaurant.id)
      setShowAddRestaurant(false)
      toast({ title: `${input.name} dibuat`, description: "Workspace menu baru siap." })
      return true
    } catch (err) {
      toast({ variant: "error", title: "Gagal membuat restoran", description: errorMessage(err, "Coba lagi.") })
      return false
    }
  }

  const signOut = async () => {
    try { await logout() } catch (err) {
      toast({ variant: "error", title: "Gagal keluar", description: errorMessage(err, "Coba lagi.") })
      return
    }
    queryClient.setQueryData(["auth", "session"], null)
    queryClient.removeQueries({ queryKey: ["admin"] })
    queryClient.removeQueries({ queryKey: ["superadmin"] })
    void navigate({ to: "/login" })
  }

  return (
    <SidebarProvider className="admin-shell">
      <Sidebar className="admin-sidebar">
        <SidebarHeader className="admin-sidebar-header">
          <Logo />
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent className="admin-sidebar-content">
          {isRegularUser && (
            <div className="admin-restaurant-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="admin-restaurant">
                    <div className="restaurant-avatar">{selectedRestaurant?.name[0] ?? "?"}</div>
                    <div>
                      <strong>{selectedRestaurant?.name ?? "Belum ada restoran"}</strong>
                      <span>{ownedRestaurants.length} restoran</span>
                    </div>
                    <ChevronDown size={15} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={8} className="restaurant-menu-content">
                  {ownedRestaurants.map((r) => (
                    <DropdownMenuItem key={r.id} className="popover-item" onSelect={() => setRestaurantId(r.id)}>
                      <span className="restaurant-avatar small">{r.name[0]}</span>
                      <span>{r.name}</span>
                      {r.id === selectedRestaurant?.id && <Check size={14} />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="popover-add" onSelect={() => setShowAddRestaurant(true)}>
                    <Store size={14} /> Tambah restoran
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <SidebarMenu>
            {isRoleLoading ? null : isRegularUser ? (
              <>
                <Link to="/admin" className={activeTab === "menu" ? "nav-item selected" : "nav-item"}><UtensilsCrossed size={18} /> <span className="sidebar-label">{t("admin:menu")}</span></Link>
                <Link to="/admin/promos" className={activeTab === "promos" ? "nav-item selected" : "nav-item"}><Tag size={18} /> <span className="sidebar-label">{t("admin:promos")}</span></Link>
                <Link to="/admin/qr" className={activeTab === "qr" ? "nav-item selected" : "nav-item"}><QrCode size={18} /> <span className="sidebar-label">QR code</span></Link>
                <Link to="/admin/menu-settings" className={activeTab === "menu-settings" ? "nav-item selected" : "nav-item"}><Settings2 size={18} /> <span className="sidebar-label">{t("admin:menuSettings")}</span></Link>
              </>
            ) : (
              <>
                <Link to="/admin" className={activeTab === "overview" ? "nav-item selected" : "nav-item"}><ShieldCheck size={18} /> <span className="sidebar-label">Overview</span></Link>
                <Link to="/admin/users" className={activeTab === "users" ? "nav-item selected" : "nav-item"}><Users size={18} /> <span className="sidebar-label">{t("superadmin:users")}</span></Link>
                <Link to="/admin/restaurants" className={activeTab === "restaurants" ? "nav-item selected" : "nav-item"}><Store size={18} /> <span className="sidebar-label">{t("superadmin:restaurants")}</span></Link>
                <Link to="/admin/campaigns" className={activeTab === "campaigns" ? "nav-item selected" : "nav-item"}><Mail size={18} /> <span className="sidebar-label">{t("superadmin:campaigns")}</span></Link>
                <Link to="/admin/waitlist" className={activeTab === "waitlist" ? "nav-item selected" : "nav-item"}><ClipboardList size={18} /> <span className="sidebar-label">Waitlist</span></Link>
              </>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="sidebar-bottom">
          <div className="status-pill"><span className="live-dot" /> <span className="sidebar-label">{isRoleLoading ? "Memuat akses" : isSuperadmin ? "Platform admin" : "Live menu"}</span></div>
          <div style={{ marginTop: 12 }}><LanguageSwitcher variant="compact" /></div>
        </SidebarFooter>
      </Sidebar>
      <section className="admin-main">
        <header className="admin-header">
          <div className="admin-heading-group">
            <button className="mobile-back" onClick={() => void navigate({ to: "/" })}><ArrowLeft size={17} /></button>
            <div className="admin-heading-copy">
              <p className="section-kicker">{isRoleLoading ? "Workspace" : isSuperadmin ? "Control room" : "Workspace"}</p>
              <span className="admin-heading-title">{headingTitle}</span>
            </div>
          </div>
          <div className="admin-header-actions">
            {isRegularUser && selectedRestaurant && <button className="admin-view-link" onClick={() => void navigate({ to: "/$slug" as never, params: { slug: selectedRestaurant.slug } as never })}>Lihat menu <ArrowUpRight size={14} /></button>}
            <div className="admin-user-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="admin-user">
                    <div className="user-avatar">{sessionQuery.data?.user.name.slice(0, 2).toUpperCase() ?? "AM"}</div>
                    <span>{sessionQuery.data?.user.name ?? "Alex Morgan"}</span>
                    <ChevronDown size={15} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={10} className="account-menu-content">
                  <div className="account-summary"><strong>{sessionQuery.data?.user.name}</strong><span>{sessionQuery.data?.user.email}</span></div>
                  <DropdownMenuItem className="popover-item" onSelect={() => void navigate({ to: "/admin/account-settings" })}><Settings2 size={15} /> {t("admin:account")}</DropdownMenuItem>
                  <DropdownMenuItem className="popover-item danger" onSelect={signOut}><LogOut size={15} /> {t("admin:signOut")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <div className="admin-main-inner">{children}</div>
      </section>
      {showAddRestaurant && <AddRestaurantModal onClose={() => setShowAddRestaurant(false)} onCreate={createRestaurant} />}
    </SidebarProvider>
  )
}
