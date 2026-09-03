import { useEffect, useRef, useState } from "react"
import QRCodeStyling from "qr-code-styling"
import { Check, ChevronDown, Copy, Download, ExternalLink, ImageIcon, Printer, Share2, Upload, X } from "lucide-react"
import { Button } from "../../components"
import { Input } from "../../components/ui/input"
import { Select } from "../../components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu"
import type { AdminRestaurant } from "../../api"
import { useToast } from "../../components/ui/toast"

type DotType = "square" | "dots" | "rounded" | "extra-rounded" | "classy" | "classy-rounded"
type CornerSquareType = "square" | "dot" | "extra-rounded"
type CornerDotType = "square" | "dot"
type BgStyle = "solid" | "gradient"
type PrintPaper = "a4-single" | "a5-single" | "a4-2up" | "a4-4up"

const DOT_OPTIONS: { value: DotType; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "dots", label: "Dots" },
  { value: "rounded", label: "Rounded" },
  { value: "extra-rounded", label: "Extra rounded" },
  { value: "classy", label: "Classy" },
  { value: "classy-rounded", label: "Classy rounded" },
]
const CORNER_SQUARE_OPTIONS: { value: CornerSquareType; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "dot", label: "Dot" },
  { value: "extra-rounded", label: "Extra rounded" },
]
const CORNER_DOT_OPTIONS: { value: CornerDotType; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "dot", label: "Dot" },
]
const FRAME_OPTIONS = [
  { value: "none", label: "No frame" },
  { value: "scan-me", label: "SCAN ME" },
  { value: "scan-to-view", label: "Scan to view menu" },
  { value: "custom", label: "Custom text…" },
]

const QR_SIZE = 400
const DEFAULT_LOGO_SIZE = 100
const DEFAULT_LOGO_PADDING = 4
const DOWNLOAD_SIZE = 480
const HIRES_SIZE = 2048

