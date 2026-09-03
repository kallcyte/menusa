import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { createPromo, deletePromo, fetchAdminPromos, fetchAdminRestaurants, updatePromo } from "../../api"
import { errorMessage } from "../shared"
import { useToast } from "../../components/ui/toast"
import { Button } from "../../components"
import { Input } from "../../components/ui/input"
import { Select } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { useTableState } from "../../lib/useTableState"
import { DataTable, type ColumnDef } from "../../components/DataTable"
import { formatPrice } from "../../lib/currency"

type PromoRow = { id: string; title: string; description: string | null; badge: string | null; type: string; status: string; valid_from: string | null; valid_until: string | null; applies_to: string; applies_ids: string; stackable: number; min_purchase: number | null; created_at: string }

function parseAppliesIds(raw: string): string[] {
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [] } catch { return [] }
}

export function PromosPanel() {
  const { t } = useTranslation("admin")
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<PromoRow | null>(null)

  const restaurantsQuery = useQuery({ queryKey: ["admin", "restaurants"], queryFn: fetchAdminRestaurants, staleTime: 30_000 })
  const restaurant = restaurantsQuery.data?.restaurants?.[0] ?? null
  const currency = (restaurant as unknown as { currency?: string } | null)?.currency || "IDR"

  const query = useQuery({ queryKey: ["admin", "promos", restaurant?.id ?? "none"], queryFn: () => fetchAdminPromos(restaurant!.id), enabled: Boolean(restaurant), staleTime: 15_000 })
  const promos = (query.data?.promos ?? []) as PromoRow[]

  if (!restaurant) return <div className="waitlist-empty"><h3>Belum ada restoran</h3></div>
  if (query.isPending) return <div className="waitlist-loading">Memuat promo…</div>
  if (query.isError) return <div className="waitlist-error-panel">{errorMessage(query.error, "Gagal memuat promo.")}</div>

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus promo ini?")) return
    try { await deletePromo(id, restaurant.id); queryClient.invalidateQueries({ queryKey: ["admin", "promos"] }); toast({ title: "Promo dihapus" }) }
    catch (err) { toast({ variant: "error", title: "Gagal menghapus", description: errorMessage(err, "Coba lagi.") }) }
  }

  return (
    <div className="superadmin-panel">
      <div className="superadmin-intro">
        <p className="section-kicker">Promo</p>
        <h1>{t("promos")}</h1>
        <p>Buat diskon persentase, potongan tetap, BOGO, bundel, dan lainnya. Terapkan ke semua item, kategori, atau item tertentu.</p>
        <div style={{ marginTop: 12 }}><Button onClick={() => setShowCreate(true)}>Buat Promo</Button></div>
      </div>
      <PromosTable promos={promos} currency={currency} onEdit={setEditing} onDelete={handleDelete} />
      {showCreate && <PromoDialog restaurantId={restaurant.id} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ["admin", "promos"] }) }} />}
      {editing && <PromoDialog restaurantId={restaurant.id} promo={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); queryClient.invalidateQueries({ queryKey: ["admin", "promos"] }) }} />}
    </div>
  )
}

function PromosTable({ promos, currency, onEdit, onDelete }: { promos: PromoRow[]; currency: string; onEdit: (p: PromoRow) => void; onDelete: (id: string) => void }) {
  const table = useTableState<PromoRow & Record<string, unknown>>({
    data: promos as unknown as Array<PromoRow & Record<string, unknown>>,
    searchKeys: ["title", "type", "status"],
    defaultSort: "created_at",
    defaultOrder: "desc",
  })

  const columns: ColumnDef<PromoRow & Record<string, unknown>>[] = [
    { accessorKey: "title", header: "Judul", sortable: true },
    { accessorKey: "type", header: "Tipe", sortable: true, filterType: "select", filterOptions: [{ value: "percentage", label: "percentage" }, { value: "fixed", label: "fixed" }, { value: "bogo", label: "bogo" }, { value: "bundle", label: "bundle" }, { value: "custom", label: "custom" }] },
    { accessorKey: "status", header: "Status", sortable: true, filterType: "select", filterOptions: [{ value: "draft", label: "draft" }, { value: "active", label: "active" }, { value: "scheduled", label: "scheduled" }, { value: "archived", label: "archived" }] },
    { accessorKey: "valid_until", header: "Berlaku hingga", sortable: true, cell: (r) => (r.valid_until ? new Date(r.valid_until as string).toLocaleDateString("id-ID") : "—") },
    { accessorKey: "min_purchase", header: "Min. belanja", sortable: true, cell: (r) => (r.min_purchase != null ? formatPrice(r.min_purchase as number, currency, "id") : "—") },
    { accessorKey: "_actions", header: "", cell: (r) => <span style={{ display: "flex", gap: 6 }}><button className="button outline-button" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => onEdit(r as unknown as PromoRow)}>Ubah</button><button className="button outline-button" style={{ padding: "4px 8px", fontSize: 12, color: "#b91c1c", borderColor: "#fecaca" }} onClick={() => onDelete(r.id as string)}>Hapus</button></span> },
  ]

  return <DataTable data={promos as unknown as Array<PromoRow & Record<string, unknown>>} columns={columns} filteredData={table.filtered} q={table.q} setQ={table.setQ} sortKey={table.sortKey} sortDir={table.sortDir} onSort={table.toggleSort} filters={table.filters} setFilter={table.setFilter} onClearFilters={table.clearFilters} emptyLabel="Belum ada promo" />
}

