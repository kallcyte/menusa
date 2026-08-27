import { useQuery } from "@tanstack/react-query";
import { Copy, Download, Mail } from "lucide-react";
import { fetchWaitlist } from "../../api";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/toast";

type WaitlistFetcher = () => Promise<{ entries: { id: string; email: string; restaurantName: string | null; createdAt: string }[] }>

export function WaitlistPanel({ queryKey = ["admin", "waitlist"], queryFn = fetchWaitlist as WaitlistFetcher }: { queryKey?: readonly unknown[]; queryFn?: WaitlistFetcher } = {}) {
  const { toast } = useToast();
  const query = useQuery({
    queryKey: queryKey as unknown as string[],
    queryFn,
    staleTime: 30_000,
  });

  const entries = query.data?.entries ?? [];

  function handleCopy(email: string) {
    navigator.clipboard.writeText(email).then(
      () => toast({ title: "Copied", description: email }),
      () => toast({ variant: "error", title: "Couldn't copy", description: "Please copy manually." }),
    );
  }

  function handleExportCsv() {
    if (!entries.length) return;
    const header = "email,restaurant_name,created_at";
    const rows = entries.map((e) => {
      const esc = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
      return `${esc(e.email)},${esc(e.restaurantName)},${esc(e.createdAt)}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `menusa-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="waitlist-panel">
      <div className="waitlist-panel-head">
        <div>
          <h2>Waitlist</h2>
          <p>People who want early access. Reach out as soon as you&apos;re ready to onboard them.</p>
        </div>
        <div className="waitlist-panel-actions">
          <span className="waitlist-count">
            <Mail size={14} /> {entries.length} {entries.length === 1 ? "person" : "people"}
          </span>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!entries.length}>
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {query.isPending ? (
        <div className="waitlist-loading">Loading waitlist…</div>
      ) : query.isError ? (
        <div className="waitlist-error-panel">
          <p>Couldn&apos;t load the waitlist.</p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>Try again</Button>
        </div>
      ) : !entries.length ? (
        <div className="waitlist-empty">
          <Mail size={32} className="waitlist-empty-icon" />
          <h3>No one on the waitlist yet</h3>
          <p>Share your landing page — every signup will appear here.</p>
        </div>
      ) : (
        <div className="waitlist-table-wrap">
          <table className="waitlist-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Restaurant</th>
                <th>Joined</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="waitlist-email">{e.email}</td>
                  <td className="waitlist-restaurant">{e.restaurantName || <span className="waitlist-muted">—</span>}</td>
                  <td className="waitlist-date">{(() => { try { return new Date(e.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return e.createdAt; } })()}</td>
                  <td>
                    <button className="waitlist-copy" onClick={() => handleCopy(e.email)} aria-label={`Copy ${e.email}`}>
                      <Copy size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
