import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Image as ImageIcon,
  Layers,
  Mail,
  MapPin,
  QrCode,
  Search,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";
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
import { categories, menuItems, restaurants, type MenuItem } from "../../data";
import { dietaryTagOptions, spiceLevelOptions } from "../../data";
import { ApiError, joinWaitlist } from "../../api";
import { optionLabel, type Navigate } from "../shared";
import { formatPrice } from "../../lib/currency";
const features = [
  {
    icon: Layers,
    kickerKey: "featureLooksKicker",
    titleKey: "featureLooksTitle",
    copyKey: "featureLooksCopy",
  },
  {
    icon: ImageIcon,
    kickerKey: "featurePhotosKicker",
    titleKey: "featurePhotosTitle",
    copyKey: "featurePhotosCopy",
  },
  {
    icon: Zap,
    kickerKey: "featureEditingKicker",
    titleKey: "featureEditingTitle",
    copyKey: "featureEditingCopy",
  },
  {
    icon: Store,
    kickerKey: "featureOrderKicker",
    titleKey: "featureOrderTitle",
    copyKey: "featureOrderCopy",
  },
  {
    icon: QrCode,
    kickerKey: "featureLocationsKicker",
    titleKey: "featureLocationsTitle",
    copyKey: "featureLocationsCopy",
  },
] as const;

const faqs = [
  { qKey: "faqFreeQuestion", aKey: "faqFreeAnswer" },
  { qKey: "faqDesignerQuestion", aKey: "faqDesignerAnswer" },
  { qKey: "faqAddressQuestion", aKey: "faqAddressAnswer" },
  { qKey: "faqQrQuestion", aKey: "faqQrAnswer" },
];
 


function WaitlistForm({ variant = "light", className = "" }: { variant?: "light" | "dark"; className?: string }) {
  const { t } = useTranslation("landing")
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setMessage(t("waitlistInvalid"));
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await joinWaitlist(trimmed);
      if ((res as { already?: boolean }).already) {
        setStatus("success");
        setMessage(t("waitlistSuccessAlready"));
      } else {
        setStatus("success");
        setMessage(t("waitlistSuccessNew"));
      }
      setEmail("");
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError) setMessage(err.message);
      else setMessage(t("somethingWrongCopy"));
    }
  }

  const isDark = variant === "dark";

  if (status === "success") {
    return (
      <div className={className}>
        <div className={isDark ? "waitlist-success waitlist-success--dark" : "waitlist-success"}>
          <span className="waitlist-success-icon"><Check size={16} /></span>
          <div>
            <p className="waitlist-success-title">{t("waitlistSuccessTitle")}</p>
            <p className="waitlist-success-copy">{message}</p>
          </div>
        </div>
      </div>
    );
  }

 
  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      <div className={isDark ? "waitlist-form waitlist-form--dark" : "waitlist-form"}>
        <div className="waitlist-field">
          <Mail size={16} className={isDark ? "waitlist-field-icon waitlist-field-icon--dark" : "waitlist-field-icon"} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("waitlistPlaceholder")}
            aria-label={t("emailLabel")}
            className={isDark ? "waitlist-input waitlist-input--dark" : "waitlist-input"}
            disabled={status === "loading"}
            required
          />
        </div>
        <Button type="submit" disabled={status === "loading"} className={isDark ? "waitlist-submit waitlist-submit--dark !rounded-full" : "waitlist-submit !rounded-full"}>
          {status === "loading" ? t("joining") : t("joinWaitlist")} <ArrowUpRight size={14} />
        </Button>
      </div>
      {status === "error" && message && <p className={isDark ? "waitlist-error waitlist-error--dark" : "waitlist-error"}>{message}</p>}
      <p className={isDark ? "waitlist-hint waitlist-hint--dark" : "waitlist-hint"}>{t("waitlistHint")}</p>
    </form>
  );
}

