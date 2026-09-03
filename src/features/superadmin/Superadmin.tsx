import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ChevronDown, ClipboardList, LogOut, Mail, ShieldCheck, Store, Users } from "lucide-react"
import { Logo } from "../../components"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "../../components/ui/sidebar"
import { archiveSuperadminItem, createSuperadminItem, deleteSuperadminRestaurant, deleteSuperadminUser, draftSuperadminItem, fetchSession, fetchSuperadminItems, fetchSuperadminMe, fetchSuperadminRestaurant, fetchSuperadminRestaurants, fetchSuperadminUsers, fetchSuperadminWaitlist, logout, publishSuperadminItem, publishSuperadminMenu, reorderSuperadminItem, restoreSuperadminItem, sendSuperadminBroadcast, setSuperadminVisibility, unpublishSuperadminMenu, updateSuperadminItem, updateSuperadminRestaurant, updateSuperadminUserRole, uploadSuperadminImage } from "../../api"
import { useToast } from "../../components/ui/toast"
import type { Navigate } from "../shared"
import { errorMessage } from "../shared"
import { WaitlistPanel } from "../workspace/WaitlistPanel"
import { MenuManager } from "../workspace/MenuManager"
import { AddItemModal } from "../workspace/AddItemModal"
import { Button } from "../../components"
import { Card } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Select } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
import type { MenuItem } from "../../data"


// Legacy redirect — /admin is canonical. Tabs are URL-driven via /admin/* routes.
export type SuperadminTab = "overview" | "waitlist" | "users" | "restaurants" | "broadcast"

export function Superadmin({ navigate }: { navigate: Navigate }) {
  useEffect(() => { navigate("/admin") }, [navigate])
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const sessionQuery = useQuery({ queryKey: ["auth", "session"], queryFn: fetchSession, staleTime: 30_000 })
  const meQuery = useQuery({ queryKey: ["superadmin", "me"], queryFn: fetchSuperadminMe, staleTime: 30_000, retry: false })

  useEffect(() => {
    if (sessionQuery.isSuccess && !sessionQuery.isFetching && !sessionQuery.data) navigate("/login")
  }, [sessionQuery.data, sessionQuery.isFetching, sessionQuery.isSuccess, navigate])

  const isSuperadmin = meQuery.data?.user.role === "superadmin"
  const isForbidden = meQuery.isError

  const signOut = async () => {
    try {
      await logout()
    } catch (err) {
      toast({ variant: "error", title: "Couldn't sign out", description: errorMessage(err, "Please try again.") })
      return
    }
    queryClient.setQueryData(["auth", "session"], null)
    queryClient.removeQueries({ queryKey: ["admin"] })
    queryClient.removeQueries({ queryKey: ["superadmin"] })
    navigate("/login")
  }

  if (meQuery.isPending) {
    return (
      <div className="admin-shell" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <p className="waitlist-loading">Checking access…</p>
      </div>
    )
  }

  if (isForbidden || !isSuperadmin) {
    return (
      <div className="admin-shell" style={{ display: "grid", placeItems: "center", minHeight: "60vh", padding: 24 }}>
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <p className="section-kicker">Superadmin</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>Forbidden</h1>
          <p style={{ color: "#777970", marginTop: 8, lineHeight: 1.6 }}>You don&apos;t have access to the superadmin dashboard. If you should, set <code>SUPERADMIN_EMAIL</code> to your account email and sign in again.</p>
          <button className="button dark-button" style={{ marginTop: 16 }} onClick={() => navigate("/admin")}>Back to workspace</button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-shell" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <p className="waitlist-loading">Mengalihkan ke /app…</p>
    </div>
  )
}

function UsersPanel() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["superadmin", "users"], queryFn: fetchSuperadminUsers, staleTime: 30_000 })

  async function setRole(id: string, role: "user" | "superadmin") {
    try {
      await updateSuperadminUserRole(id, role)
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "users"] })
      toast({ title: role === "superadmin" ? "Promoted to superadmin" : "Demoted to user" })
    } catch (err) {
      toast({ variant: "error", title: "Couldn't update role", description: errorMessage(err, "Please try again.") })
    }
  }

  async function removeUser(id: string) {
    if (!confirm("Delete this user? This cannot be undone.")) return
    try {
      await deleteSuperadminUser(id)
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "users"] })
      toast({ title: "User deleted" })
    } catch (err) {
      toast({ variant: "error", title: "Couldn't delete user", description: errorMessage(err, "Please try again.") })
    }
  }

  if (query.isPending) return <div className="waitlist-loading">Loading users…</div>
  if (query.isError) return <div className="waitlist-error-panel">{errorMessage(query.error, "Couldn't load users.")}</div>

  const users = query.data?.users ?? []
  if (!users.length) return <div className="waitlist-empty">No users yet.</div>

  return (
    <div className="superadmin-panel">
      <div className="superadmin-intro">
        <p className="section-kicker">Access control</p>
        <h1>Users</h1>
        <p>Manage roles and membership. Promote trusted accounts or remove access.</p>
      </div>
      <div className="waitlist-table-wrap">
        <div className="superadmin-table-meta">{users.length} {users.length === 1 ? "account" : "accounts"}</div>
        <table className="waitlist-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td className="waitlist-email" style={{ fontFamily: "monospace", fontSize: 12 }}>{u.email}</td>
                <td><span className={u.role === "superadmin" ? "badge badge--accent" : "badge"}>{u.role}</span></td>
                <td className="waitlist-date">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td style={{ textAlign: "right" }}>
                  <span style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end" }}>
                    {u.role === "user" ? (
                      <button className="button outline-button" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setRole(u.id, "superadmin")}>Make superadmin</button>
                    ) : (
                      <button className="button outline-button" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setRole(u.id, "user")}>Demote</button>
                    )}
                    <button className="button danger-button" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => removeUser(u.id)}>Delete</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


