import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { deleteSuperadminUser, fetchSuperadminRestaurants, fetchSuperadminUsers, updateSuperadminUserRole, createSuperadminUser, updateSuperadminUser, resetSuperadminPassword } from "../../api"
import { errorMessage } from "../shared"
import { useToast } from "../../components/ui/toast"
import { Button } from "../../components"
import { Input } from "../../components/ui/input"
import { Select } from "../../components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { useTableState } from "../../lib/useTableState"
import { DataTable, type ColumnDef } from "../../components/DataTable"
import type { SuperadminUser } from "../../api"
type RestaurantOption = { id: string; name: string; ownerId?: string }

export function SuperadminUsersPage() {
  const { t } = useTranslation("superadmin")
  const { t: tCommon } = useTranslation("common")
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<SuperadminUser | null>(null)
  const [assignmentTarget, setAssignmentTarget] = useState<SuperadminUser | null>(null)
  const [resetTarget, setResetTarget] = useState<SuperadminUser | null>(null)

  const query = useQuery({ queryKey: ["superadmin", "users"], queryFn: fetchSuperadminUsers, staleTime: 30_000 })
  const restaurantsQuery = useQuery({ queryKey: ["superadmin", "restaurants"], queryFn: fetchSuperadminRestaurants, staleTime: 30_000 })

  const users = query.data?.users ?? []
  const restaurants = restaurantsQuery.data?.restaurants ?? []
  const restaurantNames = new Map(restaurants.map((restaurant) => [restaurant.id, restaurant.name]))

  const table = useTableState<SuperadminUser & Record<string, unknown>>({
    data: users as unknown as Array<SuperadminUser & Record<string, unknown>>,
    searchKeys: ["name", "email", "username" as string, "role", "restaurantIds"],
    defaultSort: "createdAt",
    defaultOrder: "desc",
  })

  const setRole = async (id: string, role: "user" | "superadmin") => {
    try {
      await updateSuperadminUserRole(id, role)
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "users"] })
      toast({ title: role === "superadmin" ? "Promoted to superadmin" : "Demoted to user" })
    } catch (err) {
      toast({ variant: "error", title: "Couldn't update role", description: errorMessage(err, "Please try again.") })
    }
  }

  const removeUser = async (id: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return
    try {
      await deleteSuperadminUser(id)
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "users"] })
      toast({ title: "User deleted" })
    } catch (err) {
      toast({ variant: "error", title: "Couldn't delete user", description: errorMessage(err, "Please try again.") })
    }
  }

  const columns: ColumnDef<SuperadminUser & Record<string, unknown>>[] = [
    { accessorKey: "name", header: t("name"), sortable: true },
    { accessorKey: "email", header: t("email"), sortable: true, cell: (u) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{u.email}</span> },
    { accessorKey: "username", header: t("username"), sortable: true, cell: (u) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{(u.username as string) ?? "—"}</span> },
    { accessorKey: "role", header: t("role"), sortable: true, filterType: "select", filterOptions: [{ value: "user", label: "user" }, { value: "superadmin", label: "superadmin" }], cell: (u) => <span className={u.role === "superadmin" ? "badge badge--accent" : "badge"}>{u.role}</span> },
    {
      accessorKey: "restaurantIds",
      header: t("assignedRestaurants"),
      sortable: false,
      cell: (u) => {
        const ids = Array.isArray(u.restaurantIds) ? u.restaurantIds as string[] : []
        return ids.length
          ? <span className="superadmin-assignment-list">{ids.map((id) => <span className="badge" key={id}>{restaurantNames.get(id) ?? id.slice(0, 8)}</span>)}</span>
          : <span className="waitlist-muted">—</span>
      },
    },
    { accessorKey: "createdAt", header: tCommon("createdAt" as never) ?? "Created", sortable: true, cell: (u) => <span className="waitlist-date">{new Date(u.createdAt).toLocaleDateString("id-ID")}</span> },
    {
      accessorKey: "_actions", header: "", cell: (u) => (
        <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="button outline-button" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => setAssignmentTarget(u as unknown as SuperadminUser)}>Atur restoran</button>
          <button className="button outline-button" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => setEditing(u as unknown as SuperadminUser)}>Ubah</button>
          <button className="button outline-button" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => setResetTarget(u as unknown as SuperadminUser)}>Reset sandi</button>
          {u.role === "user" ? <button className="button outline-button" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => setRole(u.id, "superadmin")}>Jadikan superadmin</button> : <button className="button outline-button" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => setRole(u.id, "user")}>Demote</button>}
          <button className="button danger-button" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => removeUser(u.id)}>Hapus</button>
        </span>
      ),
    },
  ]

  return (
    <div className="superadmin-panel">
      <div className="superadmin-intro">
        <p className="section-kicker">Access control</p>
        <h1>{t("users")}</h1>
        <p>Kelola peran dan penugasan restoran. Buat akun baru atau ubah yang sudah ada.</p>
        <div style={{ marginTop: 12 }}><Button onClick={() => setShowCreate(true)}>{t("createUser")}</Button></div>
      </div>
      <DataTable
        data={users as unknown as Array<SuperadminUser & Record<string, unknown>>}
        columns={columns}
        filteredData={table.filtered}
        q={table.q}
        setQ={table.setQ}
        sortKey={table.sortKey}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        filters={table.filters}
        setFilter={table.setFilter}
        onClearFilters={table.clearFilters}
        emptyLabel={t("noUsers")}
      />
      {showCreate && <CreateUserDialog onClose={() => setShowCreate(false)} restaurants={restaurants} onCreated={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ["superadmin", "users"] }) }} />}
      {assignmentTarget && <AssignRestaurantDialog user={assignmentTarget} restaurants={restaurants} onClose={() => setAssignmentTarget(null)} onSaved={() => { setAssignmentTarget(null); queryClient.invalidateQueries({ queryKey: ["superadmin", "users"] }) }} />}
      {editing && <EditUserDialog user={editing} restaurants={restaurants} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); queryClient.invalidateQueries({ queryKey: ["superadmin", "users"] }) }} />}
      {resetTarget && <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />}
    </div>
  )
}

