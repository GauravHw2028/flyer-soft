"use client";

import React, { useState } from "react";
import {
  FlyerPage,
  FlyerSection,
  SectionType,
  createDefaultGrid,
} from "../../app/model";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Layout,
  Megaphone,
  QrCode,
  Sparkles,
  Type,
  Image as ImageIcon,
  Grid as GridIcon,
  Footprints,
} from "lucide-react";

export function SectionManager({
  page,
  onUpdatePage,
  selectedSectionId,
  onSelectSection,
}: {
  page: FlyerPage;
  onUpdatePage: (p: FlyerPage) => void;
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  function moveSection(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= page.sections.length) return;
    const next = [...page.sections];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onUpdatePage({ ...page, sections: next });
  }

  function deleteSection(index: number) {
    const next = page.sections.filter((_, i) => i !== index);
    onUpdatePage({ ...page, sections: next });
    if (selectedSectionId === page.sections[index]?.id) {
      onSelectSection(null);
    }
  }

  function addSection(type: SectionType) {
    let newSec: FlyerSection;

    if (type === "hero") {
      newSec = {
        id: crypto.randomUUID(),
        type: "hero",
        title: "MEGA WEEKEND DEALS",
        subtitle: "Unbeatable prices across all departments",
        badge: "LIMITED TIME OFFER",
        height: 260,
      };
    } else if (type === "banner") {
      newSec = {
        id: crypto.randomUUID(),
        type: "banner",
        title: "WEEKEND SUPER SAVINGS",
        subtitle: "Save up to 50% on all grocery and household items",
        badge: "HOT DEAL",
        height: 95,
      };
    } else if (type === "special_offer") {
      newSec = {
        id: crypto.randomUUID(),
        type: "special_offer",
        title: "CLEARANCE SPECIALS",
        badge: "BUY 2 GET 1 FREE",
        height: 220,
        specialOffer: {
          title: "CLEARANCE SPECIALS",
          badge: "BUY 2 GET 1 FREE",
          products: [],
          columns: 3,
        },
      };
    } else if (type === "highlight") {
      newSec = {
        id: crypto.randomUUID(),
        type: "highlight",
        title: "FEATURED DEAL OF THE WEEK",
        badge: "BEST SELLER",
        height: 220,
      };
    } else if (type === "qr_location") {
      newSec = {
        id: crypto.randomUUID(),
        type: "qr_location",
        title: "STORE LOCATION & CONTACT",
        height: 95,
      };
    } else if (type === "text") {
      newSec = {
        id: crypto.randomUUID(),
        type: "text",
        height: 60,
        textBlock: {
          content: "Fresh arrivals daily directly from local UAE farms",
          size: 14,
          weight: 700,
          align: "center",
          color: "#166534",
        },
      };
    } else if (type === "image") {
      newSec = {
        id: crypto.randomUUID(),
        type: "image",
        height: 140,
        imageBlock: { url: "", caption: "Promotional Banner Image" },
      };
    } else if (type === "footer") {
      newSec = {
        id: crypto.randomUUID(),
        type: "footer",
        height: 65,
        footer: {
          showBranches: true,
          showTerms: true,
          showQr: true,
          customText: "Offers valid while stocks last · Bulk purchase not permitted",
        },
      };
    } else {
      // grid
      newSec = {
        id: crypto.randomUUID(),
        type: "grid",
        title: "Promotional Products",
        height: 380,
        grid: createDefaultGrid(3, 3),
      };
    }

    const next = [...page.sections, newSec];
    onUpdatePage({ ...page, sections: next });
    onSelectSection(newSec.id);
    setAddMenuOpen(false);
  }

  const sectionIcon = (type: SectionType) => {
    switch (type) {
      case "hero":
        return <Layout size={14} className="text-amber-600" />;
      case "banner":
        return <Megaphone size={14} className="text-rose-600" />;
      case "special_offer":
        return <Sparkles size={14} className="text-purple-600" />;
      case "grid":
        return <GridIcon size={14} className="text-emerald-700" />;
      case "highlight":
        return <Sparkles size={14} className="text-blue-600" />;
      case "qr_location":
        return <QrCode size={14} className="text-slate-700" />;
      case "text":
        return <Type size={14} className="text-slate-600" />;
      case "image":
        return <ImageIcon size={14} className="text-indigo-600" />;
      case "footer":
        return <Footprints size={14} className="text-slate-500" />;
    }
  };

  const sectionLabel = (sec: FlyerSection) => {
    switch (sec.type) {
      case "hero":
        return `Hero: ${sec.title || "Main Banner"}`;
      case "banner":
        return `Banner: ${sec.title || "Promo"}`;
      case "special_offer":
        return `Special Offer: ${sec.title || "Deals"}`;
      case "grid":
        return `Grid: ${sec.grid?.rows || 3}×${sec.grid?.cols || 3} (${sec.grid?.cells?.length || 9} cells)`;
      case "highlight":
        return `Highlight: ${sec.title || "Featured"}`;
      case "qr_location":
        return "Branch QR & Map";
      case "text":
        return "Text Block";
      case "image":
        return "Promotional Image";
      case "footer":
        return "Store Footer & Disclaimer";
    }
  };

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
          Page Sections ({page.sections.length})
        </span>
        <button
          type="button"
          onClick={() => setAddMenuOpen(!addMenuOpen)}
          className="text-xs bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md hover:bg-emerald-800 flex items-center gap-1 transition"
        >
          <Plus size={13} />
          Add Section
        </button>
      </div>

      {/* Add Section Menu */}
      {addMenuOpen && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg flex flex-col gap-1.5 animate-in fade-in zoom-in-95">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Choose Section Type
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => addSection("hero")}
              className="p-2 text-left text-xs rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center gap-2"
            >
              <Layout size={14} className="text-amber-600" />
              <span>Hero Header</span>
            </button>
            <button
              type="button"
              onClick={() => addSection("grid")}
              className="p-2 text-left text-xs rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center gap-2"
            >
              <GridIcon size={14} className="text-emerald-700" />
              <span>Product Grid</span>
            </button>
            <button
              type="button"
              onClick={() => addSection("banner")}
              className="p-2 text-left text-xs rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center gap-2"
            >
              <Megaphone size={14} className="text-rose-600" />
              <span>Promo Banner</span>
            </button>
            <button
              type="button"
              onClick={() => addSection("special_offer")}
              className="p-2 text-left text-xs rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center gap-2"
            >
              <Sparkles size={14} className="text-purple-600" />
              <span>Special Offer</span>
            </button>
            <button
              type="button"
              onClick={() => addSection("highlight")}
              className="p-2 text-left text-xs rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center gap-2"
            >
              <Sparkles size={14} className="text-blue-600" />
              <span>Highlight Product</span>
            </button>
            <button
              type="button"
              onClick={() => addSection("qr_location")}
              className="p-2 text-left text-xs rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center gap-2"
            >
              <QrCode size={14} className="text-slate-700" />
              <span>Branch QR Code</span>
            </button>
            <button
              type="button"
              onClick={() => addSection("text")}
              className="p-2 text-left text-xs rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center gap-2"
            >
              <Type size={14} className="text-slate-600" />
              <span>Text Announcement</span>
            </button>
            <button
              type="button"
              onClick={() => addSection("footer")}
              className="p-2 text-left text-xs rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center gap-2"
            >
              <Footprints size={14} className="text-slate-500" />
              <span>Store Footer</span>
            </button>
          </div>
        </div>
      )}

      {/* Sections List */}
      <div className="flex flex-col gap-1.5">
        {page.sections.map((sec, idx) => {
          const isSelected = selectedSectionId === sec.id;
          return (
            <div
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                isSelected
                  ? "bg-emerald-50 border-emerald-500 font-bold text-emerald-900 shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {sectionIcon(sec.type)}
                <span className="truncate">{sectionLabel(sec)}</span>
              </div>

              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveSection(idx, -1)}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                  title="Move Section Up"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  type="button"
                  disabled={idx === page.sections.length - 1}
                  onClick={() => moveSection(idx, 1)}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                  title="Move Section Down"
                >
                  <ChevronDown size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteSection(idx)}
                  className="p-1 text-slate-400 hover:text-rose-700"
                  title="Delete Section"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
