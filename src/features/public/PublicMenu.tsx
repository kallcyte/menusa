 import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
 import { useQuery } from "@tanstack/react-query";
 import { Clock3, Flame, Heart, Instagram, MapPin, Phone, Search, Sparkles, Star, Tag } from "lucide-react";
 import { Button, Logo } from "../../components";
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
  halalStatusOptions,
  restaurants,
  spiceLevelOptions,
  type MenuItem,
} from "../../data";
import { optionLabel } from "../shared";

type Navigate = (path: string) => void;

export function PublicMenu({
  slug,
  navigate,
}: {
  slug: string;
  navigate: Navigate;
}) {
  const [active, setActive] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const dialogItemRef = useRef<MenuItem | null>(null);
  if (selectedItem) dialogItemRef.current = selectedItem;
  const dialogItem = dialogItemRef.current;
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
      gsap.from(".gsap-menu-meta", { opacity: 0, duration: 0.4, delay: 0.24, ease: "power2.out" });
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
  }, [restaurant, active, search]);
  if (notFound || restaurantQuery.isError) {
    return (
      <main className="public-shell">
        <header className="site-header">
          <Logo dark />
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label="Search"
              onClick={() => document.getElementById("menu-search")?.focus()}
            >
              <Search size={19} />
            </button>
          </div>
        </header>
        <div className="public-status" role="alert">
          <h2>{notFound ? "This menu isn't available." : "Something went wrong."}</h2>
          <p>
            {notFound
              ? "The link may be out of date, or the restaurant hasn't published its menu yet."
              : "We couldn't load this menu right now. Please try again."}
          </p>
          {!notFound && (
            <Button variant="outline" onClick={() => restaurantQuery.refetch()}>
              Try again
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
          <h2>Setting the table…</h2>
          <p>Loading today's menu.</p>
        </div>
      </main>
    );
  }
  const filtered = restaurant.items.filter(
    (item) =>
      (active === "All" || item.category === active) &&
      `${item.name} ${item.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
   return (
     <main ref={rootRef} className="public-shell">
       <header className="site-header">
         <Logo dark />
         <div className="header-actions">
           <button
             className="icon-button"
             aria-label="Search"
             onClick={() => document.getElementById("menu-search")?.focus()}
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
            <span className="live-dot" /> {restaurant.hours}
          </div>
          <div className="hero-display gsap-menu-title" aria-hidden="true">
            Eat well.
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
              <Clock3 size={16} /> Walk-ins welcome
            </span>
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
            <Star size={12} /> {restaurant.items.length} dishes · seasonal
          </div>
        </div>
      </section>
      <section className="menu-section" id="menu">
        <div className="menu-top gsap-menu-top">
          <div>
            <p className="section-kicker">Tonight at the table</p>
            <h1>
              Take your pick<span>.</span>
            </h1>
          </div>
          <div className="search-wrap">
            <Search className="search-prefix-icon" size={16} aria-hidden="true" />
            <Input
              id="menu-search"
              className="search-input !pl-9 !pr-3"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a dish"
            />
          </div>
        </div>
        <div className="category-row gsap-menu-reveal">
          {categories.map((category) => (
            <button
              key={category}
              className={active === category ? "category active" : "category"}
              onClick={() => setActive(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="bento-grid gsap-menu-stagger">
          {filtered.map((item, index) => (
            <MenuCard
              item={item}
              large={active === "All" && !search.trim() && index % 5 === 0}
              featurePosition={index % 10 === 5 ? "right" : "left"}
              onSelect={() => setSelectedItem(item)}
              key={item.id}
            />
          ))}
          {!filtered.length && (
            <div className="menu-grid-empty">
              <p>
                No dishes match{search.trim() ? ` "${search.trim()}"` : ""} in{" "}
                {active === "All" ? "this menu" : active} yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setActive("All");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
        <div className="menu-note gsap-menu-reveal">
          <Sparkles size={17} />
          <span>
            Our menu changes with the market. Please let your server know about
            allergies.
          </span>
        </div>
      </section>
      {(() => {
        const specials = restaurant.items.filter(i => i.isSpecial);
        if (!specials.length) return null;
        return (
          <section className="specials-strip gsap-menu-reveal">
            <div className="specials-head">
              <span className="section-kicker">Tonight&apos;s specials</span>
              <h2>Don&apos;t miss<span>.</span></h2>
            </div>
            <div className="specials-grid">
              {specials.map(item => (
                <button key={item.id} className="specials-card" onClick={() => setSelectedItem(item)}>
                  <img src={item.image} alt="" />
                  <div className="specials-card-shade" />
                  <div className="specials-card-content">
                    <span className="specials-tag">{item.tag ?? 'Special'}</span>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <span className="price">${item.price}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })()}

      <section className="allergen-legend gsap-menu-reveal">
        <p className="allergen-legend-kicker"><Sparkles size={12} /> Allergy & dietary info</p>
        <p className="allergen-legend-copy">Tap any dish for full details — allergens, ingredients, dietary tags and spice level. Please tell your server about allergies before ordering.</p>
        <div className="allergen-legend-tags">
          {allergenOptions.slice(0, 8).map(o => <span key={o.value} className="allergen-legend-tag">{o.label}</span>)}
          <span className="allergen-legend-tag allergen-legend-tag--more">+ {allergenOptions.length - 8} more</span>
        </div>
      </section>

      <section className="find-us gsap-menu-reveal">
        <div className="find-us-card">
          <div className="find-us-main">
            <p className="section-kicker">Find us</p>
            <h2>{restaurant.name}</h2>
            <p className="find-us-address"><MapPin size={14} /> {restaurant.address}</p>
            {restaurant.phone && <p className="find-us-phone"><Phone size={14} /> <a href={`tel:${restaurant.phone.replace(/\s/g, '')}`}>{restaurant.phone}</a></p>}
            {restaurant.instagram && <p className="find-us-ig"><Instagram size={14} /> <a href={`https://instagram.com/${restaurant.instagram}`} target="_blank" rel="noreferrer">@{restaurant.instagram}</a></p>}
            <a className="find-us-directions" href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noreferrer">Get directions →</a>
          </div>
          <div className="find-us-hours">
            <p className="find-us-hours-kicker"><Clock3 size={12} /> Hours</p>
            <p className="find-us-hours-detail">{restaurant.hoursDetail ?? restaurant.hours}</p>
            <p className="find-us-hours-note">Walk-ins welcome · Bookings for 6+</p>
          </div>
        </div>
      </section>

      <footer className="site-footer gsap-menu-reveal">
        <Logo dark />
        <div className="footer-detail">
          <span>Made for good evenings</span>
          <a href="https://instagram.com" aria-label="Instagram">
            <Instagram size={18} />
          </a>
        </div>
      </footer>
      {dialogItem && <MenuItemDetailDialog item={dialogItem} open={!!selectedItem} onClose={() => setSelectedItem(null)} />}
    </main>
  );
}

function MenuCard({ item, large, featurePosition, onSelect }: { item: MenuItem; large?: boolean; featurePosition?: "left" | "right"; onSelect: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.image) && !imageFailed;
  return (
    <article
      className={`menu-card ${large ? "menu-card-large" : ""} ${large && featurePosition === "right" ? "menu-card-featured-right" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${item.name}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      {showImage ? (
        <img src={item.image} alt={item.name} onError={() => setImageFailed(true)} />
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
            <p>{item.description}</p>
          </div>
          <span className="price">${item.price}</span>
        </div>
      </div>
    </article>
  );
}

function MenuItemDetailDialog({ item, open, onClose }: { item: MenuItem; open: boolean; onClose: () => void }) {
  const dietaryLabels = (item.dietaryTags ?? []).map(tag => optionLabel(dietaryTagOptions, tag));
  const halalLabel = item.halalStatus && item.halalStatus !== "UNKNOWN" ? optionLabel(halalStatusOptions, item.halalStatus) : undefined;
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
            <span className="price">${item.price}</span>
            {item.tag && <span className="item-tag">{item.tag}</span>}
          </div>
        </DialogHeader>
        {dietaryLabels.length > 0 && <div className="detail-chip-row">{dietaryLabels.map(label => <span className="detail-chip" key={label}>{label}</span>)}</div>}
        {item.ingredients && <div className="detail-block"><p className="detail-block-label">Ingredient highlights</p><p>{item.ingredients}</p></div>}
        {(item.allergens?.length ?? 0) > 0 && <div className="detail-block"><p className="detail-block-label">Contains</p><p>{item.allergens?.map(allergen => optionLabel(allergenOptions, allergen)).join(", ")}</p></div>}
        {(item.mayContain?.length ?? 0) > 0 && <div className="detail-block"><p className="detail-block-label">May contain</p><p>{item.mayContain?.map(allergen => optionLabel(allergenOptions, allergen)).join(", ")}</p></div>}
        {(halalLabel || spiceLabel) && <div className="detail-meta-row">{halalLabel && <span><strong>Halal</strong>{halalLabel}</span>}{spiceLabel && <span><strong>Spice</strong>{spiceLabel}</span>}</div>}
        <p className="detail-allergy-note">Please tell our team about allergies before ordering. We cannot guarantee the absence of cross-contact.</p>
      </DialogContent>
    </Dialog>
  );
}