function PromoDialog({ restaurantId, promo, onClose, onSaved }: { restaurantId: string; promo?: PromoRow | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [title, setTitle] = useState(promo?.title ?? "")
  const [description, setDescription] = useState(promo?.description ?? "")
  const [badge, setBadge] = useState(promo?.badge ?? "")
  const [type, setType] = useState(promo?.type ?? "percentage")
  const [status, setStatus] = useState(promo?.status ?? "draft")
  const [validFrom, setValidFrom] = useState(promo?.valid_from ?? "")
  const [validUntil, setValidUntil] = useState(promo?.valid_until ?? "")
  const [appliesTo, setAppliesTo] = useState(promo?.applies_to ?? "all")
  const [appliesIds, setAppliesIds] = useState(parseAppliesIds(promo?.applies_ids ?? "[]").join(", "))
  const [minPurchase, setMinPurchase] = useState(promo?.min_purchase != null ? String(promo.min_purchase) : "")
  const [stackable, setStackable] = useState(Boolean(promo?.stackable))
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validFrom && validUntil && validFrom > validUntil) { toast({ variant: "error", title: "Tanggal tidak valid", description: "valid_from harus sebelum valid_until" }); return }
    setLoading(true)
    const payload = {
      title, description: description || undefined, badge: badge || undefined, type: type as never, status: status as never,
      valid_from: validFrom || undefined, valid_until: validUntil || undefined,
      applies_to: appliesTo as never, applies_ids: appliesIds.split(",").map((s) => s.trim()).filter(Boolean),
      min_purchase: minPurchase ? Number(minPurchase) : undefined, stackable: stackable ? 1 : 0,
    }
    try {
      if (promo) await updatePromo(promo.id, payload, restaurantId)
      else await createPromo(payload, restaurantId)
      toast({ title: promo ? "Promo diperbarui" : "Promo dibuat" })
      onSaved()
    } catch (err) {
      toast({ variant: "error", title: "Gagal menyimpan", description: errorMessage(err, "Periksa isian.") })
    } finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{promo ? "Ubah Promo" : "Buat Promo"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="superadmin-form">
          <label>Judul<Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} /></label>
          <label>Deskripsi<Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></label>
          <label>Badge<Input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Hemat 20%" /></label>
          <label>Tipe<Select value={type} onValueChange={setType}><option value="percentage">percentage</option><option value="fixed">fixed</option><option value="bogo">bogo</option><option value="bundle">bundle</option><option value="free_shipping">free_shipping</option><option value="custom">custom</option></Select></label>
          <label>Status<Select value={status} onValueChange={setStatus}><option value="draft">draft</option><option value="active">active</option><option value="scheduled">scheduled</option><option value="expired">expired</option><option value="archived">archived</option></Select></label>
          <label>Berlaku dari<Input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} /></label>
          <label>Berlaku hingga<Input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></label>
          <label>Terapkan ke<Select value={appliesTo} onValueChange={setAppliesTo}><option value="all">Semua</option><option value="categories">Kategori</option><option value="items">Item tertentu</option></Select></label>
          <label>ID kategori/item (pisah koma)<Input value={appliesIds} onChange={(e) => setAppliesIds(e.target.value)} placeholder="Makanan Utama, Dari Laut" /></label>
          <label>Min. belanja<Input type="number" value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)} min={0} step={1000} /></label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={stackable} onChange={(e) => setStackable(e.target.checked)} /> Dapat digabung</label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan…" : "Simpan"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
