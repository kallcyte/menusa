 import { useEffect, useState } from "react";
 import { useQuery } from "@tanstack/react-query";
 import { Clock3, Instagram, MapPin, Search, Sparkles } from "lucide-react";
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
      <section className="hero">
        <div className="eyebrow">
          <span className="live-dot" /> {restaurant.hours}
        </div>
        <div className="hero-display" aria-hidden="true">
          Eat well.
          <br />
          <em>{restaurant.name}.</em>
        </div>
        <p className="hero-copy">{restaurant.description}</p>
        <div className="hero-meta">
          <span>
            <MapPin size={16} /> {restaurant.address}
          </span>
          <span>
            <Clock3 size={16} /> Walk-ins welcome
          </span>
        </div>
      </section>
      <section className="menu-section" id="menu">
        <div className="menu-top">
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
        <div className="category-row">
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
        <div className="bento-grid">
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
        <div className="menu-note">
          <Sparkles size={17} />
          <span>
            Our menu changes with the market. Please let your server know about
            allergies.
          </span>
        </div>
      </section>
      <footer className="site-footer">
        <Logo dark />
        <div className="footer-detail">
          <span>Made for good evenings</span>
          <a href="https://instagram.com" aria-label="Instagram">
            <Instagram size={18} />
          </a>
        </div>
      </footer>
      {selectedItem && <MenuItemDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />}
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

function MenuItemDetailDialog({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const dietaryLabels = (item.dietaryTags ?? []).map(tag => optionLabel(dietaryTagOptions, tag));
  const halalLabel = item.halalStatus && item.halalStatus !== "UNKNOWN" ? optionLabel(halalStatusOptions, item.halalStatus) : undefined;
  const spiceLabel = item.spiceLevel ? optionLabel(spiceLevelOptions, item.spiceLevel) : undefined;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
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
