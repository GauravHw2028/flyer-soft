"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutTemplate,
  Package,
  Files,
  Store,
  Plus,
  ArrowUpRight,
  Download,
  Check,
  Leaf,
  Search,
  Upload,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Undo2,
  Redo2,
  Loader2,
  ImagePlus,
  FolderOpen,
  Save,
  AlertCircle,
  X,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  templates,
  sampleProducts,
  defaultBrand,
  newCampaign,
  Product,
  Campaign,
  Brand,
  Template,
  Offer,
} from "./model";
import { useWorkspace } from "./use-workspace";
import { flyerSvg, exportFlyer, campaignIssues, downloadBlob } from "./flyer";
import {
  useBusiness,
  CreditPanel,
  AdminPanel,
  SlotEditor,
  LocationFields,
  EnhanceButton,
} from "./business-ui";
import { wearMartTemplates, wearMartBrand } from "./wear-mart";
import { pageCount, slotNumber } from "./flyer-layout";
import { productSchema } from "./validation";

const uid = () => crypto.randomUUID();
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Choice({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (s: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="select-control">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Thumb({ product }: { product: Product }) {
  return product.image ? (
    <img
      className="product-placeholder"
      src={product.image}
      alt={product.name}
    />
  ) : (
    <div className="product-placeholder">
      <Package size={22} />
    </div>
  );
}
async function upload(file: File) {
  const form = new FormData();
  form.append("file", file);
  const r = await fetch("/api/assets", { method: "POST", body: form });
  const v = (await r.json()) as { url: string; error?: string };
  if (!r.ok) throw new Error(v.error || "Image upload failed");
  return v.url as string;
}
function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("Unclosed quotation mark in CSV.");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.length < 2)
    throw new Error("Add a header and at least one product.");
  const headers = rows.shift()!.map((x) =>
    x
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase(),
  );
  if (!headers.includes("name") || !headers.includes("price"))
    throw new Error("CSV needs name and price columns.");
  return rows.map((r, i) => {
    const get = (key: string) => r[headers.indexOf(key)]?.trim() || "";
    const rawPrice = get("price");
    if (!rawPrice) throw new Error(`Row ${i + 2}: price is missing.`);
    const result = productSchema.safeParse({
      id: uid(),
      name: get("name"),
      pack: get("pack"),
      category: get("category") || "Other",
      price: Number(rawPrice),
      image: "",
      sku: get("sku"),
    });
    if (!result.success)
      throw new Error(`Row ${i + 2}: ${result.error.issues[0].message}`);
    return result.data;
  });
}

export default function Studio() {
  const w = useWorkspace();
  const { data, update } = w;
  const business = useBusiness();
  const [slot, setSlot] = useState<number | null>(null);
  const [view, setView] = useState("Campaign studio"),
    [selected, setSelected] = useState(""),
    [tab, setTab] = useState("products"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All"),
    [page, setPage] = useState(0);
  const [modal, setModal] = useState<
      "product" | "picker" | "export" | "template" | "csv" | null
    >(null),
    [product, setProduct] = useState<Product | null>(null),
    [csvRows, setCsvRows] = useState<Product[]>([]),
    [busy, setBusy] = useState(false),
    [exporting, setExporting] = useState(false),
    [download, setDownload] = useState<{ url: string; name: string } | null>(
      null,
    ),
    [exportError, setExportError] = useState(""),
    [confirm, setConfirm] = useState<{
      kind: "product" | "campaign";
      id: string;
    } | null>(null);
  const [undo, setUndo] = useState<Campaign[]>([]),
    [redo, setRedo] = useState<Campaign[]>([]),
    [newTemplate, setNewTemplate] = useState<Template>({
      ...templates[0],
      id: "",
      name: "My market template",
      style: "custom",
    });
  const demo = useMemo(
    () => ({ ...newCampaign(defaultBrand, sampleProducts, true), id: "demo" }),
    [],
  );
  const current =
    data.campaigns.find((c) => c.id === selected) || data.campaigns[0] || demo;
  const isDemo = current.id === "demo";
  const allTemplates = [
    ...templates.filter((t) => t.artwork),
    ...templates.filter((t) => !t.artwork),
    ...data.customTemplates,
    ...(business.info?.business?.templates || []),
    ...(business.info?.isAdmin
      ? wearMartTemplates.filter(
          (t) => !business.info?.business?.templates.some((a) => a.id === t.id),
        )
      : []),
  ];
  const template =
    current.templateSnapshot ||
    allTemplates.find((t) => t.id === current.template) ||
    templates[0];
  const pages = pageCount(current, template);
  const actualPage = Math.min(page, pages - 1);
  const bulkInput = useRef<HTMLInputElement>(null),
    csvInput = useRef<HTMLInputElement>(null);
  const campaignRef = useRef(current);
  campaignRef.current = current;
  const [brandDraft, setBrandDraft] = useState<Brand | null>(null);
  const brand = brandDraft || data.brand;
  const canEdit = w.loaded && !busy;
  const issues = campaignIssues(current);
  useEffect(() => {
    setPage(0);
  }, [selected, current.template]);
  useEffect(() => {
    setDownload(null);
    setExportError("");
  }, [current.updated, actualPage]);
  function navigate(v: string) {
    setView(v);
    setSearch("");
    setFilter("All");
  }
  function openCampaign(c: Campaign) {
    setSelected(c.id);
    setView("Campaign studio");
    setUndo([]);
    setRedo([]);
    setPage(0);
  }
  function startCampaign(withSample = false) {
    if (!w.loaded) return;
    const c = newCampaign(
      data.brand,
      withSample ? sampleProducts : [],
      withSample,
    );
    update((d) => ({
      ...d,
      campaigns: [c, ...d.campaigns],
      products: withSample
        ? [
            ...d.products,
            ...sampleProducts.filter(
              (p) => !d.products.some((x) => x.id === p.id),
            ),
          ]
        : d.products,
    }));
    openCampaign(c);
    toast.success(
      withSample
        ? "Sample campaign added. Change anything to make it yours."
        : "New campaign created",
    );
  }
  function edit(change: Partial<Campaign>, history = true) {
    if (!w.loaded) return;
    const old = current;
    if (history) {
      setUndo((a) => [...a.slice(-29), structuredClone(old)]);
      setRedo([]);
    }
    const id = isDemo ? uid() : old.id;
    update((d) => {
      const latest = d.campaigns.find((c) => c.id === old.id) || old;
      const next = {
        ...latest,
        ...change,
        id,
        updated: new Date().toISOString(),
        status: change.status || ("draft" as const),
        templateSnapshot: change.template
          ? {
              ...(allTemplates.find((t) => t.id === change.template) ||
                templates[0]),
            }
          : change.templateSnapshot ||
            latest.templateSnapshot || { ...template },
      };
      return {
        ...d,
        campaigns: isDemo
          ? [next, ...d.campaigns]
          : d.campaigns.map((c) => (c.id === old.id ? next : c)),
        products: isDemo
          ? [
              ...d.products,
              ...sampleProducts.filter(
                (p) => !d.products.some((x) => x.id === p.id),
              ),
            ]
          : d.products,
      };
    });
    if (isDemo) setSelected(id);
  }

  function changeItem(index: number, change: Partial<Offer>) {
    edit({
      items: current.items.map((p, i) =>
        i === index ? { ...p, ...change } : p,
      ),
    });
  }
  function reorder(index: number, delta: number) {
    const items = current.items.map((p, i) => ({
      ...p,
      slot: slotNumber(current, i),
    }));
    const a = items[index].slot;
    items[index].slot = items[index + delta].slot;
    items[index + delta].slot = a;
    [items[index], items[index + delta]] = [items[index + delta], items[index]];
    edit({ items });
  }
  function history(back: boolean) {
    const source = back ? undo : redo;
    if (!source.length) return;
    const previous = source[source.length - 1];
    if (back) {
      setUndo(source.slice(0, -1));
      setRedo((a) => [...a, current]);
    } else {
      setRedo(source.slice(0, -1));
      setUndo((a) => [...a, current]);
    }
    edit({ ...previous, id: current.id }, false);
  }
  function duplicate(c: Campaign) {
    const next = {
      ...structuredClone(c),
      id: uid(),
      name: (c.name + " · copy").slice(0, 80),
      status: "draft" as const,
      updated: new Date().toISOString(),
    };
    update((d) => ({ ...d, campaigns: [next, ...d.campaigns] }));
    openCampaign(next);
    toast.success("Campaign copied. Update the dates for your next offer.");
  }
  function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    const valid = productSchema.safeParse(product);
    if (!valid.success) {
      toast.error(valid.error.issues[0].message);
      return;
    }
    update((d) => ({
      ...d,
      products: d.products.some((p) => p.id === product.id)
        ? d.products.map((p) => (p.id === product.id ? product : p))
        : [product, ...d.products],
    }));
    setModal(null);
    toast.success("Product saved to your library");
  }
  function addProduct() {
    setProduct({
      id: uid(),
      name: "",
      pack: "",
      price: 0,
      category: "Other",
      image: "",
      sku: "",
    });
    setModal("product");
  }
  async function uploadProduct(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    let count = 0;
    try {
      for (const file of Array.from(files)) {
        const image = await upload(file);
        const p: Product = {
          id: uid(),
          name: file.name
            .replace(/\.[^.]+$/, "")
            .replace(/[_-]/g, " ")
            .slice(0, 100),
          pack: "",
          price: 0,
          category: "Other",
          image,
          sku: "",
        };
        update((d) => ({ ...d, products: [p, ...d.products] }));
        count++;
      }
      toast.success(
        `${count} products uploaded. Add pack sizes and prices in the library.`,
      );
    } catch (e) {
      toast.error(`${count} uploaded. ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (bulkInput.current) bulkInput.current.value = "";
    }
  }
  async function readCsv(file?: File) {
    if (!file) return;
    try {
      const rows = parseCsv(await file.text());
      if (data.products.length + rows.length > 1500)
        throw new Error("Maximum 1,500 products per workspace.");
      setCsvRows(rows);
      setModal("csv");
    } catch (e) {
      toast.error((e as Error).message);
    }
    if (csvInput.current) csvInput.current.value = "";
  }
  async function doExport(format: "png" | "pdf" | "svg") {
    setExporting(true);
    setDownload(null);
    setExportError("");
    try {
      const file = await exportFlyer(current, template, format, actualPage);
      const form = new FormData();
      form.append(
        "file",
        new File([file.blob], file.name, { type: file.blob.type }),
      );
      const r = await fetch("/api/exports", { method: "POST", body: form });
      if (!r.ok) {
        const error = r.headers
          .get("content-type")
          ?.includes("application/json")
          ? ((await r.json()) as { error?: string }).error
          : undefined;
        throw new Error(
          error ||
            (r.status === 413
              ? "This export is too large. Export a single page instead."
              : "Could not save export. Please try again."),
        );
      }
      const result = (await r.json()) as { url: string };
      setDownload({ url: result.url, name: file.name });
      toast.success("Your flyer is ready to download");
    } catch (e) {
      setExportError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  }
  function showcase() {
    const c = newCampaign(wearMartBrand, sampleProducts, true);
    c.name = "Wear Mart · Client showcase";
    c.headline = "Items available in all 3 branches";
    c.template = wearMartTemplates[0].id;
    c.templateSnapshot = { ...wearMartTemplates[0] };
    update((d) => ({
      ...d,
      campaigns: [c, ...d.campaigns],
      products: [
        ...d.products,
        ...sampleProducts.filter((p) => !d.products.some((x) => x.id === p.id)),
      ],
    }));
    openCampaign(c);
    setTab("design");
    toast.success(
      "Showcase loaded with sample products. Add actual products and branch locations before sharing.",
    );
  }
  function chooseSlot(target: EventTarget | null) {
    const el = target instanceof Element ? target.closest("[data-slot]") : null;
    if (el && canEdit) setSlot(Number(el.getAttribute("data-slot")));
  }
  function nextSlot() {
    const used = new Set(current.items.map((_, i) => slotNumber(current, i)));
    for (let i = 0; i < 120; i++) if (!used.has(i)) return i;
    return 119;
  }
  function backup() {
    downloadBlob(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      "flyerly-workspace-backup.json",
    );
  }
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "read_current_flyer",
          description:
            "Read current flyer products, dates and prices without modifying them.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute: (input: unknown) => {
            if (
              !input ||
              typeof input !== "object" ||
              Object.keys(input).length
            )
              throw new Error("Expected an empty object");
            return structuredClone(campaignRef.current);
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  const shownProducts = data.products.filter(
    (p) =>
      (filter === "All" || p.category === filter) &&
      [p.name, p.sku, p.category]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const title =
    view === "AI credits"
      ? "Better product photos. On demand."
      : view === "Business admin"
        ? "A home for every business."
        : view === "Product library"
          ? "Your products. Always on hand."
          : view === "Templates"
            ? "A fresh look for every offer."
            : view === "Store branding"
              ? "Make every flyer feel like you."
              : view === "Saved campaigns"
                ? "Your weeks, neatly saved."
                : "Your next great offer starts here.";
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "218px" } as React.CSSProperties}
    >
      <Toaster position="bottom-right" />
      <Sidebar className="app-sidebar">
        <SidebarHeader>
          <div className="wordmark">
            <span>
              <Leaf size={23} />
            </span>
            flyerly<span className="brand-dot">.</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="workspace-label">YOUR WORKSPACE</div>
          <SidebarMenu>
            {[
              { Icon: Files, label: "Campaign studio" },
              { Icon: FolderOpen, label: "Saved campaigns" },
              { Icon: Package, label: "Product library" },
              { Icon: LayoutTemplate, label: "Templates" },
              { Icon: Store, label: "Store branding" },
              { Icon: ImagePlus, label: "AI credits" },
              ...(business.info?.isAdmin
                ? [{ Icon: Store, label: "Business admin" }]
                : []),
            ].map(({ Icon, label }) => (
              <SidebarMenuItem key={label}>
                <SidebarMenuButton
                  isActive={view === label}
                  onClick={() => navigate(label)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="sidebar-tip">
            <div>
              <Leaf size={18} />
              <b>A head start, every week.</b>
            </div>
            <p>Duplicate a campaign, update your offers, and you’re ready.</p>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="store-profile">
            <span>{data.brand.name.slice(0, 2)}</span>
            <div>
              <b>{data.brand.name}</b>
              <small>Private store workspace</small>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="app-main">
        <header className="topbar">
          <div>
            <SidebarTrigger />
            <span>Workspace</span>
            <span className="slash">/</span>
            <b>{view}</b>
          </div>
          <div className="save-status">
            {w.saving ? (
              <>
                <Loader2 size={14} className="spin" />
                Saving…
              </>
            ) : w.error ? (
              <>
                <AlertCircle size={15} />
                Not saved
              </>
            ) : w.loaded ? (
              <>
                <Check size={15} />
                {w.unsaved ? "Unsaved changes" : "All changes saved"}
              </>
            ) : (
              "Opening workspace…"
            )}
            <span className="avatar">{data.brand.name[0]}</span>
          </div>
        </header>
        {w.auth && (
          <div className="notice">
            <span>Sign in to save your products, images and campaigns.</span>
            <a
              className="button primary"
              href="/signin-with-chatgpt?return_to=/"
              target="_top"
            >
              Sign in with ChatGPT
            </a>
          </div>
        )}
        {business.error && w.loaded && (
          <div className="notice error">
            <span>Business settings could not be loaded.</span>
            <button className="button" onClick={() => business.refresh()}>
              Retry
            </button>
          </div>
        )}
        {w.error && (
          <div className="notice error" role="alert">
            <span>{w.error}</span>
            <button
              className="button"
              onClick={() => (w.loaded ? w.save() : w.reload())}
            >
              Retry
            </button>
            {w.loaded && (
              <button className="button" onClick={backup}>
                Download backup
              </button>
            )}
          </div>
        )}
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              {view === "Campaign studio"
                ? "MAKE THIS WEEK A GOOD ONE"
                : "YOUR STORE, IN GOOD COMPANY"}
            </div>
            <h1>{title}</h1>
            <p>
              {view === "Product library"
                ? `${data.products.length} reusable products · Upload once. Use every week.`
                : view === "Templates"
                  ? "Pick a layout. Your products and prices come with you."
                  : view === "Saved campaigns"
                    ? "Reopen a past campaign or give it a new week."
                    : view === "Store branding"
                      ? "Saved branding is applied to new campaigns."
                      : "A little less designing. A lot more selling."}
            </p>
          </div>
          <button
            className="button primary"
            disabled={!canEdit}
            onClick={() => startCampaign()}
          >
            <Plus size={18} />
            New campaign
          </button>
        </div>
        {view === "Campaign studio" && (
          <>
            <div className="studio-shell">
              <div className="studio-top">
                <div>
                  <span className="draft-chip">
                    {isDemo ? "SAMPLE" : current.status.toUpperCase()}
                  </span>
                  <h2>{current.name}</h2>
                </div>
                <div className="toolbar">
                  <button
                    className="icon-button"
                    title="Undo"
                    aria-label="Undo"
                    disabled={!undo.length}
                    onClick={() => history(true)}
                  >
                    <Undo2 size={16} />
                  </button>
                  <button
                    className="icon-button"
                    title="Redo"
                    aria-label="Redo"
                    disabled={!redo.length}
                    onClick={() => history(false)}
                  >
                    <Redo2 size={16} />
                  </button>
                  <button className="button" onClick={() => setModal("export")}>
                    <Download size={16} />
                    Export flyer
                  </button>
                </div>
              </div>
              <div className="studio-grid">
                <section className="control-panel">
                  <Tabs value={tab} onValueChange={setTab}>
                    <TabsList>
                      <TabsTrigger value="products">Products</TabsTrigger>
                      <TabsTrigger value="design">Design</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                    </TabsList>
                    <TabsContent value="products">
                      <div className="panel-heading">
                        <div>
                          <h3>This week’s picks</h3>
                          <p>{current.items.length} products in your flyer</p>
                        </div>
                        <button
                          className="icon-button"
                          aria-label="Add products to flyer"
                          disabled={!canEdit}
                          onClick={() => {
                            setSearch("");
                            setModal("picker");
                          }}
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      {(isDemo || current.name.includes("Client showcase")) && (
                        <div className="sample-notice">
                          Sample products and prices. Edit to make this campaign
                          yours.
                        </div>
                      )}
                      {current.items.length === 0 && (
                        <div className="empty compact">
                          <Package />
                          <h3>Your offers go here</h3>
                          <p>
                            Add products from your library to start your flyer.
                          </p>
                          <button
                            className="button primary"
                            disabled={!canEdit}
                            onClick={() => setModal("picker")}
                          >
                            Choose products
                          </button>
                        </div>
                      )}
                      <div className="offer-list">
                        {current.items.map((p, i) => (
                          <div className="offer-editor" key={i}>
                            <div className="offer-row">
                              <Thumb product={p} />
                              <div>
                                <b>{p.name}</b>
                                <small>{p.pack || "No pack size"}</small>
                              </div>
                              <button
                                className="bare"
                                aria-label={`Remove ${p.name}`}
                                disabled={!canEdit}
                                onClick={() =>
                                  edit({
                                    items: current.items
                                      .map((p, n) => ({
                                        ...p,
                                        slot: slotNumber(current, n),
                                      }))
                                      .filter((_, n) => n !== i),
                                  })
                                }
                              >
                                <X size={15} />
                              </button>
                            </div>
                            <div className="price-row">
                              <Field label="Regular">
                                <input
                                  aria-label={`Regular price for ${p.name}`}
                                  type="number"
                                  min="0"
                                  max="999999"
                                  step="0.01"
                                  value={p.price}
                                  disabled={!canEdit}
                                  onChange={(e) =>
                                    changeItem(i, {
                                      price: Number(e.target.value),
                                    })
                                  }
                                />
                              </Field>
                              <Field
                                label={`Offer · ${current.brand.currency}`}
                              >
                                <input
                                  className="offer-input"
                                  aria-label={`Offer price for ${p.name}`}
                                  type="number"
                                  min="0"
                                  max="999999"
                                  step="0.01"
                                  value={p.offer}
                                  disabled={!canEdit}
                                  onChange={(e) =>
                                    changeItem(i, {
                                      offer: Number(e.target.value),
                                    })
                                  }
                                />
                              </Field>
                              <div className="reorder">
                                <button
                                  className="bare"
                                  aria-label={`Move ${p.name} up`}
                                  disabled={i === 0 || !canEdit}
                                  onClick={() => reorder(i, -1)}
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  className="bare"
                                  aria-label={`Move ${p.name} down`}
                                  disabled={
                                    i === current.items.length - 1 || !canEdit
                                  }
                                  onClick={() => reorder(i, 1)}
                                >
                                  <ArrowDown size={14} />
                                </button>
                              </div>
                            </div>
                            <label className="check-label">
                              <input
                                type="checkbox"
                                checked={p.showOldPrice ?? p.price > p.offer}
                                onChange={(e) =>
                                  changeItem(i, {
                                    showOldPrice: e.target.checked,
                                  })
                                }
                              />
                              Show old price
                            </label>
                            <input
                              className="badge-input"
                              placeholder="Offer label, e.g. Best value"
                              aria-label={`Badge for ${p.name}`}
                              maxLength={30}
                              value={p.badge}
                              disabled={!canEdit}
                              onChange={(e) =>
                                changeItem(i, { badge: e.target.value })
                              }
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        className="button add-more"
                        disabled={!canEdit}
                        onClick={() => {
                          setSearch("");
                          setModal("picker");
                        }}
                      >
                        <Plus size={15} />
                        Add products
                      </button>
                    </TabsContent>
                    <TabsContent value="design">
                      <div className="panel-heading">
                        <div>
                          <h3>Find your look</h3>
                          <p>Switch styles without starting over</p>
                        </div>
                      </div>
                      <div className="template-picker">
                        {allTemplates.map((t) => (
                          <button
                            key={t.id}
                            className={
                              "template-choice " +
                              (current.template === t.id ? "chosen" : "")
                            }
                            disabled={!canEdit}
                            onClick={() => edit({ template: t.id })}
                          >
                            {t.artwork || t.style.startsWith("wear-") ? (
                              <div
                                className="template-swatch artwork-swatch"
                                aria-hidden="true"
                                dangerouslySetInnerHTML={{
                                  __html: flyerSvg(
                                    t.style.startsWith("wear-")
                                      ? {
                                          ...demo,
                                          brand: wearMartBrand,
                                          headline:
                                            "Items available in all 3 branches",
                                        }
                                      : demo,
                                    t,
                                  ),
                                }}
                              />
                            ) : (
                              <div
                                className="template-swatch"
                                style={{ background: t.color }}
                              >
                                <b style={{ color: t.accent }}>
                                  Fresh
                                  <br />
                                  offers.
                                </b>
                                <div
                                  className="swatch-grid"
                                  style={{
                                    gridTemplateColumns: `repeat(${t.columns},1fr)`,
                                  }}
                                >
                                  {Array.from(
                                    { length: Math.min(t.capacity, 6) },
                                    (_, i) => (
                                      <span key={i} />
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                            <b>{t.name}</b>
                            <small>{t.capacity} products / page</small>
                            {current.template === t.id && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                      <button
                        className="button add-more"
                        disabled={!canEdit}
                        onClick={() => {
                          setNewTemplate({
                            ...templates[0],
                            id: uid(),
                            name: "My market template",
                            style: "custom",
                          });
                          setModal("template");
                        }}
                      >
                        <Plus size={15} />
                        Create template
                      </button>
                    </TabsContent>
                    <TabsContent value="details">
                      <div className="panel-heading">
                        <div>
                          <h3>The weekly details</h3>
                          <p>Dates, headline and store information</p>
                        </div>
                      </div>
                      <div className="form-stack">
                        <Field label="Campaign name">
                          <input
                            maxLength={80}
                            value={current.name}
                            disabled={!canEdit}
                            onChange={(e) => edit({ name: e.target.value })}
                          />
                        </Field>
                        <Field label="Flyer headline">
                          <textarea
                            maxLength={90}
                            rows={3}
                            value={current.headline}
                            disabled={!canEdit}
                            onChange={(e) => edit({ headline: e.target.value })}
                          />
                        </Field>
                        <div className="two-cols">
                          <Field label="Starts">
                            <input
                              type="date"
                              value={current.start}
                              disabled={!canEdit}
                              onChange={(e) =>
                                e.target.value &&
                                edit({ start: e.target.value })
                              }
                            />
                          </Field>
                          <Field label="Ends">
                            <input
                              type="date"
                              value={current.end}
                              disabled={!canEdit}
                              onChange={(e) =>
                                e.target.value && edit({ end: e.target.value })
                              }
                            />
                          </Field>
                        </div>
                        <LocationFields
                          brand={current.brand}
                          onChange={(b) => edit({ brand: b })}
                        />
                        <Field label="Store name on this flyer">
                          <input
                            maxLength={60}
                            value={current.brand.name}
                            disabled={!canEdit}
                            onChange={(e) =>
                              edit({
                                brand: {
                                  ...current.brand,
                                  name: e.target.value,
                                },
                              })
                            }
                          />
                        </Field>
                        <Field label="Currency">
                          <input
                            maxLength={8}
                            value={current.brand.currency}
                            disabled={!canEdit}
                            onChange={(e) =>
                              edit({
                                brand: {
                                  ...current.brand,
                                  currency: e.target.value,
                                },
                              })
                            }
                          />
                        </Field>
                        <Field label="Footer / terms">
                          <textarea
                            maxLength={220}
                            value={current.brand.terms}
                            disabled={!canEdit}
                            onChange={(e) =>
                              edit({
                                brand: {
                                  ...current.brand,
                                  terms: e.target.value,
                                },
                              })
                            }
                          />
                        </Field>
                        <button
                          className="button"
                          disabled={!canEdit}
                          onClick={() => {
                            edit({ brand: { ...data.brand } });
                            toast.success("Latest store branding applied");
                          }}
                        >
                          <Store size={15} />
                          Apply saved store branding
                        </button>
                        <button
                          className="button"
                          disabled={!canEdit || issues.length > 0}
                          onClick={() => {
                            edit({ status: "ready" });
                            toast.success("Campaign marked ready");
                          }}
                        >
                          <Check size={15} />
                          Mark ready
                        </button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </section>
                <section className="canvas-area">
                  <div className="canvas-label">
                    <span>A4 PORTRAIT</span>
                    <span>
                      PAGE {actualPage + 1} OF {pages}
                    </span>
                  </div>
                  <div
                    className="flyer-svg interactive-flyer"
                    onClick={(e) => chooseSlot(e.target)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        chooseSlot(e.target);
                      }
                    }}
                    dangerouslySetInnerHTML={{
                      __html: flyerSvg(current, template, actualPage, {}, true),
                    }}
                  />
                  <div className="pagination-controls">
                    <button
                      className="icon-button"
                      disabled={actualPage === 0}
                      aria-label="Previous flyer page"
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span>
                      {actualPage + 1} / {pages}
                    </span>
                    <button
                      className="icon-button"
                      disabled={actualPage === pages - 1}
                      aria-label="Next flyer page"
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="canvas-note">
                    <Check size={14} />
                    Click a product card to choose a product and price.
                  </div>
                  {issues.length > 0 && (
                    <div className="validation-note">{issues.join(" ")}</div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
        {view === "Product library" && (
          <section className="content-surface">
            <div className="library-toolbar">
              <div className="searchbox">
                <Search size={17} />
                <input
                  aria-label="Search product library"
                  placeholder="Search products, categories or SKU…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Choice
                label="Filter category"
                value={filter}
                onChange={setFilter}
                options={[
                  "All",
                  ...new Set(data.products.map((p) => p.category)),
                ].map((x) => ({ value: x, label: x }))}
              />
              <button
                className="button"
                disabled={!canEdit}
                onClick={() => csvInput.current?.click()}
              >
                <Upload size={16} />
                Import CSV
              </button>
              <button
                className="button"
                disabled={!canEdit}
                onClick={() => bulkInput.current?.click()}
              >
                <ImagePlus size={16} />
                Upload images
              </button>
              <button
                className="button primary"
                disabled={!canEdit}
                onClick={addProduct}
              >
                <Plus size={16} />
                Add product
              </button>
            </div>
            {data.products.length === 0 ? (
              <div className="empty">
                <Package size={38} />
                <h2>A home for every product</h2>
                <p>
                  Add a product, upload your images, or try the sample catalog.
                </p>
                <button
                  className="button primary"
                  disabled={!canEdit}
                  onClick={() => {
                    update((d) => ({ ...d, products: sampleProducts }));
                    toast.success("Sample catalog added");
                  }}
                >
                  Add sample catalog
                </button>
              </div>
            ) : shownProducts.length === 0 ? (
              <div className="empty">
                <Search />
                <h3>No products found</h3>
                <p>Try a different name or category.</p>
              </div>
            ) : (
              <div className="product-grid">
                {shownProducts.map((p) => (
                  <article className="product-card" key={p.id}>
                    <div className="product-card-image">
                      {p.image ? (
                        <img src={p.image} alt={p.name} />
                      ) : (
                        <Package size={50} />
                      )}
                      <span>{p.category}</span>
                    </div>
                    <h3>{p.name}</h3>
                    <p>
                      {p.pack || "Add pack size"}
                      {p.sku ? " · " + p.sku : ""}
                    </p>
                    <div>
                      <strong>
                        {data.brand.currency} {p.price.toFixed(2)}
                      </strong>
                      <button
                        className="button small"
                        onClick={() => {
                          setProduct({ ...p });
                          setModal("product");
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="bare"
                        aria-label={`Delete ${p.name}`}
                        onClick={() =>
                          setConfirm({ kind: "product", id: p.id })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="surface-footer">
              <button
                className="text-button"
                onClick={() =>
                  downloadBlob(
                    new Blob(
                      [
                        "name,pack,category,price,sku\nFresh bananas,1 kg,Fruit,7.95,BAN001\n",
                      ],
                      { type: "text/csv" },
                    ),
                    "flyerly-product-template.csv",
                  )
                }
              >
                Download CSV template
              </button>
              <span>Campaigns keep a copy of their products and prices.</span>
            </div>
          </section>
        )}
        {view === "Saved campaigns" && (
          <section className="content-surface">
            {data.campaigns.length === 0 ? (
              <div className="empty">
                <FolderOpen size={40} />
                <h2>Your first week starts here</h2>
                <p>Start fresh or make the sample campaign your own.</p>
                <button
                  className="button primary"
                  disabled={!canEdit}
                  onClick={() => startCampaign(true)}
                >
                  Use sample campaign
                </button>
              </div>
            ) : (
              <div className="campaign-grid">
                {data.campaigns.map((c) => (
                  <article className="campaign-card" key={c.id}>
                    <button
                      className="campaign-cover"
                      onClick={() => openCampaign(c)}
                      aria-label={`Open ${c.name}`}
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: flyerSvg(
                            c,
                            c.templateSnapshot ||
                              allTemplates.find((t) => t.id === c.template) ||
                              templates[0],
                          ),
                        }}
                      />
                    </button>
                    <div className="campaign-info">
                      <span className="draft-chip">
                        {c.status.toUpperCase()}
                      </span>
                      <h3>{c.name}</h3>
                      <p>
                        {c.start} — {c.end} · {c.items.length} products
                      </p>
                      <div>
                        <button
                          className="button small"
                          onClick={() => openCampaign(c)}
                        >
                          Open campaign
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Duplicate ${c.name}`}
                          onClick={() => duplicate(c)}
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          className="bare"
                          aria-label={`Delete ${c.name}`}
                          onClick={() =>
                            setConfirm({ kind: "campaign", id: c.id })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
        {view === "AI credits" && (
          <CreditPanel info={business.info} refresh={business.refresh} />
        )}
        {view === "Business admin" && business.info?.isAdmin && (
          <AdminPanel onPreview={showcase} />
        )}
        {view === "Templates" && (
          <section className="content-surface">
            <div className="section-title">
              <h2>{allTemplates.length} ready-to-use layouts</h2>
              {business.info?.isAdmin && (
                <button className="button" onClick={showcase}>
                  Wear Mart showcase
                </button>
              )}
              <button
                className="button"
                disabled={!canEdit}
                onClick={() => {
                  setNewTemplate({
                    ...templates[0],
                    id: uid(),
                    name: "My market template",
                    style: "custom",
                  });
                  setModal("template");
                }}
              >
                <Plus size={16} />
                Create template
              </button>
            </div>
            <div className="template-gallery">
              {allTemplates.map((t) => (
                <article className="template-card" key={t.id}>
                  <div
                    className="template-preview"
                    dangerouslySetInnerHTML={{
                      __html: flyerSvg(
                        t.style.startsWith("wear-")
                          ? {
                              ...demo,
                              brand: wearMartBrand,
                              headline: "Items available in all 3 branches",
                            }
                          : demo,
                        t,
                      ),
                    }}
                  />
                  <div>
                    {(t.artwork ||
                      t.style.startsWith("wear-") ||
                      business.info?.business?.templates.some(
                        (a) => a.id === t.id,
                      )) && (
                      <span className="collection-tag">
                        {t.style.startsWith("wear-")
                          ? "WEAR MART COLLECTION"
                          : business.info?.business?.templates.some(
                                (a) => a.id === t.id,
                              )
                            ? "YOUR PRIVATE COLLECTION"
                            : "STUDIO COLLECTION"}
                      </span>
                    )}
                    <h3>{t.name}</h3>
                    <p>{t.capacity} products per page · A4</p>
                    <button
                      className="button"
                      disabled={!canEdit}
                      onClick={() => {
                        edit({ template: t.id });
                        setView("Campaign studio");
                        setTab("design");
                        toast.success("Template applied");
                      }}
                    >
                      Use template <ArrowUpRight size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {view === "Store branding" && (
          <section className="content-surface branding-surface">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!brand.name.trim() || !brand.currency.trim()) return;
                update((d) => ({ ...d, brand }));
                setBrandDraft(null);
                toast.success("Branding saved for your next campaigns");
              }}
            >
              <div className="section-title">
                <h2>Your store identity</h2>
                <Store size={20} />
              </div>
              <div className="logo-upload">
                {brand.logo ? (
                  <img src={brand.logo} alt="Store logo" />
                ) : (
                  <Store size={32} />
                )}
                <label className="button">
                  {busy ? "Uploading…" : "Upload store logo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    disabled={busy}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setBusy(true);
                      try {
                        setBrandDraft({ ...brand, logo: await upload(f) });
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </label>
                {brand.logo && (
                  <button
                    type="button"
                    className="bare"
                    aria-label="Remove logo"
                    onClick={() => setBrandDraft({ ...brand, logo: "" })}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <div className="form-stack">
                <Field label="Store name">
                  <input
                    required
                    maxLength={60}
                    value={brand.name}
                    onChange={(e) =>
                      setBrandDraft({ ...brand, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Address or tagline">
                  <input
                    maxLength={140}
                    value={brand.address}
                    onChange={(e) =>
                      setBrandDraft({ ...brand, address: e.target.value })
                    }
                  />
                </Field>
                <div className="two-cols">
                  <Field label="Phone">
                    <input
                      maxLength={40}
                      value={brand.phone}
                      onChange={(e) =>
                        setBrandDraft({ ...brand, phone: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Currency">
                    <input
                      required
                      maxLength={8}
                      value={brand.currency}
                      onChange={(e) =>
                        setBrandDraft({ ...brand, currency: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <Field label="Brand color">
                  <input
                    type="color"
                    value={brand.color}
                    onChange={(e) =>
                      setBrandDraft({ ...brand, color: e.target.value })
                    }
                  />
                </Field>
                <LocationFields brand={brand} onChange={setBrandDraft} />
                <Field label="Offer terms">
                  <textarea
                    rows={3}
                    maxLength={220}
                    value={brand.terms}
                    onChange={(e) =>
                      setBrandDraft({ ...brand, terms: e.target.value })
                    }
                  />
                </Field>
                <button className="button primary" disabled={!canEdit}>
                  <Save size={16} />
                  Save store branding
                </button>
              </div>
            </form>
            <aside>
              <div
                className="brand-preview"
                style={{ background: brand.color }}
              >
                {brand.logo && <img src={brand.logo} alt="Logo preview" />}
                <h2>{brand.name}</h2>
                <p>{brand.address}</p>
                <b>
                  Fresh offers.
                  <br />
                  Familiar faces.
                </b>
                <small>{brand.phone}</small>
              </div>
              <p>
                New campaigns use these details. Apply updated branding to an
                existing flyer from its Details tab.
              </p>
              <button className="button" onClick={backup}>
                <Download size={15} />
                Download workspace backup
              </button>
            </aside>
          </section>
        )}
        <div className="bottom-note">
          <span>
            <Leaf size={16} />
            Built for your busiest weeks.
          </span>
          <span>
            Upload once. Reuse every week. <ArrowUpRight size={15} />
          </span>
        </div>
      </main>
      <input
        ref={bulkInput}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => uploadProduct(e.target.files)}
      />
      <input
        ref={csvInput}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => readCsv(e.target.files?.[0])}
      />
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open && !busy && !exporting) setModal(null);
        }}
      >
        <DialogContent
          className={
            modal === "picker" || modal === "csv" ? "wide-dialog" : "app-dialog"
          }
        >
          <DialogHeader>
            <DialogTitle>
              {modal === "product"
                ? "Product details"
                : modal === "picker"
                  ? "Add products to your flyer"
                  : modal === "export"
                    ? "Ready to go out into the world?"
                    : modal === "template"
                      ? "Create a reusable template"
                      : "Review your product import"}
            </DialogTitle>
            <DialogDescription>
              {modal === "product"
                ? "Save the image once. Use this product in any weekly campaign."
                : modal === "picker"
                  ? "Select a product to add it with its current price."
                  : modal === "export"
                    ? "Download a print-sized PDF or an image to share."
                    : modal === "template"
                      ? "Choose your colors and product layout."
                      : "Check the rows below before adding them to your library."}
            </DialogDescription>
          </DialogHeader>
          {modal === "product" && product && (
            <form onSubmit={saveProduct} className="form-stack">
              <div className="product-upload">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name || "Product image"}
                  />
                ) : (
                  <ImagePlus size={40} />
                )}
                <label className="button">
                  {busy ? "Uploading…" : "Choose image"}
                  <input
                    type="file"
                    hidden
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setBusy(true);
                      try {
                        const image = await upload(f);
                        setProduct((p) => (p ? { ...p, image } : p));
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </label>
              </div>
              <EnhanceButton
                source={product.image}
                onApply={(image) => setProduct({ ...product, image })}
                info={business.info}
                refresh={business.refresh}
              />
              <Field label="Arabic product name (optional)">
                <input
                  dir="rtl"
                  maxLength={100}
                  value={product.arabicName || ""}
                  onChange={(e) =>
                    setProduct({ ...product, arabicName: e.target.value })
                  }
                />
                <small className="help-text">
                  Appears on Wear Mart layouts.
                </small>
              </Field>
              <Field label="Product name">
                <input
                  required
                  maxLength={100}
                  value={product.name}
                  onChange={(e) =>
                    setProduct({ ...product, name: e.target.value })
                  }
                />
              </Field>
              <div className="two-cols">
                <Field label="Pack size">
                  <input
                    maxLength={50}
                    placeholder="e.g. 1 kg"
                    value={product.pack}
                    onChange={(e) =>
                      setProduct({ ...product, pack: e.target.value })
                    }
                  />
                </Field>
                <Field label={`Regular price · ${data.brand.currency}`}>
                  <input
                    required
                    type="number"
                    min="0"
                    max="999999"
                    step=".01"
                    value={product.price}
                    onChange={(e) =>
                      setProduct({ ...product, price: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
              <div className="two-cols">
                <Field label="Category">
                  <input
                    maxLength={40}
                    value={product.category}
                    onChange={(e) =>
                      setProduct({ ...product, category: e.target.value })
                    }
                  />
                </Field>
                <Field label="SKU / barcode (optional)">
                  <input
                    maxLength={80}
                    value={product.sku}
                    onChange={(e) =>
                      setProduct({ ...product, sku: e.target.value })
                    }
                  />
                </Field>
              </div>
              <button className="button primary" disabled={!canEdit}>
                <Check size={16} />
                Save product
              </button>
            </form>
          )}
          {modal === "picker" && (
            <>
              <div className="searchbox">
                <Search size={17} />
                <input
                  aria-label="Search products to add"
                  placeholder="Search your product library…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {data.products.length === 0 ? (
                <div className="empty compact">
                  <p>Your library is empty.</p>
                  <button
                    className="button"
                    onClick={() => {
                      update((d) => ({ ...d, products: sampleProducts }));
                    }}
                  >
                    Add sample catalog
                  </button>
                  <button className="button primary" onClick={addProduct}>
                    Create a product
                  </button>
                </div>
              ) : (
                <div className="picker-list">
                  {data.products
                    .filter((p) =>
                      [p.name, p.arabicName, p.sku]
                        .join(" ")
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((p) => {
                      const added = current.items.some((x) => x.id === p.id);
                      return (
                        <div className="picker-row" key={p.id}>
                          <Thumb product={p} />
                          <div>
                            <b>{p.name}</b>
                            <small>
                              {p.pack} · {data.brand.currency}{" "}
                              {p.price.toFixed(2)}
                            </small>
                          </div>
                          <button
                            className="button small"
                            disabled={added || current.items.length >= 120}
                            onClick={() => {
                              edit({
                                items: [
                                  ...current.items,
                                  {
                                    ...p,
                                    offer: p.price,
                                    badge: "",
                                    slot: nextSlot(),
                                    showOldPrice: false,
                                  },
                                ],
                              });
                              toast.success(`${p.name} added`);
                            }}
                          >
                            {added ? (
                              <>
                                <Check size={14} />
                                Added
                              </>
                            ) : (
                              <>
                                <Plus size={14} />
                                Add
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
              <button className="button primary" onClick={() => setModal(null)}>
                Done
              </button>
            </>
          )}
          {modal === "export" && (
            <div className="export-options">
              {download && (
                <a
                  className="button primary"
                  href={download.url}
                  download={download.name}
                >
                  <Download size={18} />
                  Download{" "}
                  {download.name.endsWith("pdf")
                    ? "PDF"
                    : download.name.endsWith("png")
                      ? "PNG"
                      : "SVG"}
                </a>
              )}
              {exportError && <div className="notice error">{exportError}</div>}
              {issues.length > 0 && (
                <div className="notice error">{issues.join(" ")}</div>
              )}
              <button
                className="export-option"
                disabled={exporting || issues.length > 0}
                onClick={() => doExport("pdf")}
              >
                <Files />
                <div>
                  <b>
                    PDF · All {pages} {pages === 1 ? "page" : "pages"}
                  </b>
                  <p>A4 document, high-resolution images</p>
                </div>
                <Download size={18} />
              </button>
              <button
                className="export-option"
                disabled={exporting || issues.length > 0}
                onClick={() => doExport("png")}
              >
                <ImagePlus />
                <div>
                  <b>PNG · Page {actualPage + 1}</b>
                  <p>2480 × 3508 px, ready to share</p>
                </div>
                <Download size={18} />
              </button>
              <button
                className="export-option"
                disabled={exporting || issues.length > 0}
                onClick={() => doExport("svg")}
              >
                <LayoutTemplate />
                <div>
                  <b>SVG · Page {actualPage + 1}</b>
                  <p>Scalable text with embedded product images</p>
                </div>
                <Download size={18} />
              </button>
              {exporting && (
                <p className="inline-loading">
                  <Loader2 className="spin" size={16} />
                  Preparing your download…
                </p>
              )}
              <p className="help-text">
                PDF uses RGB colors and no bleed. Ask your printer about their
                requirements before a large print run.
              </p>
              {current.items.some((p) => !p.image) && (
                <p className="help-text">
                  Some products do not have an image yet.
                </p>
              )}
              {current.items.some((p) => p.name.length > 45) && (
                <p className="help-text">
                  Long names may be shortened. Check the preview before sharing.
                </p>
              )}
            </div>
          )}
          {modal === "template" && (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const t = { ...newTemplate, id: uid() };
                update((d) => ({
                  ...d,
                  customTemplates: [...d.customTemplates, t],
                }));
                setModal(null);
                toast.success("Template added to your library");
              }}
            >
              <Field label="Template name">
                <input
                  required
                  maxLength={50}
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                />
              </Field>
              <div className="two-cols">
                <Field label="Main color">
                  <input
                    type="color"
                    value={newTemplate.color}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, color: e.target.value })
                    }
                  />
                </Field>
                <Field label="Accent color">
                  <input
                    type="color"
                    value={newTemplate.accent}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, accent: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label="Products per page">
                <Choice
                  label="Template layout"
                  value={`${newTemplate.columns}-${newTemplate.capacity}`}
                  onChange={(v) => {
                    const [columns, capacity] = v.split("-").map(Number);
                    setNewTemplate({ ...newTemplate, columns, capacity });
                  }}
                  options={[
                    { value: "2-4", label: "4 products · 2 columns" },
                    { value: "3-6", label: "6 products · 3 columns" },
                    { value: "2-6", label: "6 products · 2 columns" },
                    { value: "3-9", label: "9 products · 3 columns" },
                  ]}
                />
              </Field>
              <button className="button primary" disabled={!canEdit}>
                <Plus size={16} />
                Save template
              </button>
            </form>
          )}
          {modal === "csv" && (
            <>
              <p className="help-text">
                {csvRows.length} products will be added. Images can be uploaded
                after import. Existing products will be kept.
              </p>
              <div className="csv-preview">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Pack</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvRows.slice(0, 100).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.pack}</TableCell>
                        <TableCell>{p.price.toFixed(2)}</TableCell>
                        <TableCell>{p.category}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {csvRows.length > 100 && <p>Showing the first 100 rows.</p>}
              <button
                className="button primary"
                onClick={() => {
                  update((d) => ({
                    ...d,
                    products: [...csvRows, ...d.products],
                  }));
                  setModal(null);
                  toast.success(`${csvRows.length} products imported`);
                }}
              >
                Import {csvRows.length} products
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
      <SlotEditor
        slot={modal === null ? slot : null}
        offer={current.items.find((_, i) => slotNumber(current, i) === slot)}
        products={data.products}
        currency={current.brand.currency}
        onClose={() => setSlot(null)}
        onNew={addProduct}
        onRemove={() => {
          edit({
            items: current.items
              .map((p, i) => ({ ...p, slot: slotNumber(current, i) }))
              .filter((p) => p.slot !== slot),
          });
          setSlot(null);
        }}
        onSave={(p) => {
          const items = current.items
            .map((p, i) => ({ ...p, slot: slotNumber(current, i) }))
            .filter((p) => p.slot !== slot);
          items.push({ ...p, slot: slot! });
          items.sort((a, b) => a.slot - b.slot);
          edit({ items });
          setSlot(null);
        }}
      />
      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {confirm?.kind}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "product"
                ? "This removes it from your library. Saved campaigns keep their existing product images and prices."
                : "This campaign will be removed from your workspace. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm?.kind === "product")
                  update((d) => ({
                    ...d,
                    products: d.products.filter((p) => p.id !== confirm.id),
                  }));
                else if (confirm)
                  update((d) => ({
                    ...d,
                    campaigns: d.campaigns.filter((c) => c.id !== confirm.id),
                  }));
                setConfirm(null);
                toast.success("Deleted");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
