import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { deleteSuperadminRestaurant, fetchSuperadminRestaurants, fetchSuperadminUsers, setSuperadminVisibility, transferSuperadminRestaurantOwnership } from "../../api"
import { errorMessage } from "../shared"
import { useToast } from "../../components/ui/toast"
import { useTableState } from "../../lib/useTableState"
import { DataTable, type ColumnDef } from "../../components/DataTable"
import { Button } from "../../components"
import { Select } from "../../components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog"
 

type Row = { id: string; name: string; slug: string; description: string; ownerEmail: string | null; ownerId: string; published: number; createdAt: string }

export function SuperadminRestaurantsPage() {
  const { t } = useTranslation("superadmin")
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const query = useQuery({ queryKey: ["superadmin", "restaurants"], queryFn: fetchSuperadminRestaurants, staleTime: 30_000 })
  const usersQuery = useQuery({ queryKey: ["superadmin", "users"], queryFn: fetchSuperadminUsers, staleTime: 30_000 })

  if (query.isPending) return <div className="waitlist-loading">Memuat restoran…</div>
  if (query.isError) return <div className="waitlist-error-panel">{errorMessage(query.error, "Couldn't load restaurants.")}</div>

  const restaurants = (query.data?.restaurants ?? []) as Row[]
  const users = usersQuery.data?.users ?? []

  const openRestaurant = (id: string) => {
    const restaurant = restaurants.find((entry) => entry.id === id)
    if (restaurant) void navigate({ to: "/admin/restaurant/$slug", params: { slug: restaurant.slug } })
  }

  return <RestaurantsTable restaurants={restaurants} users={users} tNoResults={t("noRestaurants")} onSelect={openRestaurant} onRefresh={() => { void queryClient.invalidateQueries({ queryKey: ["superadmin", "restaurants"] }); void queryClient.invalidateQueries({ queryKey: ["superadmin", "users"] }) }} toast={toast} />
}

