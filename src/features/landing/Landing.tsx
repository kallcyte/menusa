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
  ShieldCheck,
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
import { allergenOptions, dietaryTagOptions, spiceLevelOptions } from "../../data";
import { ApiError, joinWaitlist } from "../../api";
import { optionLabel, type Navigate } from "../shared";
import { formatPrice } from "../../lib/currency";
 const features = [
   {
     icon: Layers,
     kicker: "Looks amazing",
     title: "No design skills needed",
     copy: "A clean, photo-first layout that looks great on every phone. Your best dish gets the spotlight.",
   },
   {
     icon: ShieldCheck,
     kicker: "Allergy info",
     title: "Keep every guest safe",
     copy: "Add allergens, dietary tags and ingredients for each dish. Guests just tap to see everything clearly.",
   },
   {
     icon: ImageIcon,
     kicker: "Your photos",
     title: "Make them hungry",
     copy: "Drag and drop your food photos — they load fast and look delicious on every screen.",
   },
   {
     icon: Zap,
     kicker: "Easy editing",
     title: "Update in seconds",
     copy: "Change a price or swap a photo and hit publish. Your QR code stays the same — no reprinting.",
   },
   {
     icon: Store,
     kicker: "Your order",
     title: "Arrange it your way",
     copy: "Drag to reorder, highlight chef's picks, and group dishes exactly how you want them.",
   },
   {
     icon: QrCode,
     kicker: "More than one spot?",
     title: "One login, every menu",
     copy: "Run menus for all your locations from one account. Each place gets its own link.",
   },
 ];
 
 const faqs = [
   {
     q: "Is it free to try?",
     a: "Yes — create your restaurant, add dishes and photos, and publish. Your menu is live as soon as you hit publish. No credit card needed to start.",
   },
   {
     q: "Do I need a designer or developer?",
     a: "Not at all. If you can type a dish name and price, you can build your menu. The layout, search and allergy info are all built in.",
   },
   {
     q: "How does allergy info work?",
     a: "Add ingredients, allergens, dietary tags and spice level for each dish. Guests tap any dish to see the full details — clear and reassuring before they order.",
   },
   {
     q: "Can I use my own web address?",
     a: "Right now your menu gets its own link — perfect for a QR code. Custom domains are coming soon, and your links will keep working.",
   },
   {
     q: "What happens to my QR code when I update the menu?",
     a: "Nothing — it just keeps working. Your QR points to your link. Change a price or photo and hit publish, and every table sees the new menu instantly. No need to reprint.",
   },
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
      else setMessage(t("somethingWrongCopy" as never) ?? "Terjadi kesalahan. Coba lagi.");
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
            aria-label="Email address"
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
    document.title = "Menusa — Beautiful QR menus for independent restaurants";
  }, []);

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
        <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="Menusa home">
          <Logo dark />
        </a>
        <nav className="hidden md:flex items-center gap-6 text-[13px] text-[#777970]" aria-label="Primary">
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
                  <span className="font-semibold text-[#242622]">{t("lovedBy")}</span> — Warung Nusantara, Kedai Pesisir + yours
                </p>
              </div>
           </div>

          {/* Visual */}
          <div className="landing-phone-wrap gsap-phone">
            <div className="landing-phone">
              <div className="landing-phone-notch" />
              <div className="landing-phone-header">
                <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#85877d]">{t("tonightAtTable" as never) ?? "Tonight at the table"}</span>
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
                <Search size={12} /> {t("findDish")} <span className="ml-auto rounded-full bg-[#f3f2ed] px-2 py-0.5 text-[10px]">Allergen-aware</span>
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
                <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#85877d]">Scan at table 12</p>
                <p className="text-[13px] font-semibold tracking-[-0.02em] text-[#242622]">menusa.com/warung-nusantara</p>
                <p className="text-[11px] text-[#5a9a68]">● Live — updates on publish</p>
              </div>
            </div>
            <div className="landing-float-stat gsap-float-stat">
              <Sparkles size={14} className="text-[#e75f45]" />
              <span className="text-xs font-medium text-[#242622]">Publish once</span>
              <span className="text-[11px] text-[#777970]">— every QR updates</span>
            </div>
          </div>
        </div>
      </section>

       {/* LOGO / SOCIAL PROOF STRIP */}
       <section className="landing-strip">
         <p className="section-kicker gsap-reveal text-center">See it in action — try a live menu</p>
         <div className="landing-strip-grid gsap-stagger">
           {Object.values(restaurants).map((r) => (
             <button
               key={r.slug}
               onClick={() => navigate(`/${r.slug}`)}
               className="landing-strip-card group text-left"
             >
               <div className="landing-strip-card-image">
                 <img src={r.items[0]?.image} alt="" loading="lazy" />
                 <span className="landing-strip-card-badge">Live</span>
               </div>
               <div className="landing-strip-card-body">
                 <p className="font-display text-[19px] font-medium tracking-[-0.03em] text-[#242622] group-hover:text-[#e75f45] transition-colors">{r.name}</p>
                 <p className="mt-1 line-clamp-2 text-xs leading-[1.4] text-[#777970]">{r.description}</p>
                 <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#242622]">Open /{r.slug} <ArrowUpRight size={12} /></p>
               </div>
             </button>
           ))}
           <div className="landing-strip-card landing-strip-card--cta">
             <p className="font-display text-[20px] font-medium leading-none tracking-[-0.04em]">Your restaurant here<span className="text-[#e75f45]">.</span></p>
             <p className="mt-2 text-xs leading-[1.5] text-[#777970]">Get your link in 30 seconds. No design needed.</p>
             <Button onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })} size="sm" className="mt-4 w-fit">Join the waitlist</Button>
           </div>
         </div>
       </section>
 
       {/* PROBLEM → SOLUTION */}
       <section className="landing-section">
         <div className="landing-section-head gsap-reveal">
           <p className="section-kicker">Why Menusa</p>
           <h2>Paper menus can&apos;t keep up.<br /><em>Yours can.</em></h2>
           <p>No more reprints or crossed-out prices. Just update and publish — done.</p>
         </div>
         <div className="landing-problem-grid gsap-stagger">
           <div className="landing-problem-card">
             <span className="landing-problem-icon"><Clock3 size={18} /></span>
             <h3>Changed your prices?</h3>
             <p>Update a price or remove a dish and hit publish. No PDFs, no reprints, no mess.</p>
             <span className="landing-problem-meta">Make lots of edits, publish once — every QR updates.</span>
           </div>
           <div className="landing-problem-card">
             <span className="landing-problem-icon"><ShieldCheck size={18} /></span>
             <h3>Your guests feel safe.</h3>
             <p>Add allergens, dietary tags and ingredients for every dish. Guests tap to see it all clearly.</p>
             <span className="landing-problem-meta">Exactly what you entered — nothing hidden, no surprises.</span>
           </div>
           <div className="landing-problem-card">
             <span className="landing-problem-icon"><ImageIcon size={18} /></span>
             <h3>Let your food do the talking.</h3>
             <p>Add your best food photos — they look great on every phone and make people hungry.</p>
             <span className="landing-problem-meta">Beautiful photos, even if a dish has no image yet.</span>
           </div>
         </div>
       </section>
 
       {/* FEATURES */}
       <section id="features" className="landing-section landing-section--tinted">
         <div className="landing-section-head gsap-reveal">
           <p className="section-kicker">What you get</p>
           <h2>Everything you need.<br /><em>Nothing you don&apos;t.</em></h2>
         </div>
         <div className="landing-feature-grid gsap-stagger">
           {features.map((f) => (
             <div key={f.kicker} className="landing-feature-card">
               <span className="landing-feature-icon"><f.icon size={18} /></span>
               <p className="landing-feature-kicker">{f.kicker}</p>
               <h3>{f.title}</h3>
               <p>{f.copy}</p>
             </div>
           ))}
         </div>
       </section>
       {/* HOW IT WORKS */}
       <section id="how-it-works" className="landing-section">
         <div className="landing-section-head gsap-reveal">
           <p className="section-kicker">How it works</p>
           <h2>From kitchen to QR in <em>three steps</em>.</h2>
         </div>
         <div className="landing-steps">
           <div className="landing-step gsap-step">
             <span className="landing-step-num">01</span>
             <div className="landing-step-card">
               <p className="landing-step-kicker">Set up your restaurant</p>
               <h3>Pick your link</h3>
               <p>Add your name, description, address and hours. Your menu gets its own link — perfect for a QR code.</p>
               <div className="landing-step-meta"><MapPin size={12} /> 14 Harbour Lane · <Clock3 size={12} /> Open today</div>
             </div>
           </div>
           <div className="landing-step gsap-step">
             <span className="landing-step-num">02</span>
             <div className="landing-step-card">
               <p className="landing-step-kicker">Add your dishes</p>
               <h3>Make it yours</h3>
               <p>Add photos, prices and details for each dish. Drag to reorder and shine a light on your specials.</p>
               <div className="landing-step-meta"><Layers size={12} /> Drag to reorder · <ImageIcon size={12} /> Add your photos</div>
             </div>
           </div>
           <div className="landing-step gsap-step">
             <span className="landing-step-num">03</span>
             <div className="landing-step-card landing-step-card--accent">
               <p className="landing-step-kicker">Share your QR code</p>
               <h3>You&apos;re live!</h3>
               <p>Hit publish and your menu is live. Print your QR code — any change you make shows up instantly.</p>
               <div className="landing-step-meta"><QrCode size={12} /> Same QR, always up to date · <Sparkles size={12} /> Ready in seconds</div>
             </div>
           </div>
         </div>
         <div className="landing-steps-cta">
           <Button onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}>Join the waitlist — free <ArrowUpRight size={15} /></Button>
           <span className="text-xs text-[#85877d]">No spam · We&apos;ll email you when Menusa is ready</span>
         </div>
       </section>
 
       {/* LIVE DEMO */}
       <section id="demo" className="landing-section landing-section--tinted">
         <div className="landing-demo-head gsap-reveal">
           <div>
             <p className="section-kicker">Try it yourself</p>
             <h2>See what your guests <em>will see</em>.</h2>
             <p className="landing-demo-copy">Search, filter and tap any dish to see the details. This is the real thing — exactly what guests see at <span className="font-mono text-[#242622]">/{restaurants["restaurant-1"].slug}</span>.</p>
           </div>
           <Button variant="outline" onClick={() => navigate("/restaurant-1")} className="shrink-0 bg-white">
             Open full menu <ArrowUpRight size={14} />
           </Button>
         </div>
 
         <div className="landing-demo-controls gsap-reveal">
           <div className="search-wrap !w-full sm:!w-[220px] bg-white rounded-md border border-[#d4d4cc]">
             <Search className="search-prefix-icon" size={16} aria-hidden="true" />
             <Input
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="Find a dish"
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
               className={`menu-card text-left ${index === 0 && active === "All" && !search.trim() ? "menu-card-large" : ""}`}
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
               <p>No dishes match &quot;{search.trim()}&quot; in {active}.</p>
               <Button variant="outline" size="sm" onClick={() => { setSearch(""); setActive("All"); }}>Clear filters</Button>
             </div>
           )}
         </div>
         <p className="mt-4 text-center text-xs text-[#85877d]">Showing {previewItems.length} of {filtered.length} dishes · <button onClick={() => navigate("/restaurant-1")} className="text-[#e75f45] hover:text-[#b04b39] bg-transparent">View all at /restaurant-1 →</button></p>
       </section>
 
       {/* AUDIENCE SPLIT */}
       <section className="landing-split">
         <div className="landing-split-card landing-split-card--dark">
           <p className="section-kicker !text-[#e78a77]">For your guests</p>
           <h3>Simple, clear, <em>reassuring</em>.</h3>
           <ul>
             <li><Check size={14} /> Works on any phone, no app needed</li>
             <li><Check size={14} /> Find dishes with search and filters</li>
             <li><Check size={14} /> Tap any dish for ingredients and allergens</li>
             <li><Check size={14} /> Just scan the QR — that&apos;s it</li>
           </ul>
           <p className="landing-split-note">“Please let your server know about any allergies.”</p>
         </div>
         <div className="landing-split-card landing-split-card--light">
           <p className="section-kicker">For you</p>
           <h3>Stay in control, <em>effortlessly</em>.</h3>
           <ul>
             <li><Check size={14} /> Save drafts and publish when you&apos;re ready</li>
             <li><Check size={14} /> Reorder dishes with a simple drag</li>
             <li><Check size={14} /> Your photos are safe and load super fast</li>
             <li><Check size={14} /> Everything is secure and backed up</li>
           </ul>
           <Button variant="dark" onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })} className="mt-5">Join the waitlist <ArrowUpRight size={14} /></Button>
         </div>
       </section>

      {/* FAQ */}
      <section id="faq" className="landing-section">
        <div className="landing-section-head gsap-reveal">
          <p className="section-kicker">FAQ</p>
          <h2>Anything else?</h2>
        </div>
        <div className="landing-faq gsap-stagger">
          {faqs.map((f, i) => (
            <div key={f.q} className={`landing-faq-item ${openFaq === i ? "open" : ""}`}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="landing-faq-q">
                <span>{f.q}</span>
                <span className="landing-faq-icon">{openFaq === i ? "—" : "+"}</span>
              </button>
              {openFaq === i && <p className="landing-faq-a">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>
        {/* WAITLIST CTA */}
       <section id="waitlist" className="landing-cta">
         <div className="landing-cta-card gsap-reveal">
           <p className="eyebrow !text-[#e78a77] !justify-center">Join the waitlist</p>
           <h2>Be first to get<br /><em>your menu live.</em></h2>
           <p>Join the waitlist for early access. We&apos;ll help you set up — free.</p>
           <WaitlistForm variant="dark" className="mt-8 mx-auto w-full max-w-[520px]" />
           <div className="mt-6 flex flex-wrap justify-center gap-3">
             <Button variant="outline" onClick={() => navigate("/restaurant-1")} className="h-10 px-6 border-white/20 bg-transparent text-white hover:bg-white hover:text-[#252723] text-[13px]">See a demo menu</Button>
           </div>
           <p className="mt-4 text-xs text-white/60">No spam · Early access · Free setup help</p>
        </div>
      </section>
      <footer className="site-footer">
        <Logo dark />
        <div className="footer-detail">
          <span>© {new Date().getFullYear()} Menusa · Made for good evenings</span>
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
                <p className="detail-block-label">Ingredients</p>
                <p>{selectedItem.ingredients}</p>
              </div>
            )}
            {(selectedItem.allergens?.length || selectedItem.mayContain?.length) && (
              <div className="detail-block">
                <p className="detail-block-label">Allergens</p>
                {selectedItem.allergens?.length ? (
                  <p>{selectedItem.allergens.map((a: string) => optionLabel(allergenOptions, a)).join(" · ")}</p>
                ) : null}
                {selectedItem.mayContain?.length ? (
                  <p className="mt-1 text-[#806b45]">May contain: {selectedItem.mayContain.map((a: string) => optionLabel(allergenOptions, a)).join(" · ")}</p>
                ) : null}
              </div>
            )}
            {(selectedItem.allergens?.length || selectedItem.mayContain?.length) && (
              <p className="detail-allergy-note">Please let your server know about allergies — cross-contact information is shown above.</p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}