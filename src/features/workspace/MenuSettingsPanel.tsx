import { type ChangeEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { fetchAdminPromos, updateAdminRestaurant, uploadMenuImage } from "../../api";
import { formatPrice } from "../../lib/currency";

export function MenuSettingsPanel({
  restaurant,
  onSaved,
}: {
  restaurant: { id: string; slug: string; name: string; description: string; address: string; hours: string; story?: string; phone?: string; instagram?: string; hoursDetail?: string; promo?: { title: string; description?: string; badge?: string; validUntil?: string; type?: string } | null; currency?: string; halalCertificationAuthority?: "BPJPH" | "MUI"; halalCertificationNumber?: string; halalCertificateImageKey?: string; banner?: { type: 'none' | 'promo' | 'announcement'; promo?: unknown; announcement?: string; dismissible?: boolean } | null };
  onSaved: () => Promise<unknown>;
}) {
  const { t, i18n } = useTranslation(["admin", "common"])
  const [name, setName] = useState(restaurant.name);
  const [slug, setSlug] = useState(restaurant.slug);
  const [description, setDescription] = useState(restaurant.description);
  const [address, setAddress] = useState(restaurant.address);
  const [hours, setHours] = useState(restaurant.hours);
  const [story, setStory] = useState(restaurant.story ?? "");
  const [phone, setPhone] = useState(restaurant.phone ?? "");
  const [instagram, setInstagram] = useState(restaurant.instagram ?? "");
  const [hoursDetail, setHoursDetail] = useState(restaurant.hoursDetail ?? "");
  const [halalCertificationAuthority, setHalalCertificationAuthority] = useState(restaurant.halalCertificationAuthority ?? "");
  const [halalCertificationNumber, setHalalCertificationNumber] = useState(restaurant.halalCertificationNumber ?? "");
  const [halalCertificateImageKey, setHalalCertificateImageKey] = useState(restaurant.halalCertificateImageKey ?? "");
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [promoTitle, setPromoTitle] = useState(restaurant.promo?.title ?? "");
  const [promoDescription, setPromoDescription] = useState(restaurant.promo?.description ?? "");
  const [promoBadge, setPromoBadge] = useState(restaurant.promo?.badge ?? "");
  const [promoValidUntil, setPromoValidUntil] = useState(restaurant.promo?.validUntil ?? "");
  const [promoType, setPromoType] = useState(restaurant.promo?.type ?? "custom");
  const [promoEnabled, setPromoEnabled] = useState(Boolean(restaurant.promo));
  const [currency, setCurrency] = useState(restaurant.currency || "IDR");
  const [bannerType, setBannerType] = useState<'none' | 'promo' | 'announcement'>((restaurant.banner?.type as never) ?? 'none');
  const [bannerPromoId, setBannerPromoId] = useState<string>("")
  const [bannerAnnouncement, setBannerAnnouncement] = useState((restaurant.banner?.announcement as string) ?? "")
  const [bannerDismissible, setBannerDismissible] = useState(Boolean(restaurant.banner?.dismissible ?? true))
  const promosQuery = useQuery({ queryKey: ["admin", "promos", restaurant.id], queryFn: () => fetchAdminPromos(restaurant.id), staleTime: 15_000, enabled: bannerType === 'promo' })
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
    setHalalCertificationAuthority(restaurant.halalCertificationAuthority ?? "");
    setHalalCertificationNumber(restaurant.halalCertificationNumber ?? "");
    setHalalCertificateImageKey(restaurant.halalCertificateImageKey ?? "");
    setPromoTitle(restaurant.promo?.title ?? "");
    setPromoDescription(restaurant.promo?.description ?? "");
    setPromoBadge(restaurant.promo?.badge ?? "");
    setPromoValidUntil(restaurant.promo?.validUntil ?? "");
    setPromoType(restaurant.promo?.type ?? "custom");
    setPromoEnabled(Boolean(restaurant.promo));
    setCurrency(restaurant.currency || "IDR");
    setBannerType((restaurant.banner?.type as never) ?? 'none');
    setBannerAnnouncement((restaurant.banner?.announcement as string) ?? "");
    setBannerDismissible(Boolean(restaurant.banner?.dismissible ?? true));
  }, [restaurant.name, restaurant.slug, restaurant.description, restaurant.address, restaurant.hours, restaurant.story, restaurant.phone, restaurant.instagram, restaurant.hoursDetail, restaurant.halalCertificationAuthority, restaurant.halalCertificationNumber, restaurant.halalCertificateImageKey, restaurant.promo, restaurant.currency, restaurant.banner]);
  const uploadCertificate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingCertificate(true);
    setError("");
    try {
      const result = await uploadMenuImage(file);
      setHalalCertificateImageKey(result.key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload certificate");
    } finally {
      setUploadingCertificate(false);
      event.target.value = "";
    }
  };
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
      await updateAdminRestaurant({ slug: normalizedSlug, name: name.trim(), description: description.trim(), address: address.trim(), hours: hours.trim(), story: story.trim(), phone: phone.trim(), instagram: instagram.trim().replace(/^@/, ""), hoursDetail: hoursDetail.trim(), halalCertificationAuthority: halalCertificationAuthority || null, halalCertificationNumber: halalCertificationNumber.trim(), halalCertificateImageKey: halalCertificateImageKey || "", promo, currency: currency as never, bannerType: bannerType as never, bannerPromoId: bannerType === 'promo' ? (bannerPromoId || null) : null, bannerAnnouncement: bannerType === 'announcement' ? bannerAnnouncement : null, bannerDismissible } as never, restaurant.id);
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
        <div className="settings-card halal-certification-card" style={{ marginTop: 16, background: "#fafaf8" }}>
          <p className="section-kicker">Halal certification</p>
          <p className="muted" style={{ marginTop: 4 }}>
            Add the restaurant-level certification details visitors can verify. Do not add halal status to individual dishes.
          </p>
          <div className="menu-settings-fields" style={{ marginTop: 16 }}>
            <label>
              Certification authority
              <Select value={halalCertificationAuthority} onChange={(event) => setHalalCertificationAuthority(event.target.value)}>
                <option value="">Not specified</option>
                <option value="BPJPH">BPJPH</option>
                <option value="MUI">MUI (legacy certificate)</option>
              </Select>
            </label>
            <label>
              Certificate ID
              <span className="field-hint">Printed on the certificate</span>
              <Input value={halalCertificationNumber} onChange={(event) => setHalalCertificationNumber(event.target.value)} maxLength={80} placeholder="ID004100..." />
            </label>
          </div>
          <label style={{ marginTop: 16 }}>
            Certificate screenshot
            <span className="field-hint">JPG, PNG, or WebP · max 10MB</span>
            <input className="certificate-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCertificate} disabled={uploadingCertificate} />
          </label>
          {halalCertificateImageKey && (
            <div className="certificate-preview">
              <img src={`/api/admin/images/${encodeURIComponent(halalCertificateImageKey)}`} alt="Halal certificate preview" />
              <button type="button" className="certificate-remove" onClick={() => setHalalCertificateImageKey("")}>Remove certificate</button>
            </div>
          )}
          <p className="muted" style={{ marginTop: 12 }}>
            BPJPH IDs open the official certificate lookup. MUI is retained for older certificates; verify those through the LPPOM MUI directory.
          </p>
        </div>
        <div className="settings-card" style={{ marginTop: 20, background: "#fafaf8" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p className="section-kicker">Promo banner (lama)</p>
              <p className="muted" style={{ marginTop: 4 }}>Legacy single promo. Gunakan Banner di bawah untuk promo baru.</p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={promoEnabled} onChange={(e) => setPromoEnabled(e.target.checked)} /> Enabled
            </label>
          </div>
          {promoEnabled && (
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <label>Title<Input value={promoTitle} onChange={(e) => setPromoTitle(e.target.value)} maxLength={80} placeholder="Paket Berdua — Rp95.000" /></label>
              <label>Description <span className="field-hint">Optional</span><Input value={promoDescription} onChange={(e) => setPromoDescription(e.target.value)} maxLength={240} placeholder="2 makanan utama + 2 minuman, setiap hari minggu ini." /></label>
              <div className="menu-settings-fields">
                <label>Badge <span className="field-hint">e.g. Minggu ini</span><Input value={promoBadge} onChange={(e) => setPromoBadge(e.target.value)} maxLength={32} placeholder="Minggu ini" /></label>
                <label>Valid until <span className="field-hint">e.g. Sampai Minggu</span><Input value={promoValidUntil} onChange={(e) => setPromoValidUntil(e.target.value)} maxLength={64} placeholder="Sampai Minggu" /></label>
              </div>
              <label>Type<Select value={promoType} onChange={(e) => setPromoType(e.target.value)}><option value="custom">Custom</option><option value="bogo">BOGO</option><option value="discount">Discount</option><option value="package">Package</option></Select></label>
            </div>
          )}
        </div>
        <div className="settings-card" style={{ marginTop: 16, background: "#fafaf8" }}>
          <p className="section-kicker">Spanduk (Banner)</p>
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <label>Tipe banner<Select value={bannerType} onValueChange={(v) => setBannerType(v as never)}><option value="none">Tidak ada</option><option value="promo">Promo</option><option value="announcement">Pengumuman</option></Select></label>
            {bannerType === 'promo' && (
              <label>Pilih promo<Select value={bannerPromoId} onValueChange={setBannerPromoId}><option value="">— Pilih —</option>{(promosQuery.data?.promos ?? []).map((p: { id: string; title: string }) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></label>
            )}
            {bannerType === 'announcement' && (
              <label>Pengumuman<Textarea value={bannerAnnouncement} onChange={(e) => setBannerAnnouncement(e.target.value)} maxLength={500} placeholder="Libur Idul Fitri 1–3 Mei" /></label>
            )}
            {bannerType !== 'none' && (
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={bannerDismissible} onChange={(e) => setBannerDismissible(e.target.checked)} /> Dapat ditutup tamu</label>
            )}
            {bannerType === 'promo' && bannerPromoId && promosQuery.data?.promos?.find((p: { id: string }) => p.id === bannerPromoId) && (
              <div className="muted" style={{ fontSize: 12, padding: 8, border: "1px solid #e5e5e5", borderRadius: 8 }}>Preview: {promosQuery.data.promos.find((p: { id: string }) => p.id === bannerPromoId)?.title}</div>
            )}
          </div>
        </div>
        <div className="settings-card" style={{ marginTop: 16, background: "#fafaf8" }}>
          <p className="section-kicker">Mata uang</p>
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <label>Mata uang<Select value={currency} onValueChange={(v) => setCurrency(v)}><option value="IDR">IDR (Rp)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="SGD">SGD (S$)</option><option value="MYR">MYR (RM)</option><option value="JPY">JPY (¥)</option></Select></label>
            <div className="muted" style={{ fontSize: 12 }}>Preview: {formatPrice(50000, currency, i18n.language)}</div>
          </div>
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
