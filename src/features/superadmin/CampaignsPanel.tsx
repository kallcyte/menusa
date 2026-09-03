import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { createCampaign, fetchCampaigns, sendSuperadminBroadcast } from "../../api"
import { errorMessage } from "../shared"
import { useToast } from "../../components/ui/toast"
import { Button } from "../../components"
import { Input } from "../../components/ui/input"
import { Select } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { useTableState } from "../../lib/useTableState"
import { DataTable, type ColumnDef } from "../../components/DataTable"

type Campaign = { id: string; subject: string; audience: string; category: string | null; tags: string; status: string; sent_count: number; created_at: string; sent_at: string | null }

function parseTags(raw: string): string[] {
  if (!raw) return []
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [] } catch { return [] }
}

export function CampaignsPanel() {
  const { t } = useTranslation("superadmin")
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [detail, setDetail] = useState<Campaign | null>(null)

  const query = useQuery({ queryKey: ["superadmin", "campaigns"], queryFn: () => fetchCampaigns(), staleTime: 15_000 })

  if (query.isPending) return <div className="waitlist-loading">Memuat kampanye…</div>
  if (query.isError) return <div className="waitlist-error-panel">{errorMessage(query.error, "Couldn't load campaigns.")}</div>

  const campaigns = (query.data?.campaigns ?? []) as Campaign[]

  return (
    <div className="superadmin-panel">
      <div className="superadmin-intro">
        <p className="section-kicker">Kampanye</p>
        <h1>{t("campaigns")}</h1>
        <p>Buat siaran ke waitlist/pengguna dan lihat riwayat pengiriman.</p>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <Button onClick={() => setShowCreate(true)}>{t("createCampaign")}</Button>
        </div>
      </div>
      <CampaignsTable campaigns={campaigns} onDetail={setDetail} emptyLabel={t("noCampaigns")} />
      {showCreate && <CreateCampaignDialog onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ["superadmin", "campaigns"] }); toast({ title: "Kampanye dikirim" }) }} />}
      {detail && <CampaignDetailDialog campaign={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function CampaignsTable({ campaigns, onDetail, emptyLabel }: { campaigns: Campaign[]; onDetail: (c: Campaign) => void; emptyLabel: string }) {
  const table = useTableState<Campaign & Record<string, unknown>>({
    data: campaigns as unknown as Array<Campaign & Record<string, unknown>>,
    searchKeys: ["subject", "category" as string, "audience"],
    defaultSort: "created_at",
    defaultOrder: "desc",
  })

  const columns: ColumnDef<Campaign & Record<string, unknown>>[] = [
    { accessorKey: "subject", header: "Subjek", sortable: true },
    { accessorKey: "audience", header: "Audiens", sortable: true, filterType: "select", filterOptions: [{ value: "waitlist", label: "waitlist" }, { value: "users", label: "users" }, { value: "all", label: "all" }] },
    { accessorKey: "category", header: "Kategori", sortable: true, filterType: "select", filterOptions: [{ value: "promo", label: "promo" }, { value: "announcement", label: "announcement" }, { value: "newsletter", label: "newsletter" }, { value: "system", label: "system" }] },
    { accessorKey: "tags", header: "Tag", cell: (r) => <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{parseTags(r.tags as string).map((tag) => <span key={tag} className="badge" style={{ fontSize: 11 }}>{tag}</span>)}</span> },
    { accessorKey: "sent_count", header: "Terkirim", sortable: true },
    { accessorKey: "sent_at", header: "Dikirim", sortable: true, cell: (r) => <span className="waitlist-date">{r.sent_at ? new Date(r.sent_at as string).toLocaleString("id-ID") : "—"}</span> },
  ]

  return <DataTable data={campaigns as unknown as Array<Campaign & Record<string, unknown>>} columns={columns} filteredData={table.filtered} q={table.q} setQ={table.setQ} sortKey={table.sortKey} sortDir={table.sortDir} onSort={table.toggleSort} filters={table.filters} setFilter={table.setFilter} onClearFilters={table.clearFilters} emptyLabel={emptyLabel} onRowClick={(r) => onDetail(r as unknown as Campaign)} />
}

function CreateCampaignDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast()
  const [subject, setSubject] = useState("")
  const [html, setHtml] = useState("")
  const [text, setText] = useState("")
  const [audience, setAudience] = useState<"waitlist" | "users" | "all">("waitlist")
  const [category, setCategory] = useState("promo")
  const [tagsInput, setTagsInput] = useState("promo")
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const tags = tagsInput.split(",").map((s) => s.trim()).filter(Boolean)
    setLoading(true)
    try {
      // Prefer campaigns endpoint; fallback to broadcast alias
      try {
        await createCampaign({ subject, html, text, audience, category, tags })
      } catch {
        await sendSuperadminBroadcast({ audience, subject, html, text })
      }
      onCreated()
    } catch (err) {
      toast({ variant: "error", title: "Gagal mengirim", description: errorMessage(err, "Coba lagi.") })
    } finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Buat Kampanye</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="superadmin-form">
          <label>Subjek<Input value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={120} /></label>
          <label>Audiens<Select value={audience} onValueChange={(v) => setAudience(v as never)}><option value="waitlist">waitlist</option><option value="users">users</option><option value="all">all</option></Select></label>
          <label>Kategori<Select value={category} onValueChange={setCategory}><option value="promo">promo</option><option value="announcement">announcement</option><option value="newsletter">newsletter</option><option value="system">system</option></Select></label>
          <label>Tag (pisahkan koma)<Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="promo, seasonal" /></label>
          <label>HTML<Textarea value={html} onChange={(e) => setHtml(e.target.value)} required rows={4} /></label>
          <label>Text<Textarea value={text} onChange={(e) => setText(e.target.value)} required rows={3} /></label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Mengirim…" : "Kirim"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CampaignDetailDialog({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{campaign.subject}</DialogTitle></DialogHeader>
        <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
          <div><strong>Audiens:</strong> {campaign.audience} · <strong>Kategori:</strong> {campaign.category ?? "—"} · <strong>Terkirim:</strong> {campaign.sent_count}</div>
          <div><strong>Tag:</strong> {parseTags(campaign.tags).join(", ") || "—"}</div>
          <div><strong>Dikirim:</strong> {campaign.sent_at ? new Date(campaign.sent_at).toLocaleString("id-ID") : "—"}</div>
          <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12, background: "#fafafa" }} dangerouslySetInnerHTML={{ __html: campaign.subject }} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
