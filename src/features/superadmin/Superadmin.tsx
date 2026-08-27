import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ChevronDown, ClipboardList, LogOut, Mail, ShieldCheck, Store, Users } from "lucide-react"
import { Logo } from "../../components"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "../../components/ui/sidebar"
import { deleteSuperadminUser, fetchAdminRestaurants, fetchSession, fetchSuperadminMe, fetchSuperadminRestaurants, fetchSuperadminUsers, fetchSuperadminWaitlist, logout, sendSuperadminBroadcast, updateSuperadminUserRole } from "../../api"
import { useToast } from "../../components/ui/toast"
import type { Navigate } from "../shared"
import { errorMessage } from "../shared"
import { WaitlistPanel } from "../workspace/WaitlistPanel"


type SuperadminTab = "waitlist" | "users" | "restaurants" | "broadcast"

export function Superadmin({ navigate, initialTab = "waitlist" }: { navigate: Navigate; initialTab?: SuperadminTab }) {
  const [tab, setTab] = useState<SuperadminTab>(initialTab)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  useEffect(() => {
    if (tab !== initialTab) {
      navigate(tab === "waitlist" ? "/superadmin" : tab === "users" ? "/superadmin/users" : tab === "restaurants" ? "/superadmin/restaurants" : "/superadmin/broadcast")
    }
  }, [initialTab, navigate, tab])

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
    <SidebarProvider className="admin-shell">
      <Sidebar className="admin-sidebar">
        <SidebarHeader className="admin-sidebar-header">
          <Logo />
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent className="admin-sidebar-content">
          <div className="admin-restaurant-wrap">
            <div className="admin-restaurant" style={{ cursor: "default" }}>
              <div className="restaurant-avatar" style={{ background: "#e75f45", color: "white" }}><ShieldCheck size={14} /></div>
              <div>
                <strong>Superadmin</strong>
                <span>Platform control</span>
              </div>
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuButton className={tab === "waitlist" ? "nav-item selected" : "nav-item"} aria-label="Waitlist" onClick={() => setTab("waitlist")}>
              <ClipboardList size={18} /> <span className="sidebar-label">Waitlist</span>
            </SidebarMenuButton>
            <SidebarMenuButton className={tab === "users" ? "nav-item selected" : "nav-item"} aria-label="Users" onClick={() => setTab("users")}>
              <Users size={18} /> <span className="sidebar-label">Users</span>
            </SidebarMenuButton>
            <SidebarMenuButton className={tab === "restaurants" ? "nav-item selected" : "nav-item"} aria-label="Restaurants" onClick={() => setTab("restaurants")}>
              <Store size={18} /> <span className="sidebar-label">Restaurants</span>
            </SidebarMenuButton>
            <SidebarMenuButton className={tab === "broadcast" ? "nav-item selected" : "nav-item"} aria-label="Broadcast" onClick={() => setTab("broadcast")}>
              <Mail size={18} /> <span className="sidebar-label">Broadcast</span>
            </SidebarMenuButton>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="sidebar-bottom">
          <button className="view-link" onClick={() => navigate("/admin")}>
            <ArrowLeft size={15} /> <span className="sidebar-label">Back to workspace</span>
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
              <p className="section-kicker">Superadmin</p>
              <span className="admin-heading-title">{tab === "waitlist" ? "Waitlist" : tab === "users" ? "Users" : tab === "restaurants" ? "Restaurants" : "Broadcast"}</span>
            </div>
          </div>
          <div className="admin-user-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="admin-user">
                  <div className="user-avatar">{sessionQuery.data?.user.name.slice(0, 2).toUpperCase() ?? "SA"}</div>
                  <span>{sessionQuery.data?.user.name ?? "Superadmin"}</span>
                  <ChevronDown size={15} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={10} className="account-menu-content">
                <div className="account-summary">
                  <strong>{sessionQuery.data?.user.name}</strong>
                  <span>{sessionQuery.data?.user.email}</span>
                </div>
                <DropdownMenuItem className="popover-item" onSelect={() => navigate("/admin")}>
                  <Store size={15} /> Workspace
                </DropdownMenuItem>
                <DropdownMenuItem className="popover-item danger" onSelect={signOut}>
                  <LogOut size={15} /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {tab === "waitlist" ? <WaitlistPanel queryKey={["superadmin", "waitlist"]} queryFn={fetchSuperadminWaitlist} /> : tab === "users" ? <UsersPanel /> : tab === "restaurants" ? <RestaurantsPanel /> : <BroadcastPanel />}
      </section>
    </SidebarProvider>
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
    <div className="waitlist-table-wrap">
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
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{u.email}</td>
              <td><span className={u.role === "superadmin" ? "badge badge--accent" : "badge"}>{u.role}</span></td>
              <td style={{ color: "#777970", fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
              <td style={{ textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {u.role === "user" ? (
                  <button className="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setRole(u.id, "superadmin")}>Make superadmin</button>
                ) : (
                  <button className="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setRole(u.id, "user")}>Demote</button>
                )}
                <button className="button" style={{ padding: "6px 10px", fontSize: 12, background: "#fff0ed", border: "1px solid #e75f45", color: "#b04b39" }} onClick={() => removeUser(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


function RestaurantsPanel() {
  const query = useQuery({ queryKey: ["superadmin", "restaurants"], queryFn: fetchSuperadminRestaurants, staleTime: 30_000 })
  // Also show owner's own count for context
  const ownQuery = useQuery({ queryKey: ["admin", "restaurants"], queryFn: fetchAdminRestaurants, staleTime: 30_000 })

  if (query.isPending) return <div className="waitlist-loading">Loading restaurants…</div>
  if (query.isError) return <div className="waitlist-error-panel">{errorMessage(query.error, "Couldn't load restaurants.")}</div>

  const restaurants = query.data?.restaurants ?? []
  if (!restaurants.length) return <div className="waitlist-empty">No restaurants yet.</div>

  return (
    <div className="waitlist-table-wrap">
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e3e3dd", color: "#777970", fontSize: 12 }}>
        {restaurants.length} total · {ownQuery.data?.restaurants.length ?? 0} owned by you
      </div>
      <table className="waitlist-table">
        <thead>
          <tr>
            <th>Restaurant</th>
            <th>Slug</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {restaurants.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>{r.name}</strong>
                <div style={{ color: "#777970", fontSize: 12, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</div>
              </td>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>/{r.slug}</td>
              <td style={{ fontFamily: "monospace", fontSize: 11 }}>{r.ownerEmail ?? r.ownerId.slice(0, 8)}</td>
              <td><span className={r.published ? "badge badge--accent" : "badge"}>{r.published ? "Published" : "Draft"}</span></td>
              <td style={{ color: "#777970", fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <div style={{ maxWidth: 640, padding: 24, display: "grid", gap: 16 }}>
      <div>
        <p className="section-kicker">Broadcast</p>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Send promotion email</h2>
        <p style={{ color: "#777970", fontSize: 13, marginTop: 4 }}>Resend via <code>RESEND_API_KEY</code> + <code>EMAIL_FROM</code>. Delivery is batched (100/recipients per call).</p>
      </div>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Audience</span>
        <select value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e3e3dd" }}>
          <option value="waitlist">Waitlist</option>
          <option value="users">Users</option>
          <option value="all">All (waitlist + users, deduped)</option>
        </select>
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Subject</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Your Digimenu update" style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e3e3dd" }} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>HTML body (wrapped in Digimenu template)</span>
        <textarea value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<p>Hello...</p>" rows={5} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e3e3dd", fontFamily: "monospace", fontSize: 12 }} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Text body</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Hello..." rows={5} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e3e3dd", fontFamily: "monospace", fontSize: 12 }} />
      </label>
      <button className="button dark-button" onClick={handleSend} disabled={sending} style={{ justifySelf: "start" }}>
        {sending ? "Sending…" : "Send broadcast"}
      </button>
    </div>
  )
}