function RestaurantsPanel() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const query = useQuery({ queryKey: ["superadmin", "restaurants"], queryFn: fetchSuperadminRestaurants, staleTime: 30_000 })
  const queryClient = useQueryClient()
  const { toast } = useToast()

  if (query.isPending) return <div className="waitlist-loading">Loading restaurants…</div>
  if (query.isError) return <div className="waitlist-error-panel">{errorMessage(query.error, "Couldn't load restaurants.")}</div>

  const restaurants = query.data?.restaurants ?? []
  if (!restaurants.length) return <div className="waitlist-empty">No restaurants yet.</div>

  if (selectedId) {
    return <SuperadminRestaurantDetail restaurantId={selectedId} onBack={() => setSelectedId(null)} />
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its menu items? This cannot be undone.`)) return
    try {
      await deleteSuperadminRestaurant(id)
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "restaurants"] })
      toast({ title: "Restaurant deleted", description: name })
    } catch (err) {
      toast({ variant: "error", title: "Couldn't delete", description: errorMessage(err, "Please try again.") })
    }
  }

  const toggleVisibility = async (id: string, published: number) => {
    try {
      await setSuperadminVisibility(id, !published)
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "restaurants"] })
    } catch (err) {
      toast({ variant: "error", title: "Couldn't update", description: errorMessage(err, "Please try again.") })
    }
  }

  return (
    <div className="superadmin-panel">
      <div className="superadmin-intro">
        <p className="section-kicker">Directory</p>
        <h1>Restaurants</h1>
        <p>Every workspace on the platform. Click a row to manage its menu and settings.</p>
      </div>
      <div className="waitlist-table-wrap">
        <div className="superadmin-table-meta">{restaurants.length} total · {restaurants.filter((r) => r.published).length} published</div>
        <table className="waitlist-table">
          <thead>
            <tr>
              <th>Restaurant</th>
              <th>Slug</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r.id} onClick={() => setSelectedId(r.id)} style={{ cursor: "pointer" }}>
                <td>
                  <strong style={{ color: "#242622" }}>{r.name}</strong>
                  <div className="waitlist-muted" style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>{r.description || "—"}</div>
                </td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>/{r.slug}</td>
                <td style={{ fontFamily: "monospace", fontSize: 11 }}>{r.ownerEmail ?? r.ownerId.slice(0, 8)}</td>
                <td>
                  <button className={r.published ? "badge badge--accent" : "badge"} onClick={(e) => { e.stopPropagation(); toggleVisibility(r.id, r.published) }} title="Toggle visibility">
                    {r.published ? "Published" : "Draft"}
                  </button>
                </td>
                <td className="waitlist-date">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td style={{ whiteSpace: "nowrap" }}><div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}><button className="button outline-button" style={{ padding: "4px 8px", fontSize: 12, whiteSpace: "nowrap" }} onClick={(e) => { e.stopPropagation(); setSelectedId(r.id) }}>Manage</button><button className="button outline-button" style={{ padding: "4px 8px", fontSize: 12, whiteSpace: "nowrap", color: "#b91c1c", borderColor: "#fecaca" }} onClick={(e) => { e.stopPropagation(); handleDelete(r.id, r.name) }}>Delete</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SuperadminRestaurantDetail({ restaurantId, onBack }: { restaurantId: string; onBack: () => void }) {
  const [tab, setTab] = useState<"menu" | "settings">("menu")
  const [showAdd, setShowAdd] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [visibility, setVisibility] = useState<boolean | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const restaurantQuery = useQuery({ queryKey: ["superadmin", "restaurant", restaurantId], queryFn: () => fetchSuperadminRestaurant(restaurantId), staleTime: 30_000 })
  const itemsQuery = useQuery({ queryKey: ["superadmin", "items", restaurantId], queryFn: () => fetchSuperadminItems(restaurantId).then(r => r.items), staleTime: 30_000 })

  const restaurant = restaurantQuery.data?.restaurant
  const items = itemsQuery.data ?? []
  const isPublished = visibility ?? Boolean(restaurant?.published)
  useEffect(() => {
    if (restaurant) setVisibility(Boolean(restaurant.published))
  }, [restaurant?.published])
  const handleAdd = async (item: MenuItem) => {
    try {
      await createSuperadminItem(restaurantId, item)
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "items", restaurantId] })
      setShowAdd(false)
      toast({ title: "Item added" })
      return true
    } catch (err) {
      toast({ variant: "error", title: "Couldn't add item", description: errorMessage(err, "Please try again.") })
      return false
    }
  }

  const handleUpdate = async (item: MenuItem) => {
    try {
      await updateSuperadminItem(restaurantId, item)
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "items", restaurantId] })
      setEditingItem(null)
      toast({ title: "Item updated" })
      return true
    } catch (err) {
      toast({ variant: "error", title: "Couldn't update", description: errorMessage(err, "Please try again.") })
      return false
    }
  }

  const runAction = async (id: string, action: () => Promise<unknown>, successMsg: string) => {
    try { await action(); await queryClient.invalidateQueries({ queryKey: ["superadmin", "items", restaurantId] }); toast({ title: successMsg }); return true } catch (err) { toast({ variant: "error", title: "Action failed", description: errorMessage(err, "Please try again.") }); return false }
  }
  const reorderTo = async (id: string, targetId: string) => {
    const sourceIndex = items.findIndex(item => item.id === id)
    const targetIndex = items.findIndex(item => item.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return true
    const reordered = [...items]
    ;[reordered[sourceIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[sourceIndex]]
    return runAction(id, async () => {
      await Promise.all(reordered.map((item, itemIndex) =>
        reorderSuperadminItem(restaurantId, item.id, itemIndex),
      ))
    }, "Order updated")
  }
  const updateMenuVisibility = async (next: boolean, action: () => Promise<unknown>, successMsg: string) => {
    const ok = await runAction(next ? "publish" : "unpublish", action, successMsg)
    if (ok) {
      setVisibility(next)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["superadmin", "restaurant", restaurantId] }),
        queryClient.invalidateQueries({ queryKey: ["superadmin", "restaurants"] }),
      ])
    }
    return ok
  }

  if (restaurantQuery.isPending) return <div className="waitlist-loading">Loading restaurant…</div>
  if (restaurantQuery.isError || !restaurant) return <div className="waitlist-error-panel">{errorMessage(restaurantQuery.error, "Couldn't load restaurant.")}</div>

  const publishedCount = items.filter(i => i.status === "PUBLISHED").length
  const draftCount = items.filter(i => i.status === "DRAFT").length

  return (
    <div className="superadmin-panel superadmin-detail">
      <button className="superadmin-back" onClick={onBack}><ArrowLeft size={14} /> Back to directory</button>
      <div className="superadmin-intro">
        <p className="section-kicker">Directory · {restaurant.slug}</p>
        <h1>{restaurant.name}</h1>
        <p>{restaurant.description || "No description yet."}</p>
        <div className="superadmin-detail-meta">
          <span className="superadmin-detail-slug">/{restaurant.slug}</span>
          <span className="superadmin-detail-dot">·</span>
          <span className="superadmin-detail-owner">{(restaurant as unknown as { ownerEmail?: string | null }).ownerEmail ?? restaurant.ownerId.slice(0, 8)}</span>
          <span className={isPublished ? "badge badge--accent" : "badge"}>{isPublished ? "Published" : "Draft"}</span>
          <a className="superadmin-detail-link" href={`/${restaurant.slug}`} target="_blank" rel="noreferrer">View public menu <ArrowLeft size={12} style={{ transform: "rotate(135deg)" }} /></a>
        </div>
      </div>

      <div className="superadmin-detail-stats">
        <div className="superadmin-detail-stat"><span className="superadmin-detail-stat-value">{items.length}</span><span className="superadmin-detail-stat-label">Items</span></div>
        <div className="superadmin-detail-stat"><span className="superadmin-detail-stat-value">{publishedCount}</span><span className="superadmin-detail-stat-label">Published</span></div>
        <div className="superadmin-detail-stat"><span className="superadmin-detail-stat-value">{draftCount}</span><span className="superadmin-detail-stat-label">Drafts</span></div>
        <div className="superadmin-detail-stat"><span className="superadmin-detail-stat-value">{isPublished ? "Live" : "Hidden"}</span><span className="superadmin-detail-stat-label">Visibility</span></div>
      </div>

      <div className="superadmin-detail-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "menu"} className={tab === "menu" ? "superadmin-detail-tab active" : "superadmin-detail-tab"} onClick={() => setTab("menu")}>Menu</button>
        <button role="tab" aria-selected={tab === "settings"} className={tab === "settings" ? "superadmin-detail-tab active" : "superadmin-detail-tab"} onClick={() => setTab("settings")}>Settings</button>
      </div>

      {tab === "menu" ? (
        <div className="superadmin-manager-wrap">
          <MenuManager
            variant="superadmin"
            items={items}
            onAdd={() => setShowAdd(true)}
            onArchive={(id) => runAction(id, () => archiveSuperadminItem(restaurantId, id), "Item archived")}
            onRestore={(id) => runAction(id, () => restoreSuperadminItem(restaurantId, id), "Item restored")}
            onUpdate={handleUpdate}
            onPublishItem={(id) => runAction(id, () => publishSuperadminItem(restaurantId, id), "Item published")}
            onDraftItem={(id) => runAction(id, () => draftSuperadminItem(restaurantId, id), "Item drafted")}
            onReorderTo={reorderTo}
            onReorder={async (id, dir) => {
              const index = items.findIndex(i => i.id === id)
              const target = index + dir
              if (index < 0 || target < 0 || target >= items.length) return false
              const reordered = [...items]
              ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
              return runAction(id, async () => {
                await Promise.all(reordered.map((item, itemIndex) =>
                  reorderSuperadminItem(restaurantId, item.id, itemIndex),
                ))
              }, "Order updated")
            }}
            onPublish={() => updateMenuVisibility(true, () => publishSuperadminMenu(restaurantId), "Menu published")}
            onUnpublish={() => updateMenuVisibility(false, () => unpublishSuperadminMenu(restaurantId), "Menu unpublished")}
            published={isPublished}
            loading={itemsQuery.isFetching}
            loadingInitial={itemsQuery.isPending}
            loadError={itemsQuery.error ? errorMessage(itemsQuery.error, "") : null}
            onRetry={() => itemsQuery.refetch()}
          />
          {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onAdd={handleAdd} superadminRestaurantId={restaurantId} />}
          {editingItem && <AddItemModal onClose={() => setEditingItem(null)} onSave={handleUpdate} initialItem={editingItem} superadminRestaurantId={restaurantId} />}
        </div>
      ) : (
        <SuperadminRestaurantSettings restaurant={restaurant} onSaved={() => queryClient.invalidateQueries({ queryKey: ["superadmin", "restaurant", restaurantId] })} />
      )}
    </div>
  )
}

function SuperadminRestaurantSettings({ restaurant, onSaved }: { restaurant: { id: string; slug: string; name: string; description: string; address: string; hours: string; story?: string; phone?: string; instagram?: string; hoursDetail?: string; promo?: { title: string; description?: string; badge?: string; validUntil?: string; type?: string } | null; published: number }; onSaved: () => void }) {
  const { toast } = useToast()
  const [name, setName] = useState(restaurant.name)
  const [slug, setSlug] = useState(restaurant.slug)
  const [description, setDescription] = useState(restaurant.description)
  const [address, setAddress] = useState(restaurant.address)
  const [hours, setHours] = useState(restaurant.hours)
  const [story, setStory] = useState(restaurant.story ?? "")
  const [phone, setPhone] = useState(restaurant.phone ?? "")
  const [instagram, setInstagram] = useState(restaurant.instagram ?? "")
  const [hoursDetail, setHoursDetail] = useState(restaurant.hoursDetail ?? "")
  const [promoTitle, setPromoTitle] = useState(restaurant.promo?.title ?? "")
  const [promoDescription, setPromoDescription] = useState(restaurant.promo?.description ?? "")
  const [promoBadge, setPromoBadge] = useState(restaurant.promo?.badge ?? "")
  const [promoValidUntil, setPromoValidUntil] = useState(restaurant.promo?.validUntil ?? "")
  const [promoType, setPromoType] = useState(restaurant.promo?.type ?? "custom")
  const [promoEnabled, setPromoEnabled] = useState(Boolean(restaurant.promo))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      const promo = promoEnabled && promoTitle.trim() ? { title: promoTitle.trim(), description: promoDescription.trim() || undefined, badge: promoBadge.trim() || undefined, validUntil: promoValidUntil.trim() || undefined, type: promoType as "bogo" | "discount" | "package" | "custom" } : null
      await updateSuperadminRestaurant(restaurant.id, { slug: normalizedSlug, name: name.trim(), description: description.trim(), address: address.trim(), hours: hours.trim(), story: story.trim(), phone: phone.trim(), instagram: instagram.trim().replace(/^@/, ""), hoursDetail: hoursDetail.trim(), promo })
      setSlug(normalizedSlug)
      toast({ title: "Restaurant updated" })
      onSaved()
    } catch (err) {
      toast({ variant: "error", title: "Couldn't save", description: errorMessage(err, "Please try again.") })
    } finally { setSaving(false) }
  }

  return (
    <div className="superadmin-settings-panel">
      <Card className="superadmin-settings-card">
        <div className="menu-settings-card-heading">
          <div><p className="section-kicker">Public identity</p><h3>{restaurant.name}</h3></div>
        </div>
        <div className="menu-settings-fields">
          <label>Restaurant name<Input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Slug<Input value={slug} onChange={(e) => setSlug(e.target.value)} /></label>
        </div>
        <label>Short description<Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></label>
        <label>Address<Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={240} /></label>
        <label>Opening hours<Input value={hours} onChange={(e) => setHours(e.target.value)} maxLength={240} /></label>
        <label>Story <span className="field-hint">Shown under the hero</span><Textarea value={story} onChange={(e) => setStory(e.target.value)} maxLength={500} placeholder="Wood-fired, market-led..." /></label>
        <div className="menu-settings-fields">
          <label>Phone<Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} placeholder="01273 456 789" /></label>
          <label>Instagram<Input value={instagram} onChange={(e) => setInstagram(e.target.value)} maxLength={64} placeholder="saltandember" /></label>
        </div>
        <label>Hours detail <span className="field-hint">Find Us card</span><Input value={hoursDetail} onChange={(e) => setHoursDetail(e.target.value)} maxLength={240} placeholder="Mon–Thu 5–11pm · Fri–Sat 5–11:30pm" /></label>
        <div className="superadmin-promo-card">
          <div className="superadmin-promo-header">
            <div><p className="section-kicker">Promo banner</p><p className="muted">Appears above the hero.</p></div>
            <button
              type="button"
              className={`settings-toggle ${promoEnabled ? "is-on" : ""}`}
              role="switch"
              aria-checked={promoEnabled}
              onClick={() => setPromoEnabled((enabled) => !enabled)}
            >
              <span className="settings-toggle-knob" />
              <span>{promoEnabled ? "Enabled" : "Disabled"}</span>
            </button>
          </div>
          {promoEnabled && (
            <div className="superadmin-promo-fields">
              <label>Title<Input value={promoTitle} onChange={(e) => setPromoTitle(e.target.value)} maxLength={80} placeholder="Feast for two — £48" /></label>
              <label>Description<Input value={promoDescription} onChange={(e) => setPromoDescription(e.target.value)} maxLength={240} /></label>
              <div className="menu-settings-fields">
                <label>Badge<Input value={promoBadge} onChange={(e) => setPromoBadge(e.target.value)} maxLength={32} placeholder="This week" /></label>
                <label>Valid until<Input value={promoValidUntil} onChange={(e) => setPromoValidUntil(e.target.value)} maxLength={64} placeholder="Until Sunday" /></label>
              </div>
              <label>Type<Select value={promoType} onChange={(e) => setPromoType(e.target.value)}><option value="custom">Custom</option><option value="bogo">BOGO</option><option value="discount">Discount</option><option value="package">Package</option></Select></label>
            </div>
          )}
        </div>
        <div className="settings-action-row">
          <Button variant="default" onClick={save} disabled={saving || !slug.trim()}>{saving ? "Saving..." : "Save settings"}</Button>
        </div>
      </Card>
    </div>
  )
}

export function OverviewPanel({ onNavigate }: { onNavigate: (tab: SuperadminTab) => void }) {
  const waitlistQuery = useQuery({ queryKey: ["superadmin", "waitlist"], queryFn: fetchSuperadminWaitlist, staleTime: 30_000 })
  const usersQuery = useQuery({ queryKey: ["superadmin", "users"], queryFn: fetchSuperadminUsers, staleTime: 30_000 })
  const restaurantsQuery = useQuery({ queryKey: ["superadmin", "restaurants"], queryFn: fetchSuperadminRestaurants, staleTime: 30_000 })
  const waitlistCount = waitlistQuery.data?.entries.length ?? "\u2014"
  const usersCount = usersQuery.data?.users.length ?? "\u2014"
  const restaurantsCount = restaurantsQuery.data?.restaurants.length ?? "\u2014"
  const publishedCount = restaurantsQuery.data?.restaurants.filter((r) => r.published).length ?? "\u2014"
  const cards: Array<{ label: string; value: string | number; hint: string; tab: SuperadminTab }> = [
    { label: "Waitlist", value: waitlistCount, hint: "Pending invites", tab: "waitlist" },
    { label: "Users", value: usersCount, hint: "Total accounts", tab: "users" },
    { label: "Restaurants", value: restaurantsCount, hint: `${publishedCount} published`, tab: "restaurants" },
  ]
  return (
    <div className="superadmin-panel">
      <div className="superadmin-intro">
        <p className="section-kicker">Command center</p>
        <h1>Overview</h1>
        <p>Platform at a glance. No personal restaurant — this is your control room.</p>
      </div>
      <div className="superadmin-stats">
        {cards.map((card) => (
          <button key={card.label} onClick={() => onNavigate(card.tab)} className="superadmin-stat-card">
            <span className="superadmin-stat-label">{card.label}</span>
            <span className="superadmin-stat-value">{card.value}</span>
            <span className="superadmin-stat-hint">{card.hint}</span>
          </button>
        ))}
      </div>
      <div className="superadmin-actions">
        <button className="button dark-button" onClick={() => onNavigate("broadcast")}>Send broadcast</button>
        <button className="button outline-button" onClick={() => onNavigate("users")}>Manage users</button>
      </div>
    </div>
  )
}

function BroadcastPanel() {
  const { toast } = useToast()
  const [audience, setAudience] = useState<"waitlist" | "users" | "all">("waitlist")
  const [subject, setSubject] = useState("")
  const [html, setHtml] = useState("")
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!subject.trim() || !html.trim() || !text.trim()) {
      toast({ variant: "error", title: "Missing fields", description: "Subject, HTML, and text are required." })
      return
    }
    setSending(true)
    try {
      const res = await sendSuperadminBroadcast({ audience, subject: subject.trim(), html, text })
      if (res.skipped) {
        toast({ variant: "error", title: "Email not configured", description: res.reason ?? "Set RESEND_API_KEY." })
      } else {
        toast({ title: "Broadcast sent", description: `Sent to ${res.sent} recipient(s).` })
        setSubject("")
        setHtml("")
        setText("")
      }
    } catch (err) {
      toast({ variant: "error", title: "Couldn't send", description: errorMessage(err, "Please try again.") })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="superadmin-panel">
      <div className="superadmin-intro">
        <p className="section-kicker">Broadcast</p>
        <h1>Send promotion email</h1>
        <p>Resend via <code>RESEND_API_KEY</code> + <code>EMAIL_FROM</code>. Delivery is batched (100 recipients per call).</p>
      </div>
      <div className="superadmin-form-card">
        <label className="superadmin-field">
          <span className="superadmin-field-label">Audience</span>
          <select value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
            <option value="waitlist">Waitlist</option>
            <option value="users">Users</option>
            <option value="all">All (waitlist + users, deduped)</option>
          </select>
        </label>
        <label className="superadmin-field" style={{ marginTop: 16 }}>
          <span className="superadmin-field-label">Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Your Menusa update" />
        </label>
        <label className="superadmin-field" style={{ marginTop: 16 }}>
          <span className="superadmin-field-label">HTML body (wrapped in Menusa template)</span>
          <textarea value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<p>Hello...</p>" rows={5} />
        </label>
        <label className="superadmin-field" style={{ marginTop: 16 }}>
          <span className="superadmin-field-label">Text body</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Hello..." rows={5} />
        </label>
        <button className="button dark-button" onClick={handleSend} disabled={sending} style={{ marginTop: 20 }}>
          {sending ? "Sending…" : "Send broadcast"}
        </button>
      </div>
    </div>
  )
}
