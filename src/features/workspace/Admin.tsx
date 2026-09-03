import { useEffect } from "react";
import type { Navigate } from "../shared";

// Legacy redirect — /admin is canonical. Active tab is URL-driven via /admin/* routes.
export function Admin({ navigate }: { navigate: Navigate }) {
  useEffect(() => {
    navigate("/admin");
  }, [navigate]);
  return (
    <div className="admin-shell" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <p className="waitlist-loading">Mengalihkan ke /admin…</p>
    </div>
  );
}
