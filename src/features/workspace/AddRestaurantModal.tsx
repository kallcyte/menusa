import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "../../components";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import type { AdminRestaurant } from "../../api";

export function AddRestaurantModal({ onClose, onCreate }: { onClose: () => void; onCreate: (input: Pick<AdminRestaurant, 'slug' | 'name' | 'description' | 'address' | 'hours'>) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!name.trim() || !normalizedSlug) {
      setError("Add a restaurant name and a valid slug first.");
      return;
    }
    setSaving(true);
    setError("");
    const created = await onCreate({ name: name.trim(), slug: normalizedSlug, description: description.trim(), address: address.trim(), hours: hours.trim() });
    setSaving(false);
    if (!created) setError("Couldn't create the restaurant. Check the details and try again.");
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="modal">
        <DialogHeader className="modal-head">
          <div>
            <p className="section-kicker">New workspace</p>
            <DialogTitle>Add a restaurant.</DialogTitle>
            <DialogDescription>Create a separate menu workspace for another venue.</DialogDescription>
          </div>
        </DialogHeader>
        <form onSubmit={submit}>
          <label>Restaurant name<Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Alba House" /></label>
          <label>Slug<Input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="e.g. alba-house" /></label>
          <label>Short description<Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <label>Address<Input value={address} onChange={(event) => setAddress(event.target.value)} /></label>
          <label>Opening hours<Input value={hours} onChange={(event) => setHours(event.target.value)} /></label>
          {error && <p className="auth-error">{error}</p>}
          <DialogFooter className="modal-actions">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create restaurant"} <Plus size={16} /></Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
