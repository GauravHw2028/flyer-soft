"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  templates,
  sampleProducts,
  defaultBrand,
  newFlyer,
  flyerToCampaign,
  migrateCampaignToFlyer,
  Product,
  Campaign,
  Brand,
  Template,
  Offer,
  FlyerDocument,
  FlyerPage,
  FlyerSection,
  GridModel,
  BusinessRecord,
  BusinessProfile,
  brandToBusinessProfile,
  defaultBackgroundPresets,
} from "./model";
import { useWorkspace } from "./use-workspace";
import { exportFlyer, campaignIssues, downloadBlob } from "./flyer";
import { renderPageSvg } from "./flyer-renderer";
import {
  useBusiness,
  CreditPanel,
  AdminPanel,
  LocationFields,
} from "./business-ui";
import { wearMartTemplates, wearMartBrand } from "./wear-mart";
import { productSchema } from "./validation";
import { BusinessSwitcher } from "../components/flyer/business-switcher";
import { GridEditorControls } from "../components/flyer/grid-editor";
import { PageManager } from "../components/flyer/page-manager";
import { SectionManager } from "../components/flyer/section-manager";
import {
  ProductPickerModal,
  BulkProductFillModal,
} from "../components/flyer/product-picker-modal";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  LayoutTemplate,
  Package,
  Files,
  Store,
  Plus,
  Download,
  Check,
  Leaf,
  Upload,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Redo2,
  Loader2,
  AlertCircle,
  Layers,
  Sparkles,
  LogOut,
  Shield,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import type { SessionAccount } from "./account-ui";

const uid = () => crypto.randomUUID();

