import { useEffect, useState } from "react";
import { Button } from "../../components";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { updateAdminRestaurant } from "../../api";

export function MenuSettingsPanel({
  restaurant,
  onSaved,
}: {
  restaurant: { id: string; slug: string; name: string; description: string; address: string; hours: string };
  onSaved: () => Promise<unknown>;
}) {
  const [name, setName] = useState(restaurant.name);
  const [slug, setSlug] = useState(restaurant.slug);
  const [description, setDescription] = useState(restaurant.description);
  const [address, setAddress] = useState(restaurant.address);
  const [hours, setHours] = useState(restaurant.hours);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setName(restaurant.name);
    setSlug(restaurant.slug);
    setDescription(restaurant.description);
    setAddress(restaurant.address);
    setHours(restaurant.hours);
  }, [restaurant.name, restaurant.slug, restaurant.description, restaurant.address, restaurant.hours]);
  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const normalizedSlug = slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      await updateAdminRestaurant({ slug: normalizedSlug, name: name.trim(), description: description.trim(), address: address.trim(), hours: hours.trim() }, restaurant.id);
      setSlug(normalizedSlug);
      await onSaved();
      setMessage("Restaurant settings saved.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save restaurant settings",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="settings-panel menu-settings-panel">
      <div className="menu-settings-intro">
        <div>
          <p className="section-kicker">Restaurant profile</p>
          <h1>Restaurant settings</h1>
          <p className="intro-copy">
            Shape how {restaurant.name} appears to guests.
          </p>
        </div>
        <div className="restaurant-settings-mark">S</div>
      </div>
      <Card className="settings-card">
        <div className="menu-settings-card-heading">
          <div>
            <p className="section-kicker">Public identity</p>
            <h3>{restaurant.name}</h3>
          </div>
          <span className="settings-status"><span className="live-dot" /> Live</span>
        </div>
        <div className="menu-settings-fields">
          <label>
            Restaurant name
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Slug
            <div className="slug-input">
              <span>site.com/</span>
              <Input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                aria-label="Restaurant slug"
              />
            </div>
          </label>
        </div>
        <label>
          Short description
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
        </label>
        <label>
          Address
          <Input value={address} onChange={(event) => setAddress(event.target.value)} maxLength={240} />
        </label>
        <label>
          Opening hours
          <Input value={hours} onChange={(event) => setHours(event.target.value)} maxLength={240} />
        </label>
        {(message || error) && (
          <p className={error ? "settings-feedback error" : "settings-feedback success"}>
            {error || message}
          </p>
        )}
        <div className="settings-action-row">
          <p className="muted">Your public menu is available at site.com/{slug || "your-slug"}.</p>
          <Button variant="default" onClick={save} disabled={saving || !slug.trim()}>
            {saving ? "Saving..." : "Save restaurant settings"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