function RestaurantsTable({ restaurants, users, tNoResults, onSelect, onRefresh, toast }: { restaurants: Row[]; users: Array<{ id: string; name: string; email: string }>; tNoResults: string; onSelect: (id: string) => void; onRefresh: () => void; toast: ReturnType<typeof useToast>["toast"] }) {
  const [transferTarget, setTransferTarget] = useState<Row | null>(null)
  const table = useTableState<Row & Record<string, unknown>>({
    data: restaurants as unknown as Array<Row & Record<string, unknown>>,
    searchKeys: ["name", "slug", "ownerEmail" as string],
    defaultSort: "createdAt",
    defaultOrder: "desc",
  })

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus "${name}" dan semua item menunya? Tidak bisa dibatalkan.`)) return
    try {
      await deleteSuperadminRestaurant(id)
      onRefresh()
      toast({ title: "Restoran dihapus", description: name })
    } catch (err) {
      toast({ variant: "error", title: "Gagal menghapus", description: errorMessage(err, "Coba lagi.") })
    }
  }

  const toggleVisibility = async (id: string, published: number) => {
    try {
      await setSuperadminVisibility(id, !published)
      onRefresh()
    } catch (err) {
      toast({ variant: "error", title: "Gagal memperbarui", description: errorMessage(err, "Coba lagi.") })
    }
  }

  const columns: ColumnDef<Row & Record<string, unknown>>[] = [
    { accessorKey: "name", header: "Restoran", sortable: true, cell: (r) => <><strong style={{ color: "#242622" }}>{r.name}</strong><div className="waitlist-muted" style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>{(r.description as string) || "—"}</div></> },
    { accessorKey: "slug", header: "Slug", sortable: true, cell: (r) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>/{r.slug}</span> },
    { accessorKey: "ownerEmail", header: "Owner", sortable: true, cell: (r) => <span style={{ fontFamily: "monospace", fontSize: 11 }}>{(r.ownerEmail as string) ?? (r.ownerId as string).slice(0, 8)}</span> },
    { accessorKey: "published", header: "Status", sortable: true, filterType: "select", filterOptions: [{ value: "1", label: "Published" }, { value: "0", label: "Draft" }], cell: (r) => <button className={r.published ? "badge badge--accent" : "badge"} onClick={(e) => { e.stopPropagation(); void toggleVisibility(r.id as string, r.published as number) }}>{r.published ? "Published" : "Draft"}</button> },
    { accessorKey: "createdAt", header: "Dibuat", sortable: true, cell: (r) => <span className="waitlist-date">{new Date(r.createdAt as string).toLocaleDateString("id-ID")}</span> },
    { accessorKey: "_actions", header: "", cell: (r) => <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><button className="button outline-button" style={{ padding: "4px 8px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onSelect(r.id as string) }}>Kelola</button><button className="button outline-button" style={{ padding: "4px 8px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); setTransferTarget(r as unknown as Row) }}>Pindah owner</button><button className="button outline-button" style={{ padding: "4px 8px", fontSize: 12, color: "#b91c1c", borderColor: "#fecaca" }} onClick={(e) => { e.stopPropagation(); void handleDelete(r.id as string, r.name as string) }}>Hapus</button></span> },
  ]

  return (
    <div className="superadmin-panel">
      <div className="superadmin-intro">
        <p className="section-kicker">Directory</p>
        <h1>Restoran</h1>
        <p>Semua workspace di platform. Klik baris untuk mengelola menu dan pengaturan.</p>
        <div className="superadmin-table-meta" style={{ marginTop: 8 }}>{restaurants.length} total · {restaurants.filter((r) => r.published).length} published</div>
      </div>
      <DataTable data={restaurants as unknown as Array<Row & Record<string, unknown>>} columns={columns} filteredData={table.filtered} q={table.q} setQ={table.setQ} sortKey={table.sortKey} sortDir={table.sortDir} onSort={table.toggleSort} filters={table.filters} setFilter={table.setFilter} onClearFilters={table.clearFilters} emptyLabel={tNoResults} onRowClick={(r) => onSelect(r.id as string)} />
      {transferTarget && <TransferOwnerDialog restaurant={transferTarget} users={users} onClose={() => setTransferTarget(null)} onSaved={() => { setTransferTarget(null); onRefresh() }} />}
    </div>
  )
}
function TransferOwnerDialog({ restaurant, users, onClose, onSaved }: { restaurant: Row; users: Array<{ id: string; name: string; email: string }>; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const eligibleUsers = users.filter((user) => user.id !== restaurant.ownerId)
  const [ownerId, setOwnerId] = useState(eligibleUsers[0]?.id ?? "")
  const [removePreviousOwnerAccess, setRemovePreviousOwnerAccess] = useState(true)
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ownerId) return
    setLoading(true)
    try {
      await transferSuperadminRestaurantOwnership(restaurant.id, ownerId, removePreviousOwnerAccess)
      const owner = eligibleUsers.find((user) => user.id === ownerId)
      toast({ title: "Ownership dipindahkan", description: `${restaurant.name} · ${owner?.email ?? ownerId}` })
      onSaved()
    } catch (err) {
      toast({ variant: "error", title: "Gagal memindahkan ownership", description: errorMessage(err, "Coba lagi.") })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pindah owner</DialogTitle>
          <p className="superadmin-assignment-hint">Pilih pengguna yang akan memiliki {restaurant.name}. Transfer ini dapat sekaligus menghapus akses owner sebelumnya.</p>
        </DialogHeader>
        <form onSubmit={submit} className="superadmin-form">
          {eligibleUsers.length ? <>
            <label>Owner baru<Select value={ownerId} onValueChange={setOwnerId}>
              {eligibleUsers.map((user) => <option value={user.id} key={user.id}>{user.name} · {user.email}</option>)}
            </Select></label>
            <label className="superadmin-transfer-access-option">
              <input type="checkbox" checked={removePreviousOwnerAccess} onChange={(event) => setRemovePreviousOwnerAccess(event.target.checked)} />
              <span>Hapus akses owner lama dari restoran ini</span>
            </label>
          </> : <p className="field-hint">Belum ada pengguna lain. Buat pengguna terlebih dahulu untuk memindahkan ownership.</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading || !eligibleUsers.length || !ownerId}>{loading ? "Menyimpan…" : "Pindahkan owner"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