export default function Studio({ account }: { account: SessionAccount }) {
  const w = useWorkspace();
  const { data, update, saving, error: syncError, recoveredDraft, restoreDraft, discardDraft } = w;
  const businessContext = useBusiness();

  // Active Business & Multi-business resolution
  const businesses = useMemo(() => {
    if (data.businesses && data.businesses.length > 0) return data.businesses;
    const defaultBiz: BusinessRecord = {
      id: "biz-default",
      name: data.brand?.name || "Main Supermarket",
      profile: brandToBusinessProfile(data.brand || defaultBrand, "biz-default"),
      products: data.products || [],
      flyers: (data.campaigns || []).map((c) => migrateCampaignToFlyer(c, "biz-default")),
      customTemplates: data.customTemplates || [],
    };
    return [defaultBiz];
  }, [data.businesses, data.brand, data.products, data.campaigns, data.customTemplates]);

  const activeBusinessId = data.activeBusinessId || businesses[0]?.id || "biz-default";
  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0];

  // Active Flyer Document resolution
  const [selectedFlyerId, setSelectedFlyerId] = useState<string | null>(null);

  const flyers = useMemo(() => {
    if (activeBusiness.flyers && activeBusiness.flyers.length > 0) {
      return activeBusiness.flyers;
    }
    // Backward compatibility with campaigns
    if (data.campaigns && data.campaigns.length > 0) {
      return data.campaigns.map((c) => migrateCampaignToFlyer(c, activeBusiness.id));
    }
    return [newFlyer(activeBusiness.id, activeBusiness.profile ? defaultBrand : defaultBrand, sampleProducts, true)];
  }, [activeBusiness, data.campaigns]);

  const currentFlyer = useMemo(() => {
    return flyers.find((f) => f.id === selectedFlyerId) || flyers[0];
  }, [flyers, selectedFlyerId]);

  // Active Page & Selection state
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "editor" | "pages" | "sections" | "products" | "templates" | "branding" | "admin"
  >("editor");

  // Undo / Redo history
  const [undoStack, setUndoStack] = useState<FlyerDocument[]>([]);
  const [redoStack, setRedoStack] = useState<FlyerDocument[]>([]);

  // Modals state
  const [productModal, setProductModal] = useState<Product | null>(null);
  const [productPickerCellId, setProductPickerCellId] = useState<string | null>(null);
  const [bulkFillOpen, setBulkFillOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<{ url: string; name: string } | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<Product[]>([]);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Ensure active page index is within bounds
  const clampedPageIndex = Math.max(
    0,
    Math.min(activePageIndex, (currentFlyer?.pages?.length || 1) - 1),
  );
  const activePage = currentFlyer?.pages?.[clampedPageIndex] || currentFlyer?.pages?.[0];

  // Document Mutation helper
  function updateFlyer(updatedFlyer: FlyerDocument, pushHistory = true) {
    if (pushHistory && currentFlyer) {
      setUndoStack((prev) => [...prev.slice(-25), structuredClone(currentFlyer)]);
      setRedoStack([]);
    }

    const nextFlyer = {
      ...updatedFlyer,
      updated: new Date().toISOString(),
    };

    update((prev) => {
      const bizList = prev.businesses && prev.businesses.length > 0 ? [...prev.businesses] : [...businesses];
      const bizIndex = bizList.findIndex((b) => b.id === activeBusiness.id);
      if (bizIndex >= 0) {
        const existingFlyers = bizList[bizIndex].flyers || [];
        const fIdx = existingFlyers.findIndex((f) => f.id === nextFlyer.id);
        const updatedFlyers =
          fIdx >= 0
            ? existingFlyers.map((f, i) => (i === fIdx ? nextFlyer : f))
            : [nextFlyer, ...existingFlyers];

        bizList[bizIndex] = {
          ...bizList[bizIndex],
          flyers: updatedFlyers,
        };
      }

      // Keep legacy campaigns in sync
      const legacyCampaign = flyerToCampaign(nextFlyer);
      const updatedCampaigns = prev.campaigns.map((c) =>
        c.id === legacyCampaign.id ? legacyCampaign : c,
      );
      if (!updatedCampaigns.some((c) => c.id === legacyCampaign.id)) {
        updatedCampaigns.unshift(legacyCampaign);
      }

      return {
        ...prev,
        businesses: bizList,
        campaigns: updatedCampaigns,
      };
    });
  }

  function updateActivePage(patch: Partial<FlyerPage> | ((p: FlyerPage) => FlyerPage)) {
    if (!currentFlyer || !activePage) return;
    const nextPages = currentFlyer.pages.map((p, i) => {
      if (i === clampedPageIndex) {
        return typeof patch === "function" ? patch(p) : { ...p, ...patch };
      }
      return p;
    });
    updateFlyer({ ...currentFlyer, pages: nextPages });
  }

  // Undo / Redo handlers
  function handleUndo() {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, structuredClone(currentFlyer)]);
    updateFlyer(previous, false);
  }

  function handleRedo() {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, structuredClone(currentFlyer)]);
    updateFlyer(next, false);
  }

  // Business switching & creation
  function handleSwitchBusiness(bizId: string) {
    update((prev) => ({
      ...prev,
      activeBusinessId: bizId,
    }));
    setSelectedFlyerId(null);
    setActivePageIndex(0);
    setSelectedCellId(null);
    setSelectedSectionId(null);
    toast.success("Switched business context");
  }

  function handleCreateBusiness(name: string) {
    const newBizId = "biz-" + uid().slice(0, 8);
    const newBiz: BusinessRecord = {
      id: newBizId,
      name,
      profile: {
        ...brandToBusinessProfile(defaultBrand, newBizId),
        name,
      },
      products: [...sampleProducts],
      flyers: [newFlyer(newBizId, defaultBrand, sampleProducts)],
      customTemplates: [],
    };

    update((prev) => ({
      ...prev,
      activeBusinessId: newBizId,
      businesses: [...(prev.businesses || businesses), newBiz],
    }));

    setSelectedFlyerId(newBiz.flyers[0].id);
    setActivePageIndex(0);
    toast.success(`Business "${name}" created!`);
  }

  function handleUpdateBusinessProfile(patch: Partial<BusinessProfile>) {
    const nextProfile = {
      ...(activeBusiness.profile || brandToBusinessProfile(defaultBrand, activeBusiness.id)),
      ...patch,
    };

    update((prev) => {
      const nextBizList = (prev.businesses || businesses).map((b) =>
        b.id === activeBusiness.id
          ? { ...b, name: nextProfile.name, profile: nextProfile }
          : b,
      );
      return {
        ...prev,
        brand: {
          ...prev.brand,
          name: nextProfile.name,
          color: nextProfile.brandColors?.primary || prev.brand.color,
          logo: nextProfile.logo,
        },
        businesses: nextBizList,
      };
    });
    toast.success("Business profile saved");
  }

  // Export handling
  async function handleExport(format: "pdf" | "png" | "svg") {
    setExporting(true);
    setDownloadInfo(null);
    try {
      const legacyCampaign = flyerToCampaign(currentFlyer);
      const t = templates.find((x) => x.id === activePage?.templateId) || templates[0];
      const result = await exportFlyer(legacyCampaign, t, format, clampedPageIndex);

      setDownloadInfo({
        url: URL.createObjectURL(result.blob),
        name: result.name,
      });
      toast.success(`Flyer exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  // Canvas interaction listener
  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const cellTarget = target.closest("[data-cell-target]") || target.closest("[data-cell-id]");
    if (cellTarget) {
      const cellId = cellTarget.getAttribute("data-cell-target") || cellTarget.getAttribute("data-cell-id");
      if (cellId) {
        setSelectedCellId(cellId);
        setSelectedSectionId(null);
        return;
      }
    }

    const secTarget = target.closest("[data-section-id]");
    if (secTarget) {
      const secId = secTarget.getAttribute("data-section-id");
      if (secId) {
        setSelectedSectionId(secId);
        setSelectedCellId(null);
        return;
      }
    }

    // Clicked outside
    setSelectedCellId(null);
    setSelectedSectionId(null);
  }

  // Find currently active grid and selected cell
  const activeGrid = useMemo(() => {
    if (!activePage) return null;
    const secWithGrid = activePage.sections.find((s) => s.type === "grid" && s.grid);
    return secWithGrid?.grid || null;
  }, [activePage]);

  const selectedCell = useMemo(() => {
    if (!activeGrid || !selectedCellId) return null;
    return activeGrid.cells.find((c) => c.id === selectedCellId) || null;
  }, [activeGrid, selectedCellId]);

  const selectedSection = useMemo(() => {
    if (!activePage || !selectedSectionId) return null;
    return activePage.sections.find((s) => s.id === selectedSectionId) || null;
  }, [activePage, selectedSectionId]);

  // Empty cell count in active grid
  const emptyCellCount = useMemo(() => {
    if (!activeGrid) return 0;
    return activeGrid.cells.filter((c) => !c.hidden && c.contentType === "empty").length;
  }, [activeGrid]);

  // Bulk fill product assignment
  function handleBulkAssign(selectedOffers: Offer[]) {
    if (!activeGrid || selectedOffers.length === 0) return;
    let offerIdx = 0;
    const nextCells = activeGrid.cells.map((c) => {
      if (!c.hidden && c.contentType === "empty" && offerIdx < selectedOffers.length) {
        const offer = selectedOffers[offerIdx++];
        return {
          ...c,
          contentType: "product" as const,
          product: offer,
        };
      }
      return c;
    });

    const nextGrid = { ...activeGrid, cells: nextCells };
    updateActivePage((page) => ({
      ...page,
      sections: page.sections.map((sec) =>
        sec.type === "grid" && sec.grid?.id === nextGrid.id ? { ...sec, grid: nextGrid } : sec,
      ),
    }));
    toast.success(`Assigned ${offerIdx} products into empty grid cells!`);
  }

  // Single cell product assignment
  function handleCellProductAssign(offer: Offer) {
    if (!activeGrid || !productPickerCellId) return;
    const nextCells = activeGrid.cells.map((c) =>
      c.id === productPickerCellId
        ? {
            ...c,
            contentType: "product" as const,
            product: offer,
          }
        : c,
    );

    const nextGrid = { ...activeGrid, cells: nextCells };
    updateActivePage((page) => ({
      ...page,
      sections: page.sections.map((sec) =>
        sec.type === "grid" && sec.grid?.id === nextGrid.id ? { ...sec, grid: nextGrid } : sec,
      ),
    }));
    setSelectedCellId(productPickerCellId);
    setProductPickerCellId(null);
    toast.success(`Assigned "${offer.name}" to cell`);
  }

  // SVG Render string
  const pageSvgString = useMemo(() => {
    if (!activePage) return "";
    return renderPageSvg(activePage, activeBusiness.profile || defaultBrand, {
      interactive: true,
      selectedCellId,
      selectedSectionId,
    });
  }, [activePage, activeBusiness.profile, selectedCellId, selectedSectionId]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* Top Navbar */}
      <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-black text-lg text-emerald-800">
            <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
              <Leaf size={16} />
            </span>
            <span>flyerly<span className="text-emerald-500">.</span></span>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* Multi-Business Switcher */}
          <BusinessSwitcher
            businesses={businesses}
            activeBusinessId={activeBusiness.id}
            onSwitchBusiness={handleSwitchBusiness}
            onCreateBusiness={handleCreateBusiness}
            onOpenSettings={() => setActiveTab("branding")}
          />

          <div className="h-5 w-px bg-slate-200" />

          {/* Flyer Document Name */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={currentFlyer.name}
              onChange={(e) => updateFlyer({ ...currentFlyer, name: e.target.value })}
              className="text-xs font-bold text-slate-800 bg-transparent hover:bg-slate-100 px-2 py-1 rounded border border-transparent hover:border-slate-200 outline-none max-w-[200px]"
            />
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              {currentFlyer.pages.length} page{currentFlyer.pages.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Center: Autosave Status & Undo/Redo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={undoStack.length === 0}
              onClick={handleUndo}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              disabled={redoStack.length === 0}
              onClick={handleRedo}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded disabled:opacity-30"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={15} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium px-2 py-1 bg-slate-50 rounded-md border border-slate-200">
            {saving ? (
              <>
                <Loader2 size={12} className="animate-spin text-emerald-600" />
                <span>Saving...</span>
              </>
            ) : syncError ? (
              <>
                <AlertCircle size={12} className="text-amber-600" />
                <span className="text-amber-700">Unsaved changes</span>
              </>
            ) : (
              <>
                <Check size={12} className="text-emerald-600" />
                <span>Saved</span>
              </>
            )}
          </div>
        </div>

        {/* Right Actions: Export & Account */}
        <div className="flex items-center gap-3">
          {/* Export Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              disabled={exporting}
              onClick={() => handleExport("pdf")}
              className="px-3 py-1.5 text-xs font-bold rounded-md bg-emerald-700 text-white hover:bg-emerald-800 flex items-center gap-1.5 transition cursor-pointer"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Export PDF
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={() => handleExport("png")}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-md text-slate-700 hover:bg-white transition"
            >
              PNG
            </button>
          </div>

          {/* Admin Panel Link */}
          {businessContext.info?.isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1 font-semibold ${
                activeTab === "admin"
                  ? "bg-purple-50 text-purple-900 border-purple-300"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Shield size={14} className="text-purple-600" />
              <span>Admin</span>
            </button>
          )}

          {/* Account Details & Sign Out */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            <span className="max-w-[120px] truncate text-[11px]" title={account.email}>
              {account.email}
            </span>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "logout" }),
                });
                window.location.reload();
              }}
              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Crash Recovery Notification Banner */}
      {recoveredDraft && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs flex items-center justify-between shrink-0 font-medium shadow-sm">
          <span>
            <b>Unsaved recovery draft found:</b> We recovered flyer edits from your previous session.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restoreDraft}
              className="px-2.5 py-1 bg-white text-amber-900 font-bold rounded shadow-sm hover:bg-amber-50"
            >
              Restore Edits
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="px-2.5 py-1 bg-amber-600 text-white font-medium rounded hover:bg-amber-700"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Main Body (Canva Style: Left Navigation Tabs, Center Canvas, Right Contextual Inspector) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side Icon Strip */}
        <aside className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-3 gap-3 shrink-0 z-10">
          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${
              activeTab === "editor"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <LayoutTemplate size={18} />
            <span>Design</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pages")}
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${
              activeTab === "pages"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Files size={18} />
            <span>Pages</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sections")}
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${
              activeTab === "sections"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Layers size={18} />
            <span>Sections</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${
              activeTab === "products"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Package size={18} />
            <span>Items</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("branding")}
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${
              activeTab === "branding"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Store size={18} />
            <span>Brand</span>
          </button>
        </aside>

        {/* Left Auxiliary Panel (Based on active tab) */}
        {activeTab !== "editor" && (
          <aside className="w-80 bg-white border-r border-slate-200 flex flex-col p-4 overflow-y-auto shrink-0 animate-in slide-in-from-left-4 duration-150">
            {activeTab === "pages" && (
              <PageManager
                flyer={currentFlyer}
                activePageIndex={clampedPageIndex}
                onSelectPage={(idx) => {
                  setActivePageIndex(idx);
                  setSelectedCellId(null);
                  setSelectedSectionId(null);
                }}
                onUpdateFlyer={updateFlyer}
              />
            )}

            {activeTab === "sections" && activePage && (
              <SectionManager
                page={activePage}
                onUpdatePage={(nextP) => updateActivePage(nextP)}
                selectedSectionId={selectedSectionId}
                onSelectSection={(id) => {
                  setSelectedSectionId(id);
                  setSelectedCellId(null);
                }}
              />
            )}

            {activeTab === "products" && (
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Product Library ({activeBusiness.products?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setProductModal({
                        id: uid(),
                        name: "",
                        arabicName: "",
                        pack: "1 kg",
                        category: "Grocery",
                        price: 9.95,
                        image: "",
                        sku: "",
                      })
                    }
                    className="text-xs bg-emerald-700 text-white font-bold px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkFillOpen(true)}
                    className="flex-1 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg hover:bg-emerald-100 flex items-center justify-center gap-1"
                  >
                    <Sparkles size={13} /> Bulk Fill Grid
                  </button>
                  <label className="py-1.5 px-3 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center gap-1">
                    <Upload size={13} /> CSV
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      hidden
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const text = await file.text();
                          // Simple parse
                          const lines = text.split("\n").filter((l) => l.trim());
                          const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
                          const items: Product[] = [];
                          for (let i = 1; i < lines.length; i++) {
                            const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
                            if (cols.length >= 2) {
                              items.push({
                                id: uid(),
                                name: cols[headers.indexOf("name") >= 0 ? headers.indexOf("name") : 0] || "Item",
                                arabicName: cols[headers.indexOf("arabic") >= 0 ? headers.indexOf("arabic") : 1] || "",
                                pack: "1 unit",
                                category: "General",
                                price: Number(cols[headers.indexOf("price") >= 0 ? headers.indexOf("price") : 1]) || 9.99,
                                image: "",
                                sku: "CSV-" + i,
                              });
                            }
                          }
                          setCsvRows(items);
                          setCsvModalOpen(true);
                        } catch {
                          toast.error("Failed to parse CSV file");
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto pr-1">
                  {(activeBusiness.products || []).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-8 h-8 object-contain rounded" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                            <Package size={14} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <b className="block text-xs text-slate-800 truncate">{p.name}</b>
                          <span className="text-[10px] text-slate-400">
                            {activeBusiness.profile?.defaultCurrency || "AED"} {p.price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setProductModal(p)}
                        className="text-[11px] text-emerald-700 font-semibold hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "branding" && (
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Store Branding & Profile
                  </span>
                </div>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  <span>Store Name (English)</span>
                  <input
                    type="text"
                    value={activeBusiness.profile?.name || ""}
                    onChange={(e) => handleUpdateBusinessProfile({ name: e.target.value })}
                    className="h-8 border border-slate-300 rounded px-2"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  <span>Arabic Store Name</span>
                  <input
                    type="text"
                    dir="rtl"
                    value={activeBusiness.profile?.arabicName || ""}
                    onChange={(e) => handleUpdateBusinessProfile({ arabicName: e.target.value })}
                    className="h-8 border border-slate-300 rounded px-2"
                  />
                </label>

                {/* Logo Upload */}
                <div className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  <span>Business Logo</span>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    {activeBusiness.profile?.logo ? (
                      <img
                        src={activeBusiness.profile.logo}
                        alt="Logo"
                        className="w-12 h-12 object-contain bg-white rounded border border-slate-200 p-1"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center text-slate-400 font-bold">
                        Logo
                      </div>
                    )}
                    <label className="text-xs font-bold text-emerald-800 bg-white border border-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-100 cursor-pointer">
                      Upload Logo
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const form = new FormData();
                          form.append("file", file);
                          try {
                            const res = await fetch("/api/assets", { method: "POST", body: form });
                            const json = (await res.json()) as { url?: string };
                            if (json.url) {
                              handleUpdateBusinessProfile({ logo: json.url });
                              toast.success("Logo uploaded!");
                            }
                          } catch {
                            toast.error("Logo upload failed");
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Primary Brand Color */}
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  <span>Primary Brand Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeBusiness.profile?.brandColors?.primary || "#166534"}
                      onChange={(e) =>
                        handleUpdateBusinessProfile({
                          brandColors: {
                            ...(activeBusiness.profile?.brandColors || {
                              primary: "#166534",
                              secondary: "#f5d54b",
                              accent: "#ffda43",
                            }),
                            primary: e.target.value,
                          },
                        })
                      }
                      className="h-8 w-12 p-0.5 rounded border border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 font-mono">
                      {activeBusiness.profile?.brandColors?.primary || "#166534"}
                    </span>
                  </div>
                </label>

                {/* Location / QR link */}
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  <span>Google Maps Location URL (for QR Code)</span>
                  <input
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={activeBusiness.profile?.defaultQrDestination || ""}
                    onChange={(e) => handleUpdateBusinessProfile({ defaultQrDestination: e.target.value })}
                    className="h-8 border border-slate-300 rounded px-2 text-xs"
                  />
                </label>

                {/* Phone & Timings */}
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  <span>Phone Number</span>
                  <input
                    type="text"
                    value={activeBusiness.profile?.phone || ""}
                    onChange={(e) => handleUpdateBusinessProfile({ phone: e.target.value })}
                    className="h-8 border border-slate-300 rounded px-2 text-xs"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  <span>Store Hours</span>
                  <input
                    type="text"
                    value={activeBusiness.profile?.timings || ""}
                    onChange={(e) => handleUpdateBusinessProfile({ timings: e.target.value })}
                    className="h-8 border border-slate-300 rounded px-2 text-xs"
                  />
                </label>
              </div>
            )}

            {activeTab === "admin" && (
              <AdminPanel onPreview={() => toast("Showcase loaded")} />
            )}
          </aside>
        )}

        {/* Center: Flyer Canvas */}
        <main
          onClick={handleCanvasClick}
          className="flex-1 flex flex-col items-center justify-start overflow-y-auto p-8 relative bg-slate-100/80 select-none"
        >
          {/* Page Navigation Indicator */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-1.5 rounded-full shadow-sm mb-5 text-xs font-bold text-slate-700">
            <button
              type="button"
              disabled={clampedPageIndex === 0}
              onClick={(e) => {
                e.stopPropagation();
                setActivePageIndex((p) => Math.max(0, p - 1));
              }}
              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {clampedPageIndex + 1} of {currentFlyer.pages.length}
            </span>
            <button
              type="button"
              disabled={clampedPageIndex === currentFlyer.pages.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                setActivePageIndex((p) => Math.min(currentFlyer.pages.length - 1, p + 1));
              }}
              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* SVG Page Canvas */}
          <div
            className="w-full max-w-[540px] bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-300/80 transition-all duration-150"
            style={{ aspectRatio: "794 / 1123" }}
            dangerouslySetInnerHTML={{ __html: pageSvgString }}
          />

          {/* Canvas Bottom Note */}
          <div className="mt-4 text-xs text-slate-400 flex items-center gap-2">
            <span>A4 Standard Portrait (794 × 1123)</span>
            <span>·</span>
            <span>Click any cell to edit products or borders</span>
          </div>
        </main>

        {/* Right Sidebar: Contextual Inspector */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col p-4 overflow-y-auto shrink-0">
          {selectedCell && activeGrid ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Grid & Cell Settings
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCellId(null)}
                  className="text-xs text-slate-400 hover:text-slate-700 font-semibold"
                >
                  Done
                </button>
              </div>

              <GridEditorControls
                grid={activeGrid}
                onChange={(updatedGrid) => {
                  updateActivePage((page) => ({
                    ...page,
                    sections: page.sections.map((sec) =>
                      sec.type === "grid" && sec.grid?.id === updatedGrid.id ? { ...sec, grid: updatedGrid } : sec,
                    ),
                  }));
                }}
                selectedCellIds={selectedCellId ? [selectedCellId] : []}
                onSelectCells={(ids) => setSelectedCellId(ids[0] || null)}
                onOpenProductSearch={(cellId) => setProductPickerCellId(cellId)}
                onOpenBulkFill={() => setBulkFillOpen(true)}
                currency={activeBusiness.profile?.defaultCurrency || "AED"}
              />
            </div>
          ) : selectedSection ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Section Settings
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSectionId(null)}
                  className="text-xs text-slate-400 hover:text-slate-700 font-semibold"
                >
                  Done
                </button>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>Section Headline</span>
                  <input
                    type="text"
                    value={selectedSection.title || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateActivePage((p) => ({
                        ...p,
                        sections: p.sections.map((s) =>
                          s.id === selectedSection.id ? { ...s, title: val } : s,
                        ),
                      }));
                    }}
                    className="h-8 border border-slate-300 rounded px-2"
                  />
                </label>

                {selectedSection.subtitle !== undefined && (
                  <label className="flex flex-col gap-1 font-semibold text-slate-700">
                    <span>Subtitle</span>
                    <input
                      type="text"
                      value={selectedSection.subtitle || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateActivePage((p) => ({
                          ...p,
                          sections: p.sections.map((s) =>
                            s.id === selectedSection.id ? { ...s, subtitle: val } : s,
                          ),
                        }));
                      }}
                      className="h-8 border border-slate-300 rounded px-2"
                    />
                  </label>
                )}

                {selectedSection.badge !== undefined && (
                  <label className="flex flex-col gap-1 font-semibold text-slate-700">
                    <span>Promotional Badge</span>
                    <input
                      type="text"
                      value={selectedSection.badge || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateActivePage((p) => ({
                          ...p,
                          sections: p.sections.map((s) =>
                            s.id === selectedSection.id ? { ...s, badge: val } : s,
                          ),
                        }));
                      }}
                      className="h-8 border border-slate-300 rounded px-2"
                    />
                  </label>
                )}

                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>Section Height: {selectedSection.height || 260}px</span>
                  <input
                    type="range"
                    min={60}
                    max={500}
                    value={selectedSection.height || 260}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateActivePage((p) => ({
                        ...p,
                        sections: p.sections.map((s) =>
                          s.id === selectedSection.id ? { ...s, height: val } : s,
                        ),
                      }));
                    }}
                    className="accent-emerald-700"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 text-sm">
              <div className="border-b pb-2">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Page Overview
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                <b className="text-xs font-bold text-slate-800">
                  {activePage?.name || "Page 1"}
                </b>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Click on any grid cell to edit products, prices, and border styles. Or click a section to customize headers.
                </p>

                <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setBulkFillOpen(true)}
                    className="py-2 px-3 bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:bg-emerald-800 cursor-pointer"
                  >
                    <Sparkles size={14} /> Bulk Fill Products
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("pages")}
                    className="py-2 px-3 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5"
                  >
                    <Palette size={14} /> Change Page Background
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExport("pdf")}
                    className="py-2 px-3 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5"
                  >
                    <Download size={14} /> Download Ready Flyer
                  </button>
                </div>
              </div>

              {/* AI Credits Widget */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-800 block">
                    AI Credit Balance
                  </span>
                  <b className="text-xl font-black text-emerald-950">
                    {businessContext.info?.balance ?? 20} <small className="text-xs font-normal">credits</small>
                  </b>
                </div>
                {businessContext.info?.isAdmin && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("admin")}
                    className="text-xs bg-white text-emerald-800 border border-emerald-300 font-bold px-2 py-1 rounded"
                  >
                    Manage
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Fast Product Autocomplete Modal for Single Cell */}
      <ProductPickerModal
        open={productPickerCellId !== null}
        onClose={() => setProductPickerCellId(null)}
        products={activeBusiness.products || []}
        onSelectProduct={handleCellProductAssign}
        currency={activeBusiness.profile?.defaultCurrency || "AED"}
      />

      {/* Bulk Product Fill Modal */}
      <BulkProductFillModal
        open={bulkFillOpen}
        onClose={() => setBulkFillOpen(false)}
        products={activeBusiness.products || []}
        onAssignProducts={handleBulkAssign}
        emptyCellCount={emptyCellCount}
        currency={activeBusiness.profile?.defaultCurrency || "AED"}
      />

      {/* Single Product Add / Edit Modal */}
      {productModal && (
        <Dialog open={!!productModal} onOpenChange={(o) => !o && setProductModal(null)}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {productModal.name ? "Edit Product" : "Add Product to Library"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Saved products can be searched and inserted into any promotional flyer.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const nextProds = (activeBusiness.products || []).some((p) => p.id === productModal.id)
                  ? (activeBusiness.products || []).map((p) => (p.id === productModal.id ? productModal : p))
                  : [productModal, ...(activeBusiness.products || [])];

                update((prev) => {
                  const bizList = (prev.businesses || businesses).map((b) =>
                    b.id === activeBusiness.id ? { ...b, products: nextProds } : b,
                  );
                  return { ...prev, businesses: bizList, products: nextProds };
                });
                setProductModal(null);
                toast.success("Product saved to library");
              }}
              className="flex flex-col gap-3 pt-2"
            >
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                <span>Product Name (English)</span>
                <input
                  required
                  type="text"
                  value={productModal.name}
                  onChange={(e) => setProductModal({ ...productModal, name: e.target.value })}
                  className="h-8 border border-slate-300 rounded px-2 text-xs"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                <span>Arabic Name (optional)</span>
                <input
                  type="text"
                  dir="rtl"
                  value={productModal.arabicName || ""}
                  onChange={(e) => setProductModal({ ...productModal, arabicName: e.target.value })}
                  className="h-8 border border-slate-300 rounded px-2 text-xs"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  <span>Price ({activeBusiness.profile?.defaultCurrency || "AED"})</span>
                  <input
                    required
                    type="number"
                    step="0.05"
                    value={productModal.price}
                    onChange={(e) => setProductModal({ ...productModal, price: Number(e.target.value) })}
                    className="h-8 border border-slate-300 rounded px-2 text-xs font-bold"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  <span>Pack / Unit</span>
                  <input
                    type="text"
                    placeholder="1 kg, 2 pcs"
                    value={productModal.pack}
                    onChange={(e) => setProductModal({ ...productModal, pack: e.target.value })}
                    className="h-8 border border-slate-300 rounded px-2 text-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                <span>Category</span>
                <input
                  type="text"
                  value={productModal.category}
                  onChange={(e) => setProductModal({ ...productModal, category: e.target.value })}
                  className="h-8 border border-slate-300 rounded px-2 text-xs"
                />
              </label>

              {/* Photo upload */}
              <div className="flex flex-col gap-1 text-xs font-semibold text-slate-700 pt-1">
                <span>Product Photo</span>
                <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {productModal.image ? (
                    <img src={productModal.image} alt="" className="w-10 h-10 object-contain bg-white rounded p-0.5 border" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center text-slate-400">
                      <Package size={16} />
                    </div>
                  )}
                  <label className="text-xs font-bold text-emerald-800 bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 cursor-pointer">
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const form = new FormData();
                        form.append("file", f);
                        try {
                          const res = await fetch("/api/assets", { method: "POST", body: form });
                          const json = (await res.json()) as { url?: string };
                          if (json.url) {
                            setProductModal({ ...productModal, image: json.url });
                            toast.success("Photo uploaded!");
                          }
                        } catch {
                          toast.error("Upload failed");
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setProductModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded bg-slate-100 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  Save Product
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* CSV Import Preview Modal */}
      {csvModalOpen && (
        <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
          <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Import Products from CSV ({csvRows.length} found)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review imported rows before adding them to your business library.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto max-h-60 border border-slate-200 rounded-lg p-2 divide-y divide-slate-100">
              {csvRows.slice(0, 30).map((r, i) => (
                <div key={i} className="py-1.5 flex items-center justify-between text-xs">
                  <div>
                    <b className="text-slate-800">{r.name}</b>
                    {r.arabicName && <span className="text-slate-400 ml-2" dir="rtl">{r.arabicName}</span>}
                  </div>
                  <span className="font-bold text-emerald-800">
                    {activeBusiness.profile?.defaultCurrency || "AED"} {r.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded bg-slate-100 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  update((prev) => {
                    const nextProds = [...csvRows, ...(activeBusiness.products || [])];
                    const bizList = (prev.businesses || businesses).map((b) =>
                      b.id === activeBusiness.id ? { ...b, products: nextProds } : b,
                    );
                    return { ...prev, businesses: bizList, products: nextProds };
                  });
                  setCsvModalOpen(false);
                  toast.success(`Imported ${csvRows.length} products!`);
                }}
                className="px-4 py-2 text-xs font-bold rounded bg-emerald-700 text-white hover:bg-emerald-800"
              >
                Import {csvRows.length} Products
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Download Ready Dialog */}
      {downloadInfo && (
        <Dialog open={!!downloadInfo} onOpenChange={(o) => !o && setDownloadInfo(null)}>
          <DialogContent className="max-w-sm p-6 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Check size={24} />
            </div>
            <DialogTitle className="text-base font-bold">Your Flyer is Ready!</DialogTitle>
            <DialogDescription className="text-xs">
              Click the button below to download the high-resolution file.
            </DialogDescription>
            <a
              href={downloadInfo.url}
              download={downloadInfo.name}
              onClick={() => setDownloadInfo(null)}
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition"
            >
              <Download size={14} /> Download {downloadInfo.name}
            </a>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
