import { useEffect, useState } from "react";
import { Button } from "../../components";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { updateAdminRestaurant } from "../../api";

export function MenuSettingsPanel({
  restaurant,
  onSaved,
}: {
  restaurant: { id: string; slug: string; name: string; description: string; address: string; hours: string; story?: string; phone?: string; instagram?: string; hoursDetail?: string; promo?: { title: string; description?: string; badge?: string; validUntil?: string; type?: string } | null };
  onSaved: () => Promise<unknown>;
}) {
  const [name, setName] = useState(restaurant.name);
  const [slug, setSlug] = useState(restaurant.slug);
  const [description, setDescription] = useState(restaurant.description);
  const [address, setAddress] = useState(restaurant.address);
  const [hours, setHours] = useState(restaurant.hours);
  const [story, setStory] = useState(restaurant.story ?? "");
  const [phone, setPhone] = useState(restaurant.phone ?? "");
  const [instagram, setInstagram] = useState(restaurant.instagram ?? "");
  const [hoursDetail, setHoursDetail] = useState(restaurant.hoursDetail ?? "");
  const [promoTitle, setPromoTitle] = useState(restaurant.promo?.title ?? "");
  const [promoDescription, setPromoDescription] = useState(restaurant.promo?.description ?? "");
  const [promoBadge, setPromoBadge] = useState(restaurant.promo?.badge ?? "");
  const [promoValidUntil, setPromoValidUntil] = useState(restaurant.promo?.validUntil ?? "");
  const [promoType, setPromoType] = useState(restaurant.promo?.type ?? "custom");
  const [promoEnabled, setPromoEnabled] = useState(Boolean(restaurant.promo));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [host, setHost] = useState("site.com");
  useEffect(() => { setHost(window.location.host) }, []);
  useEffect(() => {
    setName(restaurant.name);
    setSlug(restaurant.slug);
    setDescription(restaurant.description);
    setAddress(restaurant.address);
    setHours(restaurant.hours);
    setStory(restaurant.story ?? "");
    setPhone(restaurant.phone ?? "");
    setInstagram(restaurant.instagram ?? "");
    setHoursDetail(restaurant.hoursDetail ?? "");
    setPromoTitle(restaurant.promo?.title ?? "");
    setPromoDescription(restaurant.promo?.description ?? "");
    setPromoBadge(restaurant.promo?.badge ?? "");
    setPromoValidUntil(restaurant.promo?.validUntil ?? "");
    setPromoType(restaurant.promo?.type ?? "custom");
    setPromoEnabled(Boolean(restaurant.promo));
  }, [restaurant.name, restaurant.slug, restaurant.description, restaurant.address, restaurant.hours, restaurant.story, restaurant.phone, restaurant.instagram, restaurant.hoursDetail, restaurant.promo]);
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
      const promo = promoEnabled && promoTitle.trim() ? { title: promoTitle.trim(), description: promoDescription.trim() || undefined, badge: promoBadge.trim() || undefined, validUntil: promoValidUntil.trim() || undefined, type: promoType as "bogo" | "discount" | "package" | "custom" } : null;
      await updateAdminRestaurant({ slug: normalizedSlug, name: name.trim(), description: description.trim(), address: address.trim(), hours: hours.trim(), story: story.trim(), phone: phone.trim(), instagram: instagram.trim().replace(/^@/, ""), hoursDetail: hoursDetail.trim(), promo }, restaurant.id);
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
              <span>{host}/</span>
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
        <label>
          Story <span className="field-hint">Shown under the hero</span>
          <Textarea value={story} onChange={(event) => setStory(event.target.value)} maxLength={500} placeholder="Wood-fired, market-led, open since 2019..." />
        </label>
        <div className="menu-settings-fields">
          <label>
            Phone <span className="field-hint">Tap-to-call on the menu</span>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} placeholder="01273 456 789" />
          </label>
          <label>
            Instagram <span className="field-hint">Without @</span>
            <Input value={instagram} onChange={(event) => setInstagram(event.target.value)} maxLength={64} placeholder="saltandember" />
          </label>
        </div>
        <label>
          Hours detail <span className="field-hint">Shown in the Find Us card</span>
          <Input value={hoursDetail} onChange={(event) => setHoursDetail(event.target.value)} maxLength={240} placeholder="Mon–Thu 5–11pm · Fri–Sat 5–11:30pm" />
        </label>
        <div className="settings-card" style={{ marginTop: 20, background: "#fafaf8" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p className="section-kicker">Promo banner</p>
              <p className="muted" style={{ marginTop: 4 }}>Appears above the hero. Leave title empty to hide.</p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={promoEnabled} onChange={(e) => setPromoEnabled(e.target.checked)} /> Enabled
            </label>
          </div>
          {promoEnabled && (
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <label>Title<Input value={promoTitle} onChange={(e) => setPromoTitle(e.target.value)} maxLength={80} placeholder="Feast for two — £48" /></label>
              <label>Description <span className="field-hint">Optional</span><Input value={promoDescription} onChange={(e) => setPromoDescription(e.target.value)} maxLength={240} placeholder="Any 2 mains + 2 drinks, every evening this week." /></label>
              <div className="menu-settings-fields">
                <label>Badge <span className="field-hint">e.g. This week</span><Input value={promoBadge} onChange={(e) => setPromoBadge(e.target.value)} maxLength={32} placeholder="This week" /></label>
                <label>Valid until <span className="field-hint">e.g. Until Sunday</span><Input value={promoValidUntil} onChange={(e) => setPromoValidUntil(e.target.value)} maxLength={64} placeholder="Until Sunday" /></label>
              </div>
              <label>Type<Select value={promoType} onChange={(e) => setPromoType(e.target.value)}><option value="custom">Custom</option><option value="bogo">BOGO</option><option value="discount">Discount</option><option value="package">Package</option></Select></label>
            </div>
          )}
        </div>
        {(message || error) && (
          <p className={error ? "settings-feedback error" : "settings-feedback success"}>
            {error || message}
          </p>
        )}
        <div className="settings-action-row">
          <p className="muted">Your public menu is available at {host}/{slug || "your-slug"}.</p>
          <Button variant="default" onClick={save} disabled={saving || !slug.trim()}>
            {saving ? "Saving..." : "Save restaurant settings"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