export function Landing({ navigate }: { navigate: Navigate }) {
  const { t, i18n } = useTranslation("landing")
  const { t: tCommon } = useTranslation("common")
  const [active, setActive] = useState("Semua");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = t("pageTitle");
  }, [i18n.language, t]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".gsap-hero-eyebrow", { opacity: 0, y: 12, duration: 0.6, ease: "power2.out" });
      gsap.from(".gsap-hero-title", { opacity: 0, y: 24, duration: 0.7, delay: 0.1, ease: "power3.out" });
      gsap.from(".gsap-hero-copy", { opacity: 0, y: 16, duration: 0.6, delay: 0.2, ease: "power2.out" });
      gsap.from(".gsap-hero-form", { opacity: 0, y: 16, duration: 0.6, delay: 0.3, ease: "power2.out" });
      gsap.from(".gsap-hero-meta", { opacity: 0, duration: 0.5, delay: 0.4, ease: "power2.out" });
      gsap.from(".gsap-hero-social", { opacity: 0, y: 8, duration: 0.5, delay: 0.5, ease: "power2.out" });
      gsap.from(".gsap-phone", { opacity: 0, y: 32, scale: 0.97, duration: 0.8, delay: 0.2, ease: "power3.out" });
      gsap.from(".gsap-qr", {
        opacity: 0, scale: 0.9, y: 12, duration: 0.6, delay: 0.7, ease: "back.out(1.2)",
        onComplete() {
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          gsap.to(".gsap-qr", { y: -6, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
        },
      });
      gsap.from(".gsap-float-stat", { opacity: 0, y: 12, duration: 0.5, delay: 0.9, ease: "power2.out" });

      // Scroll-triggered: use fromTo with autoAlpha so elements are visible before trigger
      gsap.utils.toArray<HTMLElement>(".gsap-reveal").forEach((el) => {
        gsap.fromTo(el,
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } }
        );
      });
      gsap.utils.toArray<HTMLElement>(".gsap-stagger").forEach((container) => {
        const children = container.querySelectorAll<HTMLElement>(":scope > *");
        if (!children.length) return;
        gsap.fromTo(children,
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: container, start: "top 88%" } }
        );
      });
      gsap.utils.toArray<HTMLElement>(".gsap-step").forEach((el, i) => {
        gsap.fromTo(el,
          { autoAlpha: 0, x: i % 2 === 0 ? -20 : 20, y: 16 },
          { autoAlpha: 1, x: 0, y: 0, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } }
        );
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter(
      (item) =>
        (active === "Semua" || item.category === active) &&
        `${item.name} ${item.description}`.toLowerCase().includes(q)
    );
  }, [active, search]);

  const previewItems = filtered.slice(0, 4);

  return (
    <main ref={rootRef} className="landing-shell">
      {/* NAV */}
      <header className="site-header sticky top-0 z-30 bg-[#f3f2ed]/80 backdrop-blur supports-[backdrop-filter]:bg-[#f3f2ed]/70 border-b border-transparent">
        <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label={t("homeAriaLabel")}>
          <Logo dark />
        </a>
        <nav className="hidden md:flex items-center gap-6 text-[13px] text-[#777970]" aria-label={t("primaryNav")}>
          <a href="#features" className="hover:text-[#242622] transition-colors">{t("features")}</a>
          <a href="#how-it-works" className="hover:text-[#242622] transition-colors">{t("howItWorks")}</a>
          <a href="#demo" className="hover:text-[#242622] transition-colors">{t("demo")}</a>
          <a href="#faq" className="hover:text-[#242622] transition-colors">{t("faq")}</a>
        </nav>
        <div className="header-actions">
          <LanguageSwitcher variant="compact" />
          <Button variant="outline" onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })} className="hidden sm:inline-flex bg-white">
            {t("seeLiveMenu")}
          </Button>
          <Button variant="outline" onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })} size="sm" className="sm:hidden bg-white">
            {t("seeDemo")}
          </Button>
        </div>
      </header>

        {/* HERO */}
        <section className="landing-hero">
          <div className="landing-hero-grid">
            <div>
              <div className="eyebrow gsap-hero-eyebrow !text-[#e75f45] !tracking-[0.08em]">
                <span className="live-dot !bg-[#e75f45]" /> {t("eyebrow")}
              </div>
              <h1 className="hero-display gsap-hero-title !mb-5 !mt-5">
                {t("heroTitle1")}
                <br />
                <em>{t("heroTitle2")}</em>
                <br />
                <span className="font-sans font-semibold tracking-[-0.08em] text-[#e75f45]">{t("heroTitle3")}</span>
              </h1>
              <p className="hero-copy gsap-hero-copy !max-w-[420px] !text-[17px]">
                {t("heroCopy")}
              </p>
              <WaitlistForm className="gsap-hero-form mt-6 max-w-[420px]" />
              <div className="gsap-hero-meta mt-4 flex flex-wrap items-center gap-3 text-[11px] text-[#85877d]">
                <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#5a9a68]" /> {t("noCreditCard")}</span>
                <span className="h-3 w-px bg-[#d4d4cc]" />
                <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#5a9a68]" /> {t("readyIn2")}</span>
              </div>
              <div className="gsap-hero-social mt-6 flex items-center gap-3 border-t border-[#d4d4cc] pt-5">
                <div className="flex -space-x-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#252723] text-[10px] font-bold text-white ring-2 ring-[#f3f2ed]">S</span>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e75f45] text-[10px] font-bold text-white ring-2 ring-[#f3f2ed]">A</span>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#5a7b65] text-[10px] font-bold text-white ring-2 ring-[#f3f2ed]">+</span>
                </div>
                <p className="text-xs leading-[1.4] text-[#777970]">
                  <span className="font-semibold text-[#242622]">{t("lovedBy")}</span> — {t("lovedByNames")}
                </p>
              </div>
           </div>

          {/* Visual */}
          <div className="landing-phone-wrap gsap-phone">
            <div className="landing-phone">
              <div className="landing-phone-notch" />
              <div className="landing-phone-header">
                <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#85877d]">{t("tonightAtTable")}</span>
                <span className="text-[11px] font-medium text-[#242622]">Warung Nusantara</span>
              </div>
              <div className="landing-phone-grid">
                {menuItems.slice(0, 4).map((item, i) => (
                  <div key={item.id} className={i === 0 ? "landing-phone-card landing-phone-card--featured" : "landing-phone-card"}>
                    <img src={item.image} alt="" loading="lazy" />
                    <div className="landing-phone-card-shade" />
                    <div className="landing-phone-card-content">
                      {item.tag && <span className="landing-phone-tag">{item.tag}</span>}
                      <p className="landing-phone-card-title">{item.name}</p>
                      <p className="landing-phone-card-price">{formatPrice(item.price, "IDR", i18n.language)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="landing-phone-search">
                <Search size={12} /> {t("findDish")}
              </div>
            </div>

            {/* Floating QR card */}
            <div className="landing-qr-card gsap-qr">
              <div className="landing-qr-box">
                <QrCode size={28} />
                <div className="landing-qr-grid" aria-hidden="true">
                  <span /><span /><span /><span /><span /><span /><span /><span /><span />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#85877d]">{t("scanAtTable")}</p>
                <p className="text-[13px] font-semibold tracking-[-0.02em] text-[#242622]">menusa.com/warung-nusantara</p>
                <p className="text-[11px] text-[#5a9a68]">{t("liveUpdatesOnPublish")}</p>
              </div>
            </div>
            <div className="landing-float-stat gsap-float-stat">
              <Sparkles size={14} className="text-[#e75f45]" />
              <span className="text-xs font-medium text-[#242622]">{t("publishOnce")}</span>
              <span className="text-[11px] text-[#777970]">{t("everyQrUpdates")}</span>
            </div>
          </div>
        </div>
      </section>

       {/* LOGO / SOCIAL PROOF STRIP */}
       <section className="landing-strip">
       <p className="section-kicker gsap-reveal text-center">{t("stripKicker")}</p>
       <div className="landing-strip-grid gsap-stagger">
         {Object.values(restaurants).map((r) => (
           <button
             key={r.slug}
             onClick={() => navigate(`/${r.slug}`)}
             className="landing-strip-card group text-left"
           >
             <div className="landing-strip-card-image">
               <img src={r.items[0]?.image} alt="" loading="lazy" />
               <span className="landing-strip-card-badge">{t("liveBadge")}</span>
             </div>
             <div className="landing-strip-card-body">
               <p className="font-display text-[19px] font-medium tracking-[-0.03em] text-[#242622] group-hover:text-[#e75f45] transition-colors">{r.name}</p>
               <p className="mt-1 line-clamp-2 text-xs leading-[1.4] text-[#777970]">{r.description}</p>
               <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#242622]">{t("openRestaurant", { slug: r.slug })} <ArrowUpRight size={12} /></p>
             </div>
           </button>
         ))}
         <div className="landing-strip-card landing-strip-card--cta">
           <p className="font-display text-[20px] font-medium leading-none tracking-[-0.04em]">{t("yourRestaurantHere")}</p>
           <p className="mt-2 text-xs leading-[1.5] text-[#777970]">{t("getLinkCopy")}</p>
           <Button onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })} size="sm" className="mt-4 w-fit">{t("joinWaitlist")}</Button>
         </div>
       </div>
       </section>
 
       {/* PROBLEM → SOLUTION */}
       <section className="landing-section">
         <div className="landing-section-head gsap-reveal">
           <p className="section-kicker">{t("whyMenusa")}</p>
           <h2>{t("problemTitle1")}<br /><em>{t("problemTitle2")}</em></h2>
           <p>{t("problemCopy")}</p>
         </div>
         <div className="landing-problem-grid gsap-stagger">
           <div className="landing-problem-card">
             <span className="landing-problem-icon"><Clock3 size={18} /></span>
             <h3>{t("problemChangedTitle")}</h3>
             <p>{t("problemChangedCopy")}</p>
             <span className="landing-problem-meta">{t("problemChangedMeta")}</span>
           </div>
           <div className="landing-problem-card">
             <span className="landing-problem-icon"><ImageIcon size={18} /></span>
             <h3>{t("problemPhotosTitle")}</h3>
             <p>{t("problemPhotosCopy")}</p>
             <span className="landing-problem-meta">{t("problemPhotosMeta")}</span>
           </div>
           <div className="landing-problem-card">
             <span className="landing-problem-icon"><Search size={18} /></span>
             <h3>{t("problemSearchTitle")}</h3>
             <p>{t("problemSearchCopy")}</p>
             <span className="landing-problem-meta">{t("problemSearchMeta")}</span>
           </div>
         </div>
 
       </section>
       {/* FEATURES */}
       <section id="features" className="landing-section landing-section--tinted">
         <div className="landing-section-head gsap-reveal">
           <p className="section-kicker">{t("whatYouGet")}</p>
           <h2>{t("featuresTitle1")}<br /><em>{t("featuresTitle2")}</em></h2>
         </div>
         <div className="landing-feature-grid gsap-stagger">
           {features.map((f) => (
             <div key={f.kickerKey} className="landing-feature-card">
               <span className="landing-feature-icon"><f.icon size={18} /></span>
               <p className="landing-feature-kicker">{t(f.kickerKey)}</p>
               <h3>{t(f.titleKey)}</h3>
               <p>{t(f.copyKey)}</p>
             </div>
           ))}
         </div>
       </section>
       {/* HOW IT WORKS */}
       <section id="how-it-works" className="landing-section">
         <div className="landing-section-head gsap-reveal">
           <p className="section-kicker">{t("howItWorksKicker")}</p>
           <h2>{t("howItWorksTitle1")} <em>{t("howItWorksTitle2")}</em>.</h2>
         </div>
         <div className="landing-steps">
           <div className="landing-step gsap-step">
             <span className="landing-step-num">01</span>
             <div className="landing-step-card">
               <p className="landing-step-kicker">{t("step1Kicker")}</p>
               <h3>{t("step1Title")}</h3>
               <p>{t("step1Copy")}</p>
               <div className="landing-step-meta"><MapPin size={12} /> {t("step1Address")} · <Clock3 size={12} /> {t("step1Status")}</div>
             </div>
           </div>
           <div className="landing-step gsap-step">
             <span className="landing-step-num">02</span>
             <div className="landing-step-card">
               <p className="landing-step-kicker">{t("step2Kicker")}</p>
               <h3>{t("step2Title")}</h3>
               <p>{t("step2Copy")}</p>
               <div className="landing-step-meta"><Layers size={12} /> {t("step2MetaFirst")} · <ImageIcon size={12} /> {t("step2MetaSecond")}</div>
             </div>
           </div>
           <div className="landing-step gsap-step">
             <span className="landing-step-num">03</span>
             <div className="landing-step-card landing-step-card--accent">
               <p className="landing-step-kicker">{t("step3Kicker")}</p>
               <h3>{t("step3Title")}</h3>
               <p>{t("step3Copy")}</p>
               <div className="landing-step-meta"><QrCode size={12} /> {t("step3MetaFirst")} · <Sparkles size={12} /> {t("step3MetaSecond")}</div>
             </div>
           </div>
         </div>
         <div className="landing-steps-cta">
           <Button onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}>{t("waitlistFree")} <ArrowUpRight size={15} /></Button>
           <span className="text-xs text-[#85877d]">{t("waitlistReadyHint")}</span>
         </div>
       </section>
 
       {/* LIVE DEMO */}
       <section id="demo" className="landing-section landing-section--tinted">
         <div className="landing-demo-head gsap-reveal">
           <div>
             <p className="section-kicker">{t("demoKicker")}</p>
             <h2>{t("demoSectionTitle1")} <em>{t("demoSectionTitle2")}</em>.</h2>
             <p className="landing-demo-copy">{t("demoSectionCopy")} <span className="font-mono text-[#242622]">/{restaurants["restaurant-1"].slug}</span>.</p>
           </div>
           <Button variant="outline" onClick={() => navigate("/restaurant-1")} className="shrink-0 bg-white">
             {t("openFullMenu")} <ArrowUpRight size={14} />
           </Button>
         </div>

         <div className="landing-demo-controls gsap-reveal">
           <div className="search-wrap !w-full sm:!w-[220px] bg-white rounded-md border border-[#d4d4cc]">
             <Search className="search-prefix-icon" size={16} aria-hidden="true" />
             <Input
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder={t("findDish")}
               className="!pl-9"
             />
           </div>
           <div className="category-row !my-0 !flex-1">
             {categories.map((c) => (
               <button key={c} className={active === c ? "category active" : "category bg-white"} onClick={() => setActive(c)}>
                 {c}
               </button>
             ))}
           </div>
         </div>

         <div className="bento-grid gsap-stagger !mt-6">
           {previewItems.map((item: MenuItem, index: number) => (
             <button
               key={item.id}
               onClick={() => setSelectedItem(item)}
               className={`menu-card text-left ${index === 0 && active === categories[0] && !search.trim() ? "menu-card-large" : ""}`}
             >
               <img src={item.image} alt="" loading="lazy" />
               <div className="card-shade" />
               <div className="card-content">
                 {item.tag && <span className="item-tag">{item.tag}</span>}
                 <div className="card-title-row">
                   <div>
                     <h3>{item.name}</h3>
                     <p>{item.description}</p>
                   </div>
                   <span className="price">{formatPrice(item.price, "IDR", i18n.language)}</span>
                 </div>
               </div>
             </button>
           ))}
           {!previewItems.length && (
             <div className="menu-grid-empty">
               <p>{t("noDishesMatch", { search: search.trim(), category: active === categories[0] ? t("allCategories") : active })}</p>
               <Button variant="outline" size="sm" onClick={() => { setSearch(""); setActive(categories[0]); }}>{t("clearFilters")}</Button>
             </div>
           )}
         </div>
         <p className="mt-4 text-center text-xs text-[#85877d]">{t("showingDishes", { shown: previewItems.length, total: filtered.length })} · <button onClick={() => navigate("/restaurant-1")} className="text-[#e75f45] hover:text-[#b04b39] bg-transparent">{t("viewAllAt", { slug: restaurants["restaurant-1"].slug })}</button></p>
       </section>
 
       {/* AUDIENCE SPLIT */}
       <section className="landing-split">
         <div className="landing-split-card landing-split-card--dark">
           <p className="section-kicker !text-[#e78a77]">{t("forGuests")}</p>
           <h3>{t("guestsTitle1")} <em>{t("guestsTitle2")}</em>.</h3>
           <ul>
             <li><Check size={14} /> {t("guestFeature1")}</li>
             <li><Check size={14} /> {t("guestFeature2")}</li>
             <li><Check size={14} /> {t("guestFeature3")}</li>
             <li><Check size={14} /> {t("guestFeature4")}</li>
           </ul>
         </div>
         <div className="landing-split-card landing-split-card--light">
           <p className="section-kicker">{t("forYou")}</p>
           <h3>{t("youTitle1")} <em>{t("youTitle2")}</em>.</h3>
           <ul>
             <li><Check size={14} /> {t("youFeature1")}</li>
             <li><Check size={14} /> {t("youFeature2")}</li>
             <li><Check size={14} /> {t("youFeature3")}</li>
             <li><Check size={14} /> {t("youFeature4")}</li>
           </ul>
           <Button variant="dark" onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })} className="mt-5">{t("joinWaitlist")} <ArrowUpRight size={14} /></Button>
         </div>
       </section>

      {/* FAQ */}
      <section id="faq" className="landing-section">
        <div className="landing-section-head gsap-reveal">
          <p className="section-kicker">{t("faqKicker")}</p>
          <h2>{t("faqTitle")}</h2>
        </div>
        <div className="landing-faq gsap-stagger">
          {faqs.map((f, i) => (
            <div key={f.qKey} className={`landing-faq-item ${openFaq === i ? "open" : ""}`}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="landing-faq-q">
                <span>{t(f.qKey)}</span>
                <span className="landing-faq-icon">{openFaq === i ? "—" : "+"}</span>
              </button>
              {openFaq === i && <p className="landing-faq-a">{t(f.aKey)}</p>}
            </div>
          ))}
        </div>
      </section>
        {/* WAITLIST CTA */}
       <section id="waitlist" className="landing-cta">
         <div className="landing-cta-card gsap-reveal">
         <p className="eyebrow !text-[#e78a77] !justify-center">{t("ctaEyebrow")}</p>
         <h2>{t("ctaTitle1")}<br /><em>{t("ctaTitle2")}</em></h2>
         <p>{t("ctaCopy")}</p>
         <WaitlistForm variant="dark" className="mt-8 mx-auto w-full max-w-[520px]" />
         <div className="mt-6 flex flex-wrap justify-center gap-3">
           <Button variant="outline" onClick={() => navigate("/restaurant-1")} className="h-10 px-6 border-white/20 bg-transparent text-white hover:bg-white hover:text-[#252723] text-[13px]">{t("seeDemoMenu")}</Button>
         </div>
         <p className="mt-4 text-xs text-white/60">{t("ctaHint")}</p>
        </div>
      </section>
      <footer className="site-footer">
        <Logo dark />
        <div className="footer-detail">
          <span>© {new Date().getFullYear()} Menusa · {t("madeForGoodEvenings")}</span>
          <a href="https://instagram.com" aria-label="Instagram" className="text-[#85877d] hover:text-[#242622]">
            <span className="sr-only">Instagram</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" /></svg>
          </a>
        </div>
      </footer>

      {selectedItem && (
        <Dialog open onOpenChange={(o) => !o && setSelectedItem(null)}>
          <DialogContent className="item-detail-dialog">
            <div className="item-detail-image-wrap">
              <img src={selectedItem.image} alt="" className="item-detail-image" />
            </div>
            <DialogHeader className="item-detail-header">
              <p className="section-kicker">{selectedItem.category}</p>
              <DialogTitle>{selectedItem.name}</DialogTitle>
              <DialogDescription>{selectedItem.description}</DialogDescription>
              <div className="item-detail-price-row">
                <span className="price">{formatPrice(selectedItem.price, "IDR", i18n.language)}</span>
                {selectedItem.tag && <span className="item-tag">{selectedItem.tag}</span>}
              </div>
            </DialogHeader>
            {(selectedItem.dietaryTags?.length || selectedItem.spiceLevel) && (
              <div className="detail-chip-row">
                {selectedItem.dietaryTags?.map((t: string) => (
                  <span key={t} className="detail-chip">{optionLabel(dietaryTagOptions, t)}</span>
                ))}
                {selectedItem.spiceLevel && <span className="detail-chip">{optionLabel(spiceLevelOptions, selectedItem.spiceLevel)}</span>}
              </div>
            )}
            {selectedItem.ingredients && (
              <div className="detail-block">
                <p className="detail-block-label">{t("ingredients")}</p>
                <p>{selectedItem.ingredients}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}