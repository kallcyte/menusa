import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowDown, Clock3, ExternalLink, Flame, Grid2X2, Heart, Images, LayoutGrid, MapPin, Phone, Search, ShieldCheck, Sparkles, Star, Tag, X } from "lucide-react";
function Instagram({ size = 18, ...props }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
import { Button, Logo } from "../../components";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { ApiError, fetchPublicMenu } from "../../api";
import {
  allergenOptions,
  categories,
  dietaryTagOptions,
  restaurants,
  spiceLevelOptions,
  type MenuItem,
} from "../../data";
import { optionLabel } from "../shared";
import { formatPrice } from "../../lib/currency";
import { getRestaurantHoursStatus, type RestaurantHoursStatus } from "../../lib/restaurantHours";
const allCategory = categories[0];

function halalLookupUrl(authority: "BPJPH" | "MUI" | undefined, number: string) {
  if (authority === "MUI") return "https://halalmui.org/produk-halal/";
  return `https://bpjph.halal.go.id/cari/sertifikat?no_regis=${encodeURIComponent(number)}`;
}

type Navigate = (path: string) => void;
function formatClock(minutes: number): string {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function formatWeekday(day: number, language: string): string {
  const date = new Date(2024, 0, 7 + day);
  return new Intl.DateTimeFormat(language.startsWith("id") ? "id-ID" : "en-US", { weekday: "long" }).format(date);
}

export function PublicMenu({
  slug,
  navigate,
}: {
  slug: string;
  navigate: Navigate;
}) {
  const { t, i18n } = useTranslation(["publicMenu", "common"])
  const [active, setActive] = useState(allCategory);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"bento" | "tiles" | "gallery">("bento");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const dialogItemRef = useRef<MenuItem | null>(null);
  if (selectedItem) dialogItemRef.current = selectedItem;
  const dialogItem = dialogItemRef.current;
  const focusMenuSearch = () => {
    const input = document.getElementById("menu-search");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    (input as HTMLInputElement | null)?.focus();
  };
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const restaurantQuery = useQuery({
    queryKey: ["public-menu", slug],
    queryFn: () => fetchPublicMenu(slug),
    // Seed known fixtures instantly (demo home); unknown slugs must wait for
    // the API so a real 404 can surface instead of flashing another menu.
    initialData: restaurants[slug],
    refetchOnMount: "always",
  });
  const restaurant = restaurantQuery.data;
  const notFound =
    restaurantQuery.isError &&
    restaurantQuery.error instanceof ApiError &&
    restaurantQuery.error.status === 404;
  useEffect(() => {
    if (!restaurant) return;
    document.title = `${restaurant.name} · Menu`;
    const description =
      restaurant.description ||
      `See the menu for ${restaurant.name}.`;
    const setMeta = (name: string, content: string) => {
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[property="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    setMeta("og:title", `${restaurant.name} · Menu`);
    setMeta("og:description", description);
    setMeta("og:type", "website");
  }, [restaurant]);

  const rootRef = useRef<HTMLElement>(null);
  const [promoVisible, setPromoVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(new Date());
    updateCurrentTime();
    const timer = window.setInterval(updateCurrentTime, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.dataset.viewMode = viewMode;
    return () => {
      delete root.dataset.viewMode;
    };
  }, [viewMode]);
  useEffect(() => {
    const onScroll = () => setPromoVisible(window.scrollY > 100);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!restaurant) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".gsap-menu-eyebrow", { opacity: 0, y: 10, duration: 0.5, ease: "power2.out" });
      gsap.from(".gsap-menu-title", { opacity: 0, y: 20, duration: 0.6, delay: 0.08, ease: "power3.out" });
      gsap.from(".gsap-menu-copy", { opacity: 0, y: 14, duration: 0.5, delay: 0.16, ease: "power2.out" });
      gsap.from(".gsap-menu-actions", { opacity: 0, y: 12, duration: 0.4, delay: 0.3, ease: "power2.out" });
      gsap.from(".gsap-menu-top", { opacity: 0, y: 16, duration: 0.5, delay: 0.3, ease: "power2.out" });
      gsap.from(".gsap-menu-visual", { opacity: 0, x: 24, scale: 0.97, duration: 0.7, delay: 0.2, ease: "power3.out" });

      gsap.utils.toArray<HTMLElement>(".gsap-menu-reveal").forEach((el) => {
        gsap.fromTo(el,
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } }
        );
      });
    }, rootRef);
    return () => ctx.revert();
  }, [restaurant]);

  // Stagger menu cards — re-runs when filtered items change so category/search feels alive
  useEffect(() => {
    if (!restaurant) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cards = rootRef.current?.querySelectorAll<HTMLElement>(".bento-grid > *");
    if (!cards?.length) return;
    gsap.fromTo(cards,
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06, ease: "power3.out", overwrite: "auto" }
    );
  }, [restaurant, active, search, viewMode]);
  if (notFound || restaurantQuery.isError) {
    return (
      <main className="public-shell">
        <header className="site-header">
          <Logo dark />
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label={t("search")}
              onClick={focusMenuSearch}
            >
              <Search size={19} />
            </button>
          </div>
        </header>
        <div className="public-status" role="alert">
          <h2>{notFound ? t("notAvailable") : t("somethingWrong")}</h2>
          <p>{notFound ? t("notAvailableCopy") : t("somethingWrongCopy")}</p>
          {!notFound && (
            <Button variant="outline" onClick={() => restaurantQuery.refetch()}>
              {t("retry")}
            </Button>
          )}
        </div>
      </main>
    );
  }
  if (!restaurant) {
    return (
      <main className="public-shell">
        <div className="public-status" aria-busy="true">
          <h2>{t("settingTable")}</h2>
          <p>{t("loadingMenu")}</p>
        </div>
      </main>
    );
  }
  if (restaurant.menuVisible === false) {
    return (
      <main className="public-shell">
        <header className="site-header">
          <Logo dark />
        </header>
        <div className="public-status public-hidden-menu" role="status">
          <span className="banner-icon banner-icon-hidden" aria-hidden="true">
            <Clock3 size={18} />
          </span>
          <h2>{t("craftingMenu")}</h2>
          <p>{t("craftingCopy", { name: restaurant.name })}</p>
        </div>
      </main>
    );
  }
  const currency = (restaurant as unknown as { currency?: string })?.currency ?? "IDR"
  const hoursStatus: RestaurantHoursStatus = currentTime ? getRestaurantHoursStatus(restaurant.hours, restaurant.hoursDetail, currentTime) : { kind: "unknown" };
  const hoursLabel = (() => {
    if (!currentTime || hoursStatus.kind === "unknown") return restaurant.hours;
    if (hoursStatus.kind === "open") return t("openNow", { time: formatClock(hoursStatus.closingAt ?? 0) });
    if (hoursStatus.kind === "closingSoon") return t("closingSoon", { time: formatClock(hoursStatus.closingAt ?? 0) });
    if (hoursStatus.kind === "openingSoon") return t("openingSoon", { time: formatClock(hoursStatus.openingAt ?? 0) });
    const openingDay = hoursStatus.openingDay ?? currentTime.getDay();
    const dayOffset = (openingDay - currentTime.getDay() + 7) % 7;
    const day = dayOffset === 1 ? t("tomorrow") : formatWeekday(openingDay, i18n.language);
    return t("closedUntil", { day, time: formatClock(hoursStatus.openingAt ?? 0) });
  })();
  const banner = (restaurant as unknown as { banner?: { type: string; promo?: { title: string; description?: string; badge?: string }; announcement?: string; dismissible?: boolean } | null })?.banner
  const filtered = restaurant.items.filter(
    (item) =>
      (active === "Semua" || item.category === active) &&
      `${item.name} ${item.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
   return (
     <main ref={rootRef} className="public-shell">
       {banner && banner.type !== 'none' && !bannerDismissed && (() => {
         const dismissedKey = `menusa-banner-dismissed-${slug}`
         if (typeof window !== 'undefined' && localStorage.getItem(dismissedKey)) return null
         const title = banner.type === 'promo' ? (banner.promo?.title ?? "") : (banner.announcement ?? "")
         const desc = banner.type === 'promo' ? (banner.promo?.description ?? "") : ""
         const badge = banner.type === 'promo' ? (banner.promo?.badge ?? "") : ""
         return (
           <div className="public-banner" role="banner" style={{ background: "#fff7ed", borderBottom: "1px solid #fed7aa", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
             <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
               {badge && <span className="badge badge--accent" style={{ fontSize: 11 }}>{badge}</span>}
               <strong style={{ fontSize: 13 }}>{title}</strong>
               {desc && <span className="muted" style={{ fontSize: 12 }}>{desc}</span>}
             </div>
             {banner.dismissible !== false && <button aria-label="Tutup" onClick={() => { if (typeof window !== 'undefined') localStorage.setItem(dismissedKey, "1"); setBannerDismissed(true) }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={16} /></button>}
           </div>
         )
       })()}
      <header className="site-header">
        <Logo dark />
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label={t("search")}
            onClick={focusMenuSearch}
          >
            <Search size={19} />
          </button>
         </div>
       </header>
      {restaurant.promo && (
        <>
          <div className="promo-top gsap-menu-eyebrow">
            <div className="promo-top-inner">
              <span className="promo-top-badge"><Tag size={11} /> {restaurant.promo.badge ?? 'Promo'}</span>
              <span className="promo-top-title">{restaurant.promo.title}</span>
              {restaurant.promo.validUntil && <span className="promo-top-valid">{restaurant.promo.validUntil}</span>}
            </div>
            {restaurant.promo.description && <span className="promo-top-desc">{restaurant.promo.description}</span>}
          </div>
          <div className={`promo-float ${promoVisible ? "promo-float--visible" : "promo-float--hidden"}`} role="status" aria-live="polite">
            <span className="promo-float-badge">{restaurant.promo.badge ?? 'Promo'}</span>
            <span className="promo-float-title">{restaurant.promo.title}</span>
            {restaurant.promo.validUntil && <span className="promo-float-valid">{restaurant.promo.validUntil}</span>}
          </div>
        </>
      )}
      <section className="hero hero--with-visual">
        <div className="hero-copy-col">
          <div className="eyebrow gsap-menu-eyebrow">
            <span className={`live-dot hero-status-dot hero-status-dot--${hoursStatus.kind}`} />
            <span aria-live="polite">{hoursLabel}</span>
          </div>
          <div className="hero-display gsap-menu-title" aria-hidden="true">
            {t("heroTitle")}
            <br />
            <em>{restaurant.name}.</em>
          </div>
          <p className="hero-copy gsap-menu-copy">{restaurant.description}</p>
          {restaurant.story && <p className="hero-story gsap-menu-copy">{restaurant.story}</p>}
          <div className="hero-meta gsap-menu-meta">
            <span>
              <MapPin size={16} /> {restaurant.address}
            </span>
            <span>
              <Clock3 size={16} /> {t("walkInsShort")}
            </span>
          </div>
          <div className="hero-actions gsap-menu-actions">
            {restaurant.items.some(item => item.isSpecial) && (
              <Button
                variant="dark"
                className="w-full sm:w-auto"
                onClick={() => scrollToSection("specials")}
              >
                {t("viewSpecials")} <Flame size={15} />
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full bg-white sm:w-auto"
              onClick={() => scrollToSection("menu")}
            >
              {t("viewFullMenu")} <ArrowDown size={15} />
            </Button>
          </div>
        </div>
        <div className="hero-visual gsap-menu-visual" aria-hidden="true">
          <div className="hero-visual-stack">
            {(() => {
              const highlights = restaurant.items.filter(i => i.isSpecial || i.tag).slice(0, 2);
              const rest = restaurant.items.filter(i => !highlights.includes(i)).slice(0, 3);
              const picks = [...highlights, ...rest].slice(0, 5);
              const fallback = picks.length < 5 ? [...picks, ...restaurant.items.slice(0, 5 - picks.length)] : picks;
              return fallback.slice(0, 5).map((item, idx) => (
                <div key={item.id} className={`hero-visual-card hero-visual-card--${idx + 1}`}>
                  <img src={item.image} alt="" loading="eager" />
                  <div className="hero-visual-card-shade" />
                  <div className="hero-visual-card-label">
                    {item.tag && <span className="hero-visual-tag">{item.tag}</span>}
                    <span className="hero-visual-name">{item.name}</span>
                  </div>
                </div>
              ));
            })()}
          </div>
          <div className="hero-visual-badge">
            <Star size={12} /> {t("menuCount", { count: restaurant.items.length })}
          </div>
        </div>
      </section>
      {(() => {
        const specials = restaurant.items.filter(i => i.isSpecial);
        if (!specials.length) return null;
        return (
          <section id="specials" className="specials-strip gsap-menu-reveal">
            <div className="specials-head">
              <span className="section-kicker">{t("tonightsSpecials")}</span>
              <h2>{t("dontMiss")}<span>.</span></h2>
            </div>
            <div className="specials-grid">
              {specials.map(item => (
                <button key={item.id} className="specials-card" onClick={() => setSelectedItem(item)}>
                  <img src={item.image} alt="" loading="lazy" />
                  <div className="specials-card-shade" />
                  <div className="specials-card-content">
                    <span className="specials-tag">{item.tag ?? t("special")}</span>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <span className="price">{formatPrice(item.price, currency, i18n.language)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })()}
      <section className="menu-section" id="menu">
        <div className="menu-top gsap-menu-top">
          <div>
            <p className="section-kicker">{t("tonightAtTable")}</p>
            <h1>
              {t("takeYourPick")}<span>.</span>
            </h1>
          </div>
          <div className="search-wrap">
            <Search className="search-prefix-icon" size={16} aria-hidden="true" />
            <Input
              id="menu-search"
              className="search-input !pl-9 !pr-3"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("findDish")}
              aria-label={t("findDish")}
            />
          </div>
        </div>
        <div className="menu-controls gsap-menu-reveal">
          <div className="category-row" aria-label={t("categories")}>
            {categories.map((category) => (
              <button
                key={category}
                className={active === category ? "category active" : "category"}
                aria-pressed={active === category}
                onClick={(event) => {
                  setActive(category);
                  event.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
                }}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="menu-view-switcher" role="group" aria-label={t("viewOptions")}>
            {([
              ["bento", LayoutGrid, "viewBento"],
              ["tiles", Grid2X2, "viewTiles"],
              ["gallery", Images, "viewGallery"],
            ] as const).map(([mode, Icon, label]) => (
              <button
                key={mode}
                type="button"
                className={viewMode === mode ? "menu-view-option menu-view-option--active" : "menu-view-option"}
                aria-pressed={viewMode === mode}
                onClick={() => setViewMode(mode)}
                title={t(label)}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{t(label)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bento-grid gsap-menu-stagger">
          {filtered.map((item, index) => (
            <MenuCard
              item={item}
              currency={currency}
              large={active === allCategory && !search.trim() && index % 5 === 0}
              featurePosition={index % 10 === 5 ? "right" : "left"}
              onSelect={() => setSelectedItem(item)}
              key={item.id}
            />
          ))}
          {!filtered.length && (
            <div className="menu-grid-empty">
              <p>
                {t("noDishesMatch")} {search.trim() ? `"${search.trim()}" ` : ""}
                {active === allCategory ? t("menuScope") : `${t("inCategory")} ${active}`}.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setActive(allCategory);
                }}
              >
                {t("clearFilters")}
              </Button>
            </div>
          )}
        </div>
        <div className="menu-note gsap-menu-reveal">
          <Sparkles size={17} />
          <span>
            {t("menuChanges")}
          </span>
        </div>
      </section>

      {(restaurant.halalCertificationNumber || restaurant.halalCertificateImageKey) && (
        <section className="halal-certification gsap-menu-reveal">
          <div className="halal-certification-heading">
            <p className="halal-certification-kicker"><ShieldCheck size={14} /> {t("halalCertification")}</p>
            <h2>{t("halalCertificationTitle")}</h2>
          </div>
          <p className="halal-certification-copy">{t("halalCertificationCopy")}</p>
          <div className="halal-certification-links">
            {restaurant.halalCertificationNumber && (
              <a href={halalLookupUrl(restaurant.halalCertificationAuthority, restaurant.halalCertificationNumber)} target="_blank" rel="noreferrer">
                {restaurant.halalCertificationAuthority ?? "BPJPH"} · {restaurant.halalCertificationNumber} <ExternalLink size={13} />
              </a>
            )}
            {restaurant.halalCertificateImageKey && (
              <a href={`/api/images/${encodeURIComponent(restaurant.halalCertificateImageKey)}`} target="_blank" rel="noreferrer">
                {t("viewCertificate")} <ExternalLink size={13} />
              </a>
            )}
          </div>
        </section>
      )}
      <section className="allergen-legend gsap-menu-reveal">
        <p className="allergen-legend-kicker"><Sparkles size={12} /> {t("allergyInfo")}</p>
        <p className="allergen-legend-copy">{t("allergyCopy")}</p>
        <div className="allergen-legend-tags">
          {allergenOptions.slice(0, 8).map(o => <span key={o.value} className="allergen-legend-tag">{o.label}</span>)}
          <span className="allergen-legend-tag allergen-legend-tag--more">+ {allergenOptions.length - 8} more</span>
        </div>
      </section>

      <section className="find-us gsap-menu-reveal">
        <div className="find-us-card">
          <div className="find-us-main">
            <p className="section-kicker">{t("findUs")}</p>
            <h2>{restaurant.name}</h2>
            <p className="find-us-address"><MapPin size={14} /> {restaurant.address}</p>
            {restaurant.phone && <p className="find-us-phone"><Phone size={14} /> <a href={`tel:${restaurant.phone.replace(/\s/g, '')}`}>{restaurant.phone}</a></p>}
            {restaurant.instagram && <p className="find-us-ig"><Instagram size={14} /> <a href={`https://instagram.com/${restaurant.instagram}`} target="_blank" rel="noreferrer">@{restaurant.instagram}</a></p>}
            <a className="find-us-directions" href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noreferrer">{t("getDirections")}</a>
          </div>
          <div className="find-us-hours">
            <p className="find-us-hours-kicker"><Clock3 size={12} /> {t("hours")}</p>
            <p className="find-us-hours-detail">{restaurant.hoursDetail ?? restaurant.hours}</p>
            <p className="find-us-hours-note">{t("walkInsWelcome")}</p>
          </div>
        </div>
      </section>

      <footer className="site-footer gsap-menu-reveal">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Logo dark /><LanguageSwitcher variant="compact" /></div>
        <div className="footer-detail">
          <span>{t("madeForGoodEvenings")}</span>
          <a href="https://instagram.com" aria-label="Instagram">
            <Instagram size={18} />
          </a>
        </div>
      </footer>
      {dialogItem && <MenuItemDetailDialog item={dialogItem} currency={currency} phone={restaurant.phone} open={!!selectedItem} onClose={() => setSelectedItem(null)} />}
    </main>
  );
}
function MenuCard({ item, large, featurePosition, currency, onSelect }: { item: MenuItem; large?: boolean; featurePosition?: "left" | "right"; currency: string; onSelect: () => void }) {
  const { t, i18n } = useTranslation(["publicMenu"])
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.image) && !imageFailed;
  const priceLabel = (() => {
    const raw = (item as unknown as { effectivePrice?: string }).effectivePrice
    const price = raw ?? item.price
    const isDiscounted = Boolean(raw)
    const formatted = formatPrice(price, currency, i18n.language)
    const original = isDiscounted ? formatPrice(item.price, currency, i18n.language) : null
    return { formatted, original, isDiscounted }
  })()
  return (
    <article
      className={`menu-card ${large ? "menu-card-large" : ""} ${large && featurePosition === "right" ? "menu-card-featured-right" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${t("viewDetails")} ${item.name}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      {showImage ? (
        <img src={item.image} alt="" loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
      ) : (
        <div className="card-image-fallback" aria-hidden="true">
          <span>{item.name.slice(0, 1)}</span>
        </div>
      )}
      <div className="card-shade" />
      <div className="card-content">
        {item.tag && <span className="item-tag">{item.tag}</span>}
        <div className="card-title-row">
          <div>
            <h3>{item.name}</h3>
            <p className="menu-card-description">{item.description}</p>
          </div>
          <span className="price" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            {priceLabel.isDiscounted && <span style={{ textDecoration: "line-through", opacity: 0.6, fontSize: 11 }}>{priceLabel.original}</span>}
            <span>{priceLabel.formatted}</span>
          </span>
        </div>
      </div>
    </article>
  );
}


function MenuItemDetailDialog({ item, open, onClose, phone, currency }: { item: MenuItem; open: boolean; onClose: () => void; phone?: string; currency: string }) {
  const { t, i18n } = useTranslation(["publicMenu", "common"])
  const dietaryLabels = (item.dietaryTags ?? []).map(tag => optionLabel(dietaryTagOptions, tag));
  const spiceLabel = item.spiceLevel ? optionLabel(spiceLevelOptions, item.spiceLevel) : undefined;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="item-detail-dialog">
        <div className="item-detail-image-wrap">
          <img src={item.image} alt="" className="item-detail-image" />
        </div>
        <DialogHeader className="item-detail-header">
          <p className="section-kicker">{item.category}</p>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
          <div className="item-detail-price-row">
            <span className="price">{formatPrice(item.price, currency, i18n.language)}</span>
            {item.tag && <span className="item-tag">{item.tag}</span>}
          </div>
        </DialogHeader>
        {dietaryLabels.length > 0 && <div className="detail-chip-row">{dietaryLabels.map(label => <span className="detail-chip" key={label}>{label}</span>)}</div>}
        {item.ingredients && <div className="detail-block"><p className="detail-block-label">{t("ingredients")}</p><p>{item.ingredients}</p></div>}
        {(item.allergens?.length ?? 0) > 0 && <div className="detail-block"><p className="detail-block-label">{t("contains")}</p><p>{item.allergens?.map(allergen => optionLabel(allergenOptions, allergen)).join(", ")}</p></div>}
        {(item.mayContain?.length ?? 0) > 0 && <div className="detail-block"><p className="detail-block-label">{t("mayContain")}</p><p>{item.mayContain?.map(allergen => optionLabel(allergenOptions, allergen)).join(", ")}</p></div>}
        {spiceLabel && <div className="detail-meta-row"><span><strong>{t("spice")}</strong>{spiceLabel}</span></div>}
        {phone && (
          <div className="detail-actions">
            <a className="detail-action" href={`tel:${phone.replace(/\s/g, '')}`}>
              <Phone size={15} /> {t("contactRestaurant")}
            </a>
          </div>
        )}
        <p className="detail-allergy-note">{t("allergyNote")}</p>
      </DialogContent>
    </Dialog>
  );
}
