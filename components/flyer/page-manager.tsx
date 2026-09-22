"use client";

import React from "react";
import {
  FlyerDocument,
  FlyerPage,
  defaultBackgroundPresets,
  templates,
  createDefaultPage,
} from "../../app/model";
import {
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Palette,
  LayoutTemplate,
} from "lucide-react";

export function PageManager({
  flyer,
  activePageIndex,
  onSelectPage,
  onUpdateFlyer,
}: {
  flyer: FlyerDocument;
  activePageIndex: number;
  onSelectPage: (idx: number) => void;
  onUpdateFlyer: (updated: FlyerDocument) => void;
}) {
  const activePage = flyer.pages[activePageIndex] || flyer.pages[0];

  function addPage() {
    const newP = createDefaultPage(
      `Page ${flyer.pages.length + 1}`,
      "fresh",
      false, // non-first page doesn't repeat the hero
    );
    const nextPages = [...flyer.pages, newP];
    onUpdateFlyer({ ...flyer, pages: nextPages });
    onSelectPage(nextPages.length - 1);
  }

  function duplicatePage(index: number) {
    const src = flyer.pages[index];
    if (!src) return;

    // Deep clone with completely fresh IDs for all nodes
    const duplicated: FlyerPage = {
      ...structuredClone(src),
      id: crypto.randomUUID(),
      name: `${src.name} (Copy)`,
      sections: src.sections.map((sec) => ({
        ...structuredClone(sec),
        id: crypto.randomUUID(),
        grid: sec.grid
          ? {
              ...structuredClone(sec.grid),
              id: crypto.randomUUID(),
              cells: sec.grid.cells.map((c) => ({
                ...structuredClone(c),
                id: crypto.randomUUID(),
              })),
            }
          : undefined,
      })),
    };

    const nextPages = [...flyer.pages];
    nextPages.splice(index + 1, 0, duplicated);
    onUpdateFlyer({ ...flyer, pages: nextPages });
    onSelectPage(index + 1);
  }

  function deletePage(index: number) {
    if (flyer.pages.length <= 1) return;
    const nextPages = flyer.pages.filter((_, i) => i !== index);
    onUpdateFlyer({ ...flyer, pages: nextPages });
    onSelectPage(Math.min(activePageIndex, nextPages.length - 1));
  }

  function movePage(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= flyer.pages.length) return;
    const nextPages = [...flyer.pages];
    const [removed] = nextPages.splice(index, 1);
    nextPages.splice(target, 0, removed);
    onUpdateFlyer({ ...flyer, pages: nextPages });
    onSelectPage(target);
  }

  function updateActivePage(patch: Partial<FlyerPage>) {
    const nextPages = flyer.pages.map((p, i) =>
      i === activePageIndex ? { ...p, ...patch } : p,
    );
    onUpdateFlyer({ ...flyer, pages: nextPages });
  }

  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Pages List & Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Flyer Pages ({flyer.pages.length})
          </span>
          <button
            type="button"
            onClick={addPage}
            className="text-xs bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md hover:bg-emerald-800 flex items-center gap-1 transition"
          >
            <Plus size={13} />
            Add Page
          </button>
        </div>

        <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
          {flyer.pages.map((page, idx) => {
            const isActive = idx === activePageIndex;
            return (
              <div
                key={page.id}
                onClick={() => onSelectPage(idx)}
                className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                  isActive
                    ? "bg-emerald-50 border-emerald-500 font-bold text-emerald-900 shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                      isActive
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="truncate">{page.name}</span>
                </div>

                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => movePage(idx, -1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                    title="Move Page Up"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === flyer.pages.length - 1}
                    onClick={() => movePage(idx, 1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                    title="Move Page Down"
                  >
                    <ChevronDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicatePage(idx)}
                    className="p-1 text-slate-400 hover:text-emerald-700"
                    title="Duplicate Page"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={flyer.pages.length <= 1}
                    onClick={() => deletePage(idx)}
                    className="p-1 text-slate-400 hover:text-rose-700 disabled:opacity-20"
                    title="Delete Page"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Page Settings */}
      {activePage && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-800 text-xs">
              Page {activePageIndex + 1} Customization
            </span>
            <span className="text-[11px] text-slate-500">
              Independent page settings
            </span>
          </div>

          {/* Page Name */}
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
            <span>Page Title</span>
            <input
              type="text"
              value={activePage.name}
              onChange={(e) => updateActivePage({ name: e.target.value })}
              className="h-8 border border-slate-300 rounded bg-white px-2 text-xs"
            />
          </label>

          {/* Template Theme for this page */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <LayoutTemplate size={13} className="text-emerald-700" />
                Page Template Theme
              </span>
            </div>
            <select
              value={activePage.templateId || "fresh"}
              onChange={(e) => updateActivePage({ templateId: e.target.value })}
              className="h-8 text-xs bg-white border border-slate-300 rounded px-2 font-medium"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.category || "Promo"})
                </option>
              ))}
            </select>
          </div>

          {/* Page Background Preset */}
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Palette size={13} className="text-emerald-700" />
              Page Background
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {defaultBackgroundPresets.slice(0, 8).map((preset) => {
                const isChosen =
                  activePage.background?.type === "preset" &&
                  activePage.background?.presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      updateActivePage({
                        background: {
                          type: "preset",
                          presetId: preset.id,
                          color: preset.color,
                        },
                      })
                    }
                    className={`h-9 px-2 rounded-md border text-[11px] font-bold text-left flex items-center justify-between transition ${
                      isChosen
                        ? "border-emerald-700 ring-2 ring-emerald-700/20 shadow-sm"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    style={{
                      background: preset.gradient || preset.color,
                      color:
                        preset.id === "bg-clean-white" ? "#334155" : "#ffffff",
                    }}
                  >
                    <span className="truncate">{preset.name}</span>
                    {isChosen && <span>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Custom Background Color */}
            <div className="flex items-center gap-2 pt-2">
              <label className="text-xs text-slate-600 flex items-center gap-1.5 flex-1">
                <span>Solid Color:</span>
                <input
                  type="color"
                  value={activePage.background?.color || "#ffffff"}
                  onChange={(e) =>
                    updateActivePage({
                      background: { type: "solid", color: e.target.value },
                    })
                  }
                  className="h-7 flex-1 p-0.5 rounded border border-slate-300 cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  updateActivePage({
                    background: { type: "solid", color: "#ffffff" },
                  })
                }
                className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 bg-white border border-slate-200 rounded"
              >
                Reset White
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