function CreateUserDialog({ onClose, restaurants, onCreated }: { onClose: () => void; restaurants: RestaurantOption[]; onCreated: () => void }) {
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"user" | "superadmin">("user")
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createSuperadminUser({ name, username: username.toLowerCase(), email: email.toLowerCase(), password, role, restaurantIds: selectedRestaurants })
      toast({ title: "Pengguna dibuat" })
      onCreated()
    } catch (err) {
      toast({ variant: "error", title: "Gagal membuat pengguna", description: errorMessage(err, "Periksa kembali isian.") })
    } finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Buat Pengguna</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="superadmin-form">
          <label>Nama<Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></label>
          <label>Username (a-z, 0-9, _)<Input value={username} onChange={(e) => setUsername(e.target.value)} required pattern="^[a-z0-9_]{3,30}$" placeholder="budi_santoso" /></label>
          <label>Email<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Kata sandi<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></label>
          <label>Peran<Select value={role} onValueChange={(v) => setRole(v as never)}><option value="user">user</option><option value="superadmin">superadmin</option></Select></label>
          <fieldset>
            <legend>Restoran (opsional)</legend>
            {restaurants.map((r) => (
              <label key={r.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={selectedRestaurants.includes(r.id)} onChange={(e) => setSelectedRestaurants((prev) => e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id))} /> {r.name}
              </label>
            ))}
          </fieldset>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan…" : "Buat"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({ user, restaurants, onClose, onSaved }: { user: SuperadminUser; restaurants: RestaurantOption[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState((user as unknown as { username?: string }).username ?? "")
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role as "user" | "superadmin")
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>(() => {
    const ids = (user as unknown as { restaurantIds?: string[] }).restaurantIds
    return Array.isArray(ids) ? ids : []
  })
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateSuperadminUser(user.id, { name, username: username ? username.toLowerCase() : undefined, email: email.toLowerCase(), role, restaurantIds: selectedRestaurants })
      toast({ title: "Pengguna diperbarui" })
      onSaved()
    } catch (err) {
      toast({ variant: "error", title: "Gagal memperbarui", description: errorMessage(err, "Periksa kembali isian.") })
    } finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ubah Pengguna</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="superadmin-form">
          <label>Nama<Input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Username<Input value={username} onChange={(e) => setUsername(e.target.value)} pattern="^[a-z0-9_]{3,30}$" placeholder="budi_santoso" /></label>
          <label>Email<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Peran<Select value={role} onValueChange={(v) => setRole(v as never)}><option value="user">user</option><option value="superadmin">superadmin</option></Select></label>
          <fieldset>
            <legend>Restoran</legend>
            {restaurants.map((restaurant) => {
              const isOwner = restaurant.ownerId === user.id
              return (
                <label key={restaurant.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={isOwner || selectedRestaurants.includes(restaurant.id)} disabled={isOwner} onChange={(e) => setSelectedRestaurants((prev) => e.target.checked ? [...prev, restaurant.id] : prev.filter((x) => x !== restaurant.id))} /> {restaurant.name}{isOwner ? " · owner" : ""}
                </label>
              )
            })}
          </fieldset>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan…" : "Simpan"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
function AssignRestaurantDialog({ user, restaurants, onClose, onSaved }: { user: SuperadminUser; restaurants: RestaurantOption[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>(() => Array.isArray(user.restaurantIds) ? user.restaurantIds : [])
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateSuperadminUser(user.id, { restaurantIds: selectedRestaurants })
      toast({ title: "Restoran ditugaskan", description: `${selectedRestaurants.length} restoran untuk ${user.name}` })
      onSaved()
    } catch (err) {
      toast({ variant: "error", title: "Gagal menugaskan restoran", description: errorMessage(err, "Periksa kembali lalu coba lagi.") })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atur restoran</DialogTitle>
          <p className="superadmin-assignment-hint">{user.name} · pilih workspace yang dapat dikelola pengguna ini. Akses owner harus dipindahkan terlebih dahulu.</p>
        </DialogHeader>
        <form onSubmit={submit} className="superadmin-form">
        <fieldset className="superadmin-assignment-fieldset">
          <legend>Restoran</legend>
          {restaurants.length ? restaurants.map((restaurant) => {
            const isOwner = restaurant.ownerId === user.id
            return (
              <label className="superadmin-assignment-option" key={restaurant.id}>
                <input
                  type="checkbox"
                  checked={isOwner || selectedRestaurants.includes(restaurant.id)}
                  disabled={isOwner}
                  onChange={(event) => setSelectedRestaurants((current) => event.target.checked ? [...current, restaurant.id] : current.filter((id) => id !== restaurant.id))}
                />
                <span>{restaurant.name}{isOwner ? " · owner — transfer ownership before removing access" : ""}</span>
              </label>
            )
          }) : <p className="field-hint">Belum ada restoran yang tersedia.</p>}
        </fieldset>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading || !restaurants.length}>{loading ? "Menyimpan…" : "Simpan penugasan"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordDialog({ user, onClose }: { user: SuperadminUser; onClose: () => void }) {
  const { toast } = useToast()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { toast({ variant: "error", title: "Kata sandi tidak cocok" }); return }
    if (password.length < 8) { toast({ variant: "error", title: "Kata sandi minimal 8 karakter" }); return }
    setLoading(true)
    try {
      await resetSuperadminPassword(user.id, password)
      toast({ title: "Kata sandi diatur ulang" })
      onClose()
    } catch (err) {
      toast({ variant: "error", title: "Gagal mengatur ulang", description: errorMessage(err, "Coba lagi.") })
    } finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Atur Ulang Kata Sandi — {user.name}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="superadmin-form">
          <label>Kata sandi baru<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></label>
          <label>Konfirmasi<Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} /></label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan…" : "Atur ulang"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