export function QrPanel({ restaurant }: { restaurant: AdminRestaurant }) {
  const { toast } = useToast()
  const containerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<QRCodeStyling | null>(null)
  const logoImgRef = useRef<HTMLImageElement | null>(null)
  const [copied, setCopied] = useState(false)
  const url = typeof window !== "undefined" ? `${window.location.origin}/${restaurant.slug}` : `/${restaurant.slug}`

  const [fg, setFg] = useState("#242622")
  const [bg, setBg] = useState("#ffffff")
  const [bgStyle, setBgStyle] = useState<BgStyle>("solid")
  const [bg2, setBg2] = useState("#f3f2ed")
  const [dotType, setDotType] = useState<DotType>("square")
  const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>("square")
  const [cornerDotType, setCornerDotType] = useState<CornerDotType>("square")
  const [logo, setLogo] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoSize, setLogoSize] = useState(DEFAULT_LOGO_SIZE)
  const [logoPadding, setLogoPadding] = useState(DEFAULT_LOGO_PADDING)
  const [logoOffsetX, setLogoOffsetX] = useState(0)
  const [logoOffsetY, setLogoOffsetY] = useState(0)
  const [frame, setFrame] = useState("scan-me")
  const [customFrameText, setCustomFrameText] = useState("")
  const [frameColor, setFrameColor] = useState("#242622")
  const [printPaper, setPrintPaper] = useState<PrintPaper>("a4-single")
  const [printShowHelp, setPrintShowHelp] = useState(true)
  const [printShowUrl, setPrintShowUrl] = useState(true)
  const [printShowAddress, setPrintShowAddress] = useState(true)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)

  const frameText = frame === "none" ? "" : frame === "custom" ? customFrameText : frame === "scan-me" ? "SCAN ME" : "Scan to view menu"

  const offscreenRef = useRef<HTMLCanvasElement | null>(null)

  const buildOptions = (): ConstructorParameters<typeof QRCodeStyling>[0] => ({
    width: QR_SIZE,
    height: QR_SIZE,
    data: url,
    margin: 8,
    qrOptions: { errorCorrectionLevel: logo ? "H" : "Q" },
    dotsOptions: {
      type: dotType,
      color: fg,
      ...(bgStyle === "gradient" ? { gradient: { type: "linear" as const, rotation: 0, colorStops: [{ offset: 0, color: fg }, { offset: 1, color: bg2 }] } } : {}),
    },
    backgroundOptions: { color: bg },
    cornersSquareOptions: { type: cornerSquareType, color: fg },
    cornersDotOptions: { type: cornerDotType, color: fg },
  })

  const saveCleanSnapshot = () => {
    const canvas = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null
    if (!canvas) return
    if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas")
    offscreenRef.current.width = QR_SIZE
    offscreenRef.current.height = QR_SIZE
    offscreenRef.current.getContext("2d")?.drawImage(canvas, 0, 0, QR_SIZE, QR_SIZE)
  }

  const restoreCleanSnapshot = () => {
    const canvas = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null
    const off = offscreenRef.current
    if (!canvas || !off || off.width === 0) return false
    const ctx = canvas.getContext("2d")
    if (!ctx) return false
    ctx.clearRect(0, 0, QR_SIZE, QR_SIZE)
    ctx.drawImage(off, 0, 0, QR_SIZE, QR_SIZE)
    return true
  }

  const drawLogoOverlay = () => {
    const canvas = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null
    if (!canvas) return
    if (!logo || !logoImgRef.current) {
      restoreCleanSnapshot()
      return
    }
    if (!restoreCleanSnapshot()) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const img = logoImgRef.current
    if (!img.complete || img.naturalWidth === 0) return
    const size = Math.max(16, Math.min(160, logoSize))
    const pad = Math.max(0, Math.min(24, logoPadding))
    const total = size + pad * 2
    const cx = QR_SIZE / 2 + logoOffsetX
    const cy = QR_SIZE / 2 + logoOffsetY
    const x = Math.max(0, Math.min(QR_SIZE - total, cx - total / 2))
    const y = Math.max(0, Math.min(QR_SIZE - total, cy - total / 2))
    ctx.save()
    const r = 6
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    // @ts-ignore
    if (ctx.roundRect) ctx.roundRect(x, y, total, total, r)
    else ctx.rect(x, y, total, total)
    ctx.fill()
    ctx.strokeStyle = "rgba(0,0,0,0.06)"
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.beginPath()
    // @ts-ignore
    if (ctx.roundRect) ctx.roundRect(x + pad, y + pad, size, size, 4)
    else ctx.rect(x + pad, y + pad, size, size)
    ctx.clip()
    ctx.drawImage(img, x + pad, y + pad, size, size)
    ctx.restore()
  }

  const scheduleOverlay = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => drawLogoOverlay())
    })
  }

  const scheduleSaveAndOverlay = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        saveCleanSnapshot()
        if (logo) drawLogoOverlay()
      })
    })
  }

  useEffect(() => {
    if (!containerRef.current) return
    const qr = new QRCodeStyling(buildOptions())
    qrRef.current = qr
    containerRef.current.innerHTML = ""
    qr.append(containerRef.current)
    const canvas = containerRef.current.querySelector("canvas") as HTMLCanvasElement | null
    if (canvas) { canvas.style.width = "100%"; canvas.style.height = "auto"; canvas.style.aspectRatio = "1"; canvas.style.borderRadius = "12px"; canvas.style.display = "block" }
    scheduleSaveAndOverlay()
    return () => { if (containerRef.current) containerRef.current.innerHTML = "" }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!qrRef.current) return
    qrRef.current.update(buildOptions())
    const canvas = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null
    if (canvas) { canvas.style.width = "100%"; canvas.style.height = "auto"; canvas.style.aspectRatio = "1"; canvas.style.borderRadius = "12px"; canvas.style.display = "block" }
    scheduleSaveAndOverlay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, fg, bg, bgStyle, bg2, dotType, cornerSquareType, cornerDotType, logo])

  useEffect(() => {
    drawLogoOverlay()
  }, [logo, logoSize, logoPadding, logoOffsetX, logoOffsetY])

  useEffect(() => {
    let cancelled = false
    getCompositedDataUrl(480).then((d) => { if (!cancelled) setPreviewDataUrl(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [url, fg, bg, bgStyle, bg2, dotType, cornerSquareType, cornerDotType, logo, logoSize, logoPadding, logoOffsetX, logoOffsetY, frameText, frameColor])

  useEffect(() => {
    if (!logo) { logoImgRef.current = null; return }
    const img = new Image()
    img.decoding = "sync"
    img.onload = () => { logoImgRef.current = img; scheduleOverlay() }
    img.onerror = () => { logoImgRef.current = null }
    img.src = logo
  }, [logo])

  const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const
  const MAX_BYTES = 2 * 1024 * 1024
  const MIN_DIM = 64
  const MAX_DIM = 2048
  const RECOMMENDED_MIN = 256
  const RECOMMENDED_MAX = 1024

  const toSquarePng = (src: string, imgW: number, imgH: number, targetSize: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = targetSize
        canvas.height = targetSize
        const ctx = canvas.getContext("2d")
        if (!ctx) { reject(new Error("canvas")); return }
        ctx.clearRect(0, 0, targetSize, targetSize)
        const scale = Math.max(targetSize / imgW, targetSize / imgH)
        const w = imgW * scale
        const h = imgH * scale
        const dx = (targetSize - w) / 2
        const dy = (targetSize - h) / 2
        ctx.drawImage(img, dx, dy, w, h)
        resolve(canvas.toDataURL("image/png"))
      }
      img.onerror = () => reject(new Error("load"))
      img.src = src
    })

  const rasterizeSvgToSquare = async (svgText: string, targetSize: number): Promise<string | null> => {
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`
    try { return await toSquarePng(dataUrl, targetSize, targetSize, targetSize) } catch { return null }
  }

  const validateAndSetLogo = async (file: File | null) => {
    setLogoError(null)
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type as typeof ACCEPTED_TYPES[number])) {
      setLogoError(`Unsupported format. Use PNG, JPEG, WebP, SVG.`)
      toast({ variant: "error", title: "Invalid logo format", description: `Accepted: PNG, JPEG, WebP, SVG.` })
      return
    }
    if (file.size > MAX_BYTES) {
      setLogoError(`File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Max 2 MB.`)
      toast({ variant: "error", title: "Logo too large", description: "Max 2 MB." })
      return
    }
    if (file.type === "image/svg+xml") {
      const svgText = await file.text().catch(() => "")
      if (!svgText) { setLogoError("Couldn't read SVG."); return }
      const squared = await rasterizeSvgToSquare(svgText, 512)
      if (squared) { setLogo(squared); setLogoSize(DEFAULT_LOGO_SIZE); setLogoPadding(DEFAULT_LOGO_PADDING); setLogoOffsetX(0); setLogoOffsetY(0); return }
      const reader = new FileReader()
      reader.onload = () => setLogo(reader.result as string)
      reader.readAsDataURL(file)
      return
    }
    const objectUrl = URL.createObjectURL(file)
    const probe = new Image()
    probe.onload = async () => {
      const w = probe.naturalWidth, h = probe.naturalHeight
      URL.revokeObjectURL(objectUrl)
      if (w < MIN_DIM || h < MIN_DIM) {
        setLogoError(`Image too small (${w}×${h}). Minimum ${MIN_DIM}×${MIN_DIM}px.`)
        toast({ variant: "error", title: "Logo too small", description: `Minimum ${MIN_DIM}×${MIN_DIM}px.` })
        return
      }
      if (w > MAX_DIM || h > MAX_DIM) {
        setLogoError(`Image too large (${w}×${h}). Maximum ${MAX_DIM}×${MAX_DIM}px.`)
        toast({ variant: "error", title: "Logo too large", description: `Maximum ${MAX_DIM}×${MAX_DIM}px.` })
        return
      }
      if (w < RECOMMENDED_MIN || h < RECOMMENDED_MIN || w > RECOMMENDED_MAX || h > RECOMMENDED_MAX) {
        toast({ title: "Logo accepted", description: `Recommended ${RECOMMENDED_MIN}–${RECOMMENDED_MAX}px square. Current ${w}×${h} will still work.` })
      }
      try {
        const dataUrl = await new Promise<string>((res, rej) => {
          const r = new FileReader()
          r.onload = () => res(r.result as string)
          r.onerror = () => rej(new Error("read"))
          r.readAsDataURL(file)
        })
        const squared = await toSquarePng(dataUrl, w, h, 512)
        setLogo(squared)
        setLogoSize(DEFAULT_LOGO_SIZE)
        setLogoPadding(DEFAULT_LOGO_PADDING)
        setLogoOffsetX(0)
        setLogoOffsetY(0)
      } catch {
        const reader = new FileReader()
        reader.onload = () => setLogo(reader.result as string)
        reader.readAsDataURL(file)
      }
    }
    probe.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setLogoError("Couldn't read image. Try another file.")
      toast({ variant: "error", title: "Invalid image" })
    }
    probe.src = objectUrl
  }

  const renderQrAtSize = async (size: number): Promise<HTMLCanvasElement | null> => {
    const opts = { ...buildOptions(), width: size, height: size }
    const tmp = document.createElement("div")
    tmp.style.position = "fixed"
    tmp.style.left = "-9999px"
    tmp.style.top = "0"
    document.body.appendChild(tmp)
    const qr = new QRCodeStyling(opts)
    qr.append(tmp)
    await new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())))
    const canvas = tmp.querySelector("canvas") as HTMLCanvasElement | null
    let result: HTMLCanvasElement | null = null
    if (canvas) {
      result = document.createElement("canvas")
      result.width = size
      result.height = size
      result.getContext("2d")?.drawImage(canvas, 0, 0, size, size)
    }
    tmp.remove()
    return result
  }

  const compositeLogoOnto = (base: HTMLCanvasElement, size: number): HTMLCanvasElement => {
    if (!logo || !logoImgRef.current) return base
    const ctx = base.getContext("2d")
    if (!ctx) return base
    const img = logoImgRef.current
    const scale = size / QR_SIZE
    const s = Math.max(16, Math.min(160, logoSize)) * scale
    const pad = Math.max(0, Math.min(24, logoPadding)) * scale
    const total = s + pad * 2
    const cx = size / 2 + logoOffsetX * scale
    const cy = size / 2 + logoOffsetY * scale
    const x = Math.max(0, Math.min(size - total, cx - total / 2))
    const y = Math.max(0, Math.min(size - total, cy - total / 2))
    ctx.save()
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    // @ts-ignore
    if (ctx.roundRect) ctx.roundRect(x, y, total, total, 6 * scale)
    else ctx.rect(x, y, total, total)
    ctx.fill()
    ctx.strokeStyle = "rgba(0,0,0,0.06)"
    ctx.lineWidth = 1 * scale
    ctx.stroke()
    ctx.beginPath()
    // @ts-ignore
    if (ctx.roundRect) ctx.roundRect(x + pad, y + pad, s, s, 4 * scale)
    else ctx.rect(x + pad, y + pad, s, s)
    ctx.clip()
    ctx.drawImage(img, x + pad, y + pad, s, s)
    ctx.restore()
    return base
  }

  const getCompositedDataUrl = async (size = QR_SIZE): Promise<string | null> => {
    if (size === QR_SIZE) {
      const canvas = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null
      if (!canvas) return null
      if (!logo || !logoImgRef.current) return canvas.toDataURL("image/png")
      const clone = document.createElement("canvas")
      clone.width = QR_SIZE
      clone.height = QR_SIZE
      clone.getContext("2d")?.drawImage(canvas, 0, 0, QR_SIZE, QR_SIZE)
      return compositeLogoOnto(clone, QR_SIZE).toDataURL("image/png")
    }
    const canvas = await renderQrAtSize(size)
    if (!canvas) return null
    return compositeLogoOnto(canvas, size).toDataURL("image/png")
  }

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); toast({ title: "Link copied" }); setTimeout(() => setCopied(false), 2000) } catch { toast({ variant: "error", title: "Couldn't copy" }) }
  }
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: restaurant.name, url }) } catch {} } else await copyLink()
  }
  const downloadPng = async (size: number) => {
    const dataUrl = await getCompositedDataUrl(size)
    if (!dataUrl) return
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `menusa-qr-${restaurant.slug}-${size}.png`
    a.click()
  }

  const downloadSvg = async () => {
    const size = HIRES_SIZE
    const tmp = document.createElement("div")
    tmp.style.position = "fixed"
    tmp.style.left = "-9999px"
    document.body.appendChild(tmp)
    const opts = { ...buildOptions(), width: size, height: size }
    const qr = new QRCodeStyling(opts)
    qr.append(tmp)
    await new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())))
    let svgBlob: Blob | null = null
    try {
      const raw = await qr.getRawData("svg")
      if (raw) svgBlob = raw as Blob
    } catch {}
    if (!svgBlob) { tmp.remove(); toast({ variant: "error", title: "Couldn't export SVG" }); return }
    let svgText = await svgBlob.text()
    if (logo && logoImgRef.current) {
      const scale = size / QR_SIZE
      const s = Math.max(16, Math.min(160, logoSize)) * scale
      const pad = Math.max(0, Math.min(24, logoPadding)) * scale
      const total = s + pad * 2
      const cx = size / 2 + logoOffsetX * scale
      const cy = size / 2 + logoOffsetY * scale
      const x = Math.max(0, Math.min(size - total, cx - total / 2))
      const y = Math.max(0, Math.min(size - total, cy - total / 2))
      const logoDataUrl = logo
      const logoSvg = `<g><rect x="${x}" y="${y}" width="${total}" height="${total}" rx="6" fill="white" stroke="rgba(0,0,0,0.06)"/><clipPath id="qr-logo-clip"><rect x="${x + pad}" y="${y + pad}" width="${s}" height="${s}" rx="4"/></clipPath><image href="${logoDataUrl}" x="${x + pad}" y="${y + pad}" width="${s}" height="${s}" clip-path="url(#qr-logo-clip)" preserveAspectRatio="xMidYMid slice"/></g>`
      svgText = svgText.replace("</svg>", `${logoSvg}</svg>`)
      if (!svgText.includes('xmlns:xlink')) svgText = svgText.replace("<svg", '<svg xmlns:xlink="http://www.w3.org/1999/xlink"')
    }
    const blob = new Blob([svgText], { type: "image/svg+xml" })
    const dlUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = dlUrl
    a.download = `menusa-qr-${restaurant.slug}.svg`
    a.click()
    URL.revokeObjectURL(dlUrl)
    tmp.remove()
  }

  const printQr = async () => {
    const qrDataUrl = await getCompositedDataUrl(1024)
    if (!qrDataUrl) return
    const w = window.open("", "_blank")
    if (!w) return
    const helpText = printShowHelp ? "No app needed · Scan with camera" : ""
    const urlText = printShowUrl ? url : ""
    const addressText = printShowAddress ? (restaurant.address ?? "") : ""
    const frameHtml = frameText ? `<div class="frame-pill" style="background:${frameColor}">${frameText}</div>` : ""
    const isMulti = printPaper === "a4-2up" || printPaper === "a4-4up"
    const count = printPaper === "a4-2up" ? 2 : printPaper === "a4-4up" ? 4 : 1
    const pageSize = printPaper === "a5-single" ? "A5" : "A4"
    const card = `
      <div class="card">
        <div class="kicker">Scan to view menu</div>
        <h1>${restaurant.name}</h1>
        ${addressText ? `<div class="sub">${addressText}</div>` : ""}
        <img src="${qrDataUrl}" alt="QR for ${restaurant.name}" />
        ${frameHtml}
        ${helpText ? `<div class="help">${helpText}</div>` : ""}
        ${urlText ? `<div class="url">${urlText}</div>` : ""}
        <div class="foot">Made with Menusa · menusa.id</div>
      </div>`
    const body = isMulti
      ? `<div class="multi-grid ${printPaper === "a4-4up" ? "grid-4" : "grid-2"}">${Array.from({ length: count }).map(() => card).join("")}</div>`
      : card
    w.document.write(`<!doctype html><html><head><title>QR — ${restaurant.name}</title><style>
      @page{size:${pageSize};margin:10mm}
      *{box-sizing:border-box;margin:0}
      body{font-family:system-ui,sans-serif;color:#242622;background:#fff;display:grid;place-items:center;min-height:100vh;padding:16px}
      .card{border:1.5px solid #242622;border-radius:20px;padding:32px 28px;max-width:520px;width:100%;text-align:center;background:#fff}
      .kicker{font:11px monospace;letter-spacing:.08em;text-transform:uppercase;color:#85877d}
      h1{font-size:28px;letter-spacing:-.04em;margin:8px 0 4px}
      .sub{color:#6c6f66;font-size:13px;margin-bottom:16px}
      img{width:100%;max-width:340px;aspect-ratio:1;border-radius:16px;border:1px solid #e8e8e0;display:block;margin:0 auto}
      .frame-pill{margin-top:14px;background:${frameColor};color:#fff;font:700 12px/1 monospace;letter-spacing:.14em;text-transform:uppercase;padding:9px 14px;border-radius:999px;display:inline-block}
      .help{margin-top:12px;font-size:11px;color:#6c6f66}
      .url{margin-top:12px;font:11px monospace;color:#555;background:#f3f2ed;border-radius:8px;padding:8px 10px;word-break:break-all}
      .foot{margin-top:16px;font-size:11px;color:#999}
      .multi-grid{display:grid;gap:16px;width:100%;max-width:720px}
      .multi-grid.grid-2{grid-template-columns:1fr 1fr}
      .multi-grid.grid-4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
      .multi-grid .card{max-width:none}
      @media print{ body{padding:0;place-items:start center} .no-print{display:none} .card{break-inside:avoid} }
    </style></head><body>
      ${body}
      <button class="no-print" onclick="window.print()" style="margin-top:20px;padding:10px 18px;border-radius:999px;border:1px solid #242622;background:#242622;color:#fff;cursor:pointer">Print</button>
    </body></html>`)
    w.document.close()
  }

  return (
    <div className="w-full">
      <p className="section-kicker">Share</p>
      <h1 className="mt-2 text-[28px] font-bold tracking-[-0.04em]">QR code</h1>
      <p className="mt-2 max-w-[520px] text-sm leading-6 text-[#6c6f66]">Customize your QR — then share or print it for tables and storefronts.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[#e8e8e0] bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold">Print preview</div>
            <p className="mt-1 text-xs text-[#6c6f66]">Live — matches what prints.</p>
            {previewDataUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-[#e8e8e0] bg-[#f0efeb] p-3">
                <div className="mx-auto bg-white p-2 shadow-sm">
                  <PrintPreview
                    dataUrl={previewDataUrl}
                    restaurant={restaurant}
                    frameText={frameText}
                    frameColor={frameColor}
                    paper={printPaper}
                    showHelp={printShowHelp}
                    showUrl={printShowUrl}
                    showAddress={printShowAddress}
                    url={url}
                  />
                </div>
                <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-[#999]">{printPaper === "a5-single" ? "A5" : printPaper === "a4-2up" ? "A4 · 2-up" : printPaper === "a4-4up" ? "A4 · 4-up" : "A4"} · Minimal</div>
              </div>
            ) : (
              <div className="mt-3 grid place-items-center rounded-xl border border-dashed border-[#d7d7cf] bg-[#f9f9f7] p-8 text-xs text-[#85877d]">Generating preview…</div>
            )}
          </div>
          <div className="rounded-2xl border border-[#e8e8e0] bg-white p-5">
            <div className="text-sm font-semibold">Menu link</div>
            <div className="mt-3 flex items-center gap-2 rounded-full border border-[#e8e8e0] bg-[#f3f2ed] px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{url}</span>
              <Button variant="subtle" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={copyLink} aria-label="Copy link">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}>{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}</Button>
              <Button variant="outline" size="sm" onClick={() => window.open(url, "_blank")}><ExternalLink size={14} /> Open</Button>
              <Button variant="outline" size="sm" onClick={share}><Share2 size={14} /> Share</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" onClick={printQr}><Printer size={14} /> Print</Button>
            <div className="inline-flex overflow-hidden rounded-full border border-[#d2d2c9]">
              <Button variant="outline" size="sm" className="rounded-none border-0 rounded-l-full" onClick={() => downloadPng(DOWNLOAD_SIZE)}><Download size={14} /> Download QR Image</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="grid place-items-center rounded-r-full border-l border-[#d2d2c9] bg-white px-2.5 hover:bg-[#f3f2ed]" aria-label="More download options">
                    <ChevronDown size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onSelect={() => downloadPng(HIRES_SIZE)}><ImageIcon size={14} /> Download for Print (Hi-Res · {HIRES_SIZE}px)</DropdownMenuItem>
                  <DropdownMenuItem onSelect={downloadSvg}><Download size={14} /> Download SVG (Vector · Best for print)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="hidden" aria-hidden="true">
            <div ref={containerRef} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[#e8e8e0] bg-white p-5">
            <div className="text-sm font-semibold">Colors</div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-[#6c6f66]">Foreground</span>
                <div className="flex items-center gap-2">
                  <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="h-9 w-9 cursor-pointer rounded-md border border-[#e8e8e0] p-1" />
                  <Input value={fg} onChange={(e) => setFg(e.target.value)} className="h-9 font-mono text-xs" />
                </div>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-[#6c6f66]">Background</span>
                <div className="flex items-center gap-2">
                  <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-9 w-9 cursor-pointer rounded-md border border-[#e8e8e0] p-1" />
                  <Input value={bg} onChange={(e) => setBg(e.target.value)} className="h-9 font-mono text-xs" />
                </div>
              </label>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-[#6c6f66]">Dots fill</span>
              <Select value={bgStyle} onChange={(e) => setBgStyle(e.target.value as BgStyle)} className="h-8 w-auto text-xs">
                <option value="solid">Solid</option>
                <option value="gradient">Gradient</option>
              </Select>
              {bgStyle === "gradient" && (
                <div className="flex items-center gap-2">
                  <input type="color" value={bg2} onChange={(e) => setBg2(e.target.value)} className="h-8 w-8 cursor-pointer rounded-md border border-[#e8e8e0] p-1" />
                  <Input value={bg2} onChange={(e) => setBg2(e.target.value)} className="h-8 w-28 font-mono text-xs" />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e8e8e0] bg-white p-5">
            <div className="text-sm font-semibold">Style</div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-[#6c6f66]">Dots</span>
                <Select value={dotType} onChange={(e) => setDotType(e.target.value as DotType)} className="h-9 text-xs">
                  {DOT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-[#6c6f66]">Corners</span>
                <Select value={cornerSquareType} onChange={(e) => setCornerSquareType(e.target.value as CornerSquareType)} className="h-9 text-xs">
                  {CORNER_SQUARE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-[#6c6f66]">Corner dots</span>
                <Select value={cornerDotType} onChange={(e) => setCornerDotType(e.target.value as CornerDotType)} className="h-9 text-xs">
                  {CORNER_DOT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e8e8e0] bg-white p-5">
            <div className="text-sm font-semibold">Logo</div>
            <p className="mt-1 text-xs text-[#6c6f66]">Center image — squared 1:1, default {DEFAULT_LOGO_SIZE}×{DEFAULT_LOGO_SIZE}px.</p>
            <p className="mt-1 text-[11px] leading-4 text-[#85877d]">PNG / JPEG / WebP / SVG · max 2 MB · {MIN_DIM}–{MAX_DIM}px · recommended {RECOMMENDED_MIN}–{RECOMMENDED_MAX}px square.</p>
            {logoError && <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">{logoError}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#e8e8e0] bg-[#f3f2ed] px-3 py-2 text-xs font-medium">
                <Upload size={14} /> Upload logo
                <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" className="hidden" onChange={(e) => { validateAndSetLogo(e.target.files?.[0] ?? null); e.currentTarget.value = "" }} />
              </label>
              {logo && <Button variant="subtle" size="sm" onClick={() => { setLogo(null); setLogoError(null) }}><X size={14} /> Remove</Button>}
              <span className="text-xs text-[#85877d]">{logo ? "Logo applied" : "No logo"}</span>
            </div>
            {logo && (
              <div className="mt-4 grid gap-3">
                <label className="flex items-center gap-2">
                  <span className="w-20 text-xs text-[#6c6f66]">Size</span>
                  <input type="range" min={16} max={120} value={logoSize} onChange={(e) => setLogoSize(Number(e.target.value))} className="flex-1" />
                  <span className="w-16 text-right font-mono text-xs">{logoSize}px</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-20 text-xs text-[#6c6f66]">Padding</span>
                  <input type="range" min={0} max={16} value={logoPadding} onChange={(e) => setLogoPadding(Number(e.target.value))} className="flex-1" />
                  <span className="w-16 text-right font-mono text-xs">{logoPadding}px</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-20 text-xs text-[#6c6f66]">Offset X</span>
                  <input type="range" min={-120} max={120} value={logoOffsetX} onChange={(e) => setLogoOffsetX(Number(e.target.value))} className="flex-1" />
                  <span className="w-16 text-right font-mono text-xs">{logoOffsetX}px</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-20 text-xs text-[#6c6f66]">Offset Y</span>
                  <input type="range" min={-120} max={120} value={logoOffsetY} onChange={(e) => setLogoOffsetY(Number(e.target.value))} className="flex-1" />
                  <span className="w-16 text-right font-mono text-xs">{logoOffsetY}px</span>
                </label>
                <div className="flex gap-2">
                  <Button variant="subtle" size="sm" onClick={() => { setLogoOffsetX(0); setLogoOffsetY(0) }}>Center</Button>
                  <Button variant="subtle" size="sm" onClick={() => { setLogoSize(DEFAULT_LOGO_SIZE); setLogoPadding(DEFAULT_LOGO_PADDING) }}>Reset size</Button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#e8e8e0] bg-white p-5">
            <div className="text-sm font-semibold">Frame & call to action</div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-[#6c6f66]">Frame</span>
                <Select value={frame} onChange={(e) => setFrame(e.target.value)} className="h-9 text-xs">
                  {FRAME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-[#6c6f66]">Color</span>
                <div className="flex items-center gap-2">
                  <input type="color" value={frameColor} onChange={(e) => setFrameColor(e.target.value)} className="h-9 w-9 cursor-pointer rounded-md border border-[#e8e8e0] p-1" />
                  <Input value={frameColor} onChange={(e) => setFrameColor(e.target.value)} className="h-9 w-28 font-mono text-xs" />
                </div>
              </label>
            </div>
            {frame === "custom" && (
              <div className="mt-3">
                <Input placeholder="e.g. SCAN FOR MENU" value={customFrameText} onChange={(e) => setCustomFrameText(e.target.value)} maxLength={24} className="h-9 text-xs" />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#e8e8e0] bg-white p-5">
            <div className="text-sm font-semibold">Print</div>
            <p className="mt-1 text-xs text-[#6c6f66]">Paper for the preview on the left.</p>
            <div className="mt-3">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-[#6c6f66]">Paper</span>
                <Select value={printPaper} onChange={(e) => setPrintPaper(e.target.value as PrintPaper)} className="h-9 text-xs">
                  <option value="a4-single">A4 — single</option>
                  <option value="a5-single">A5 — single</option>
                  <option value="a4-2up">A4 — 2 per page</option>
                  <option value="a4-4up">A4 — 4 per page (stickers)</option>
                </Select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={printShowHelp} onChange={(e) => setPrintShowHelp(e.target.checked)} /> Help text</label>
              <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={printShowUrl} onChange={(e) => setPrintShowUrl(e.target.checked)} /> URL</label>
              <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={printShowAddress} onChange={(e) => setPrintShowAddress(e.target.checked)} /> Address</label>
            </div>
            <p className="mt-2 text-[11px] text-[#85877d]">Branding synced from QR colors · Tent uses A4 landscape · 2/4-up adds cut guides.</p>
          </div>

          <div className="rounded-2xl border border-dashed border-[#d7d7cf] bg-[#f3f2ed] p-4 text-xs leading-5 text-[#6c6f66]">
            Tip: high contrast (dark dots on light background) scans best. Test with your phone after styling.
          </div>
        </div>
      </div>
    </div>
  )
}

function PrintPreview({ dataUrl, restaurant, frameText, frameColor, paper, showHelp, showUrl, showAddress, url }: {
  dataUrl: string; restaurant: AdminRestaurant; frameText: string; frameColor: string
  paper: PrintPaper; showHelp: boolean; showUrl: boolean; showAddress: boolean; url: string
}) {
  const helpText = showHelp ? "No app needed · Scan with camera" : ""
  const urlText = showUrl ? url : ""
  const addressText = showAddress ? (restaurant.address ?? "") : ""
  const framePill = frameText ? <span className="rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-white" style={{ background: frameColor }}>{frameText}</span> : null
  const card = (
    <div className="rounded-2xl border border-[#242622] bg-white px-4 py-5 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#85877d]">Scan to view menu</div>
      <div className="mt-1 text-lg font-bold tracking-tight">{restaurant.name}</div>
      {addressText && <div className="mt-1 text-xs text-[#6c6f66]">{addressText}</div>}
      <img src={dataUrl} alt="QR" className="mx-auto mt-3 w-full max-w-[220px] rounded-xl border border-[#e8e8e0]" />
      {framePill && <div className="mt-3">{framePill}</div>}
      {helpText && <div className="mt-2 text-[11px] text-[#6c6f66]">{helpText}</div>}
      {urlText && <div className="mt-2 break-all rounded-md bg-[#f3f2ed] px-2 py-1.5 font-mono text-[10px] text-[#555]">{urlText}</div>}
      <div className="mt-2 text-[10px] text-[#999]">Made with Menusa · menusa.id</div>
    </div>
  )
  if (paper === "a4-2up") return <div className="grid grid-cols-2 gap-3">{card}{card}</div>
  if (paper === "a4-4up") return <div className="grid grid-cols-2 gap-3">{card}{card}{card}{card}</div>
  return card
}
