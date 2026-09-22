"use client";

import React, { useState } from "react";
import {
  GridModel,
  GridCell,
  BorderSettings,
} from "../../app/model";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Minimize2,
  Package,
  Type,
  Sparkles,
  Trash2,
  Sliders,
  Layers,
  AlertTriangle,
  Search,
} from "lucide-react";
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

export function GridEditorControls({
  grid,
  onChange,
  selectedCellIds,
  onSelectCells,
  onOpenProductSearch,
  onOpenBulkFill,
  currency = "AED",
}: {
  grid: GridModel;
  onChange: (g: GridModel) => void;
  selectedCellIds: string[];
  onSelectCells: (ids: string[]) => void;
  onOpenProductSearch: (cellId: string) => void;
  onOpenBulkFill: () => void;
  currency?: string;
}) {
  const [pendingResize, setPendingResize] = useState<{
    rows: number;
    cols: number;
  } | null>(null);

  const selectedCell = grid.cells.find((c) => selectedCellIds.includes(c.id));
  const isMultiSelected = selectedCellIds.length > 1;

  // Grid Dimensions resizing
  function handleResize(newRows: number, newCols: number) {
    const clampedRows = Math.min(8, Math.max(1, newRows));
    const clampedCols = Math.min(6, Math.max(1, newCols));

    if (clampedRows === grid.rows && clampedCols === grid.cols) return;

    // Check if destructive (dropping occupied cells)
    const willLoseContent = grid.cells.some(
      (c) =>
        (c.row >= clampedRows || c.col >= clampedCols) &&
        c.contentType !== "empty" &&
        !c.hidden,
    );

    if (willLoseContent) {
      setPendingResize({ rows: clampedRows, cols: clampedCols });
      return;
    }

    applyResize(clampedRows, clampedCols);
  }

  function applyResize(newRows: number, newCols: number) {
    const nextCells: GridCell[] = [];
    for (let r = 0; r < newRows; r++) {
      for (let c = 0; c < newCols; c++) {
        const existing = grid.cells.find((cell) => cell.row === r && cell.col === c);
        if (existing) {
          nextCells.push(existing);
        } else {
          nextCells.push({
            id: `cell-${r}-${c}`,
            row: r,
            col: c,
            rowSpan: 1,
            colSpan: 1,
            hidden: false,
            borders: {
              top: { ...grid.innerBorder },
              right: { ...grid.innerBorder },
              bottom: { ...grid.innerBorder },
              left: { ...grid.innerBorder },
            },
            background: "#ffffff",
            contentType: "empty",
          });
        }
      }
    }
    onChange({
      ...grid,
      rows: newRows,
      cols: newCols,
      cells: nextCells,
    });
    setPendingResize(null);
  }

  // Merge Cells
  const canMerge = (() => {
    if (selectedCellIds.length < 2) return false;
    const selected = grid.cells.filter((c) => selectedCellIds.includes(c.id));
    const minR = Math.min(...selected.map((c) => c.row));
    const maxR = Math.max(...selected.map((c) => c.row));
    const minC = Math.min(...selected.map((c) => c.col));
    const maxC = Math.max(...selected.map((c) => c.col));
    const expectedCount = (maxR - minR + 1) * (maxC - minC + 1);
    return selected.length === expectedCount;
  })();

  function mergeSelectedCells() {
    const selected = grid.cells.filter((c) => selectedCellIds.includes(c.id));
    if (!selected.length) return;

    const minR = Math.min(...selected.map((c) => c.row));
    const maxR = Math.max(...selected.map((c) => c.row));
    const minC = Math.min(...selected.map((c) => c.col));
    const maxC = Math.max(...selected.map((c) => c.col));

    const originCell = grid.cells.find((c) => c.row === minR && c.col === minC);
    if (!originCell) return;

    const rSpan = maxR - minR + 1;
    const cSpan = maxC - minC + 1;

    // Pick first populated content
    const primaryContent = selected.find((c) => c.contentType !== "empty");

    const nextCells = grid.cells.map((c) => {
      if (c.row >= minR && c.row <= maxR && c.col >= minC && c.col <= maxC) {
        if (c.row === minR && c.col === minC) {
          return {
            ...c,
            rowSpan: rSpan,
            colSpan: cSpan,
            hidden: false,
            contentType: primaryContent?.contentType || c.contentType,
            product: primaryContent?.product || c.product,
            banner: primaryContent?.banner || c.banner,
            text: primaryContent?.text || c.text,
          };
        }
        return { ...c, hidden: true };
      }
      return c;
    });

    onChange({ ...grid, cells: nextCells });
    onSelectCells([originCell.id]);
  }

  function unmergeCell(cell: GridCell) {
    const rEnd = cell.row + cell.rowSpan - 1;
    const cEnd = cell.col + cell.colSpan - 1;

    const nextCells = grid.cells.map((c) => {
      if (c.row >= cell.row && c.row <= rEnd && c.col >= cell.col && c.col <= cEnd) {
        return {
          ...c,
          rowSpan: 1,
          colSpan: 1,
          hidden: false,
        };
      }
      return c;
    });

    onChange({ ...grid, cells: nextCells });
  }

  // Update specific cell
  function updateCell(cellId: string, patch: Partial<GridCell>) {
    const nextCells = grid.cells.map((c) => (c.id === cellId ? { ...c, ...patch } : c));
    onChange({ ...grid, cells: nextCells });
  }

  // Border helper
  function applyBorderToCells(
    target: "selected" | "all",
    side: "all" | "top" | "right" | "bottom" | "left",
    settings: BorderSettings,
  ) {
    const nextCells = grid.cells.map((c) => {
      if (target === "selected" && !selectedCellIds.includes(c.id)) return c;
      const b = { ...(c.borders || {}) };
      if (side === "all") {
        b.top = { ...settings };
        b.right = { ...settings };
        b.bottom = { ...settings };
        b.left = { ...settings };
      } else {
        b[side] = { ...settings };
      }
      return { ...c, borders: b };
    });
    onChange({ ...grid, cells: nextCells });
  }

  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Grid Dimensions Controls */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Sliders size={16} className="text-emerald-700" />
            <span>Grid Layout & Size</span>
          </div>
          <button
            type="button"
            onClick={onOpenBulkFill}
            className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-2.5 py-1 rounded-md hover:bg-emerald-100 flex items-center gap-1.5"
          >
            <Sparkles size={13} />
            Bulk Fill Products
          </button>
        </div>

        {/* Rows Slider & Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Rows: {grid.rows}</span>
            <span className="text-slate-400">1 to 8 rows</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={8}
              value={grid.rows}
              onChange={(e) => handleResize(Number(e.target.value), grid.cols)}
              className="flex-1 accent-emerald-700 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <input
              type="number"
              min={1}
              max={8}
              value={grid.rows}
              onChange={(e) => handleResize(Number(e.target.value), grid.cols)}
              className="w-12 h-8 text-center text-xs font-bold border border-slate-300 rounded-md bg-white"
            />
          </div>
        </div>

        {/* Columns Slider & Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Columns: {grid.cols}</span>
            <span className="text-slate-400">1 to 6 columns</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={6}
              value={grid.cols}
              onChange={(e) => handleResize(grid.rows, Number(e.target.value))}
              className="flex-1 accent-emerald-700 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <input
              type="number"
              min={1}
              max={6}
              value={grid.cols}
              onChange={(e) => handleResize(grid.rows, Number(e.target.value))}
              className="w-12 h-8 text-center text-xs font-bold border border-slate-300 rounded-md bg-white"
            />
          </div>
        </div>

        {/* Outer Border Settings */}
        <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Outer Border</span>
            <label className="flex items-center gap-1.5 cursor-pointer font-normal text-slate-600">
              <input
                type="checkbox"
                checked={grid.outerBorder?.enabled}
                onChange={(e) =>
                  onChange({
                    ...grid,
                    outerBorder: {
                      ...grid.outerBorder,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="rounded accent-emerald-700"
              />
              Border on
            </label>
          </div>
          {grid.outerBorder?.enabled && (
            <div className="grid grid-cols-3 gap-2">
              <select
                value={grid.outerBorder.style}
                onChange={(e) =>
                  onChange({
                    ...grid,
                    outerBorder: {
                      ...grid.outerBorder,
                      style: e.target.value as BorderSettings["style"],
                    },
                  })
                }
                className="h-8 text-xs bg-white border border-slate-300 rounded px-2"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
              <div className="flex items-center gap-1 border border-slate-300 bg-white rounded px-2">
                <span className="text-[11px] text-slate-400">W:</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={grid.outerBorder.width}
                  onChange={(e) =>
                    onChange({
                      ...grid,
                      outerBorder: {
                        ...grid.outerBorder,
                        width: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full text-xs outline-none"
                />
              </div>
              <input
                type="color"
                value={grid.outerBorder.color}
                onChange={(e) =>
                  onChange({
                    ...grid,
                    outerBorder: {
                      ...grid.outerBorder,
                      color: e.target.value,
                    },
                  })
                }
                className="h-8 w-full p-0.5 rounded border border-slate-300 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Cell Actions: Merge / Unmerge */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Layers size={16} className="text-emerald-700" />
            <span>Cell Operations</span>
          </div>
          <span className="text-xs text-slate-500">
            {selectedCellIds.length} cell{selectedCellIds.length !== 1 ? "s" : ""} selected
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!canMerge}
            onClick={mergeSelectedCells}
            className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              canMerge
                ? "bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Maximize2 size={14} />
            Merge Cells
          </button>

          <button
            type="button"
            disabled={!selectedCell || (selectedCell.rowSpan === 1 && selectedCell.colSpan === 1)}
            onClick={() => selectedCell && unmergeCell(selectedCell)}
            className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              selectedCell && (selectedCell.rowSpan > 1 || selectedCell.colSpan > 1)
                ? "bg-amber-600 text-white shadow-sm hover:bg-amber-700 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Minimize2 size={14} />
            Unmerge Cell
          </button>
        </div>

        {isMultiSelected && !canMerge && (
          <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
            To merge, select an adjacent rectangular block of cells (e.g. 2 cells side-by-side).
          </p>
        )}
      </div>

      {/* Selected Cell Content & Formatting */}
      {selectedCell && !isMultiSelected && (
        <div className="bg-white border-2 border-emerald-700/40 rounded-xl p-4 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                Cell [{selectedCell.row + 1}, {selectedCell.col + 1}]
              </h4>
              <p className="text-[11px] text-slate-500">
                Span: {selectedCell.rowSpan} row{selectedCell.rowSpan > 1 ? "s" : ""} × {selectedCell.colSpan} col{selectedCell.colSpan > 1 ? "s" : ""}
              </p>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              {selectedCell.contentType}
            </span>
          </div>

          {/* Content Type Selector */}
          <div className="flex rounded-lg bg-slate-100 p-1 gap-1 text-xs">
            <button
              type="button"
              onClick={() => updateCell(selectedCell.id, { contentType: "product" })}
              className={`flex-1 py-1.5 rounded-md font-semibold flex items-center justify-center gap-1 ${
                selectedCell.contentType === "product"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Package size={13} /> Product
            </button>
            <button
              type="button"
              onClick={() =>
                updateCell(selectedCell.id, {
                  contentType: "banner",
                  banner: selectedCell.banner || {
                    title: "PROMO DEAL",
                    subtitle: "Limited Time Only",
                    badge: "HOT",
                  },
                })
              }
              className={`flex-1 py-1.5 rounded-md font-semibold flex items-center justify-center gap-1 ${
                selectedCell.contentType === "banner"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles size={13} /> Banner
            </button>
            <button
              type="button"
              onClick={() =>
                updateCell(selectedCell.id, {
                  contentType: "text",
                  text: selectedCell.text || { content: "Special Offer Text" },
                })
              }
              className={`flex-1 py-1.5 rounded-md font-semibold flex items-center justify-center gap-1 ${
                selectedCell.contentType === "text"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Type size={13} /> Text
            </button>
          </div>

          {/* If Product */}
          {selectedCell.contentType === "product" && (
            <div className="flex flex-col gap-3">
              {selectedCell.product ? (
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    {selectedCell.product.image ? (
                      <img
                        src={selectedCell.product.image}
                        alt={selectedCell.product.name}
                        className="w-12 h-12 object-contain bg-white rounded border border-slate-200 p-1"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center text-slate-400">
                        <Package size={20} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <b className="block truncate text-xs font-bold text-slate-800">
                        {selectedCell.product.name}
                      </b>
                      {selectedCell.product.arabicName && (
                        <span className="block truncate text-[11px] text-slate-500" dir="rtl">
                          {selectedCell.product.arabicName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
                      <span>Promo Price ({currency})</span>
                      <input
                        type="number"
                        step="0.05"
                        value={selectedCell.product.offer}
                        onChange={(e) =>
                          updateCell(selectedCell.id, {
                            product: {
                              ...selectedCell.product!,
                              offer: Number(e.target.value),
                            },
                          })
                        }
                        className="h-8 border border-slate-300 rounded bg-white px-2 font-bold text-emerald-800"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
                      <span>Old Price ({currency})</span>
                      <input
                        type="number"
                        step="0.05"
                        value={selectedCell.product.price}
                        onChange={(e) =>
                          updateCell(selectedCell.id, {
                            product: {
                              ...selectedCell.product!,
                              price: Number(e.target.value),
                            },
                          })
                        }
                        className="h-8 border border-slate-300 rounded bg-white px-2 text-slate-600"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
                      <span>Badge (e.g. -30%)</span>
                      <input
                        type="text"
                        placeholder="Auto"
                        value={selectedCell.product.badge || ""}
                        onChange={(e) =>
                          updateCell(selectedCell.id, {
                            product: {
                              ...selectedCell.product!,
                              badge: e.target.value,
                            },
                          })
                        }
                        className="h-8 border border-slate-300 rounded bg-white px-2 text-xs"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
                      <span>Pack / Unit</span>
                      <input
                        type="text"
                        placeholder="1 kg"
                        value={selectedCell.product.pack || ""}
                        onChange={(e) =>
                          updateCell(selectedCell.id, {
                            product: {
                              ...selectedCell.product!,
                              pack: e.target.value,
                            },
                          })
                        }
                        className="h-8 border border-slate-300 rounded bg-white px-2 text-xs"
                      />
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => onOpenProductSearch(selectedCell.id)}
                      className="flex-1 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded hover:bg-slate-100 flex items-center justify-center gap-1"
                    >
                      <Search size={13} /> Change Product
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCell(selectedCell.id, { product: undefined, contentType: "empty" })}
                      className="px-2.5 py-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenProductSearch(selectedCell.id)}
                  className="py-6 border-2 border-dashed border-emerald-400 bg-emerald-50/50 rounded-xl text-emerald-800 font-bold flex flex-col items-center justify-center gap-2 hover:bg-emerald-50 transition cursor-pointer"
                >
                  <Package size={24} className="text-emerald-700" />
                  <span>Choose Product from Library</span>
                  <span className="text-xs font-normal text-emerald-600">Search by name or barcode</span>
                </button>
              )}
            </div>
          )}

          {/* If Banner */}
          {selectedCell.contentType === "banner" && selectedCell.banner && (
            <div className="flex flex-col gap-2.5">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                <span>Banner Headline</span>
                <input
                  type="text"
                  value={selectedCell.banner.title}
                  onChange={(e) =>
                    updateCell(selectedCell.id, {
                      banner: { ...selectedCell.banner!, title: e.target.value },
                    })
                  }
                  className="h-8 border border-slate-300 rounded px-2 text-xs"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                <span>Subtitle</span>
                <input
                  type="text"
                  value={selectedCell.banner.subtitle || ""}
                  onChange={(e) =>
                    updateCell(selectedCell.id, {
                      banner: { ...selectedCell.banner!, subtitle: e.target.value },
                    })
                  }
                  className="h-8 border border-slate-300 rounded px-2 text-xs"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  <span>Badge Tag</span>
                  <input
                    type="text"
                    value={selectedCell.banner.badge || ""}
                    onChange={(e) =>
                      updateCell(selectedCell.id, {
                        banner: { ...selectedCell.banner!, badge: e.target.value },
                      })
                    }
                    className="h-8 border border-slate-300 rounded px-2 text-xs"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  <span>Background Color</span>
                  <input
                    type="color"
                    value={selectedCell.banner.bg || "#166534"}
                    onChange={(e) =>
                      updateCell(selectedCell.id, {
                        banner: { ...selectedCell.banner!, bg: e.target.value },
                      })
                    }
                    className="h-8 w-full p-0.5 rounded border border-slate-300 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* If Text */}
          {selectedCell.contentType === "text" && selectedCell.text && (
            <div className="flex flex-col gap-2.5">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                <span>Text Content</span>
                <textarea
                  rows={3}
                  value={selectedCell.text.content}
                  onChange={(e) =>
                    updateCell(selectedCell.id, {
                      text: { ...selectedCell.text!, content: e.target.value },
                    })
                  }
                  className="border border-slate-300 rounded p-2 text-xs"
                />
              </label>

              {/* Text Alignment Toolbar */}
              <div className="flex items-center gap-1 border border-slate-200 rounded p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() =>
                    updateCell(selectedCell.id, {
                      text: { ...selectedCell.text!, align: "left" },
                    })
                  }
                  className={`p-1.5 rounded ${
                    selectedCell.text.align === "left"
                      ? "bg-white shadow-sm text-emerald-800 font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <AlignLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateCell(selectedCell.id, {
                      text: { ...selectedCell.text!, align: "center" },
                    })
                  }
                  className={`p-1.5 rounded ${
                    selectedCell.text.align === "center"
                      ? "bg-white shadow-sm text-emerald-800 font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <AlignCenter size={14} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateCell(selectedCell.id, {
                      text: { ...selectedCell.text!, align: "right" },
                    })
                  }
                  className={`p-1.5 rounded ${
                    selectedCell.text.align === "right"
                      ? "bg-white shadow-sm text-emerald-800 font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <AlignRight size={14} />
                </button>

                <div className="h-4 w-px bg-slate-300 mx-1" />

                <input
                  type="color"
                  value={selectedCell.text.color || "#1e293b"}
                  onChange={(e) =>
                    updateCell(selectedCell.id, {
                      text: { ...selectedCell.text!, color: e.target.value },
                    })
                  }
                  className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Cell Border & Background Styling */}
          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-700">Cell Borders & Background</span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-600 flex items-center gap-1.5 flex-1">
                <span>Cell Bg:</span>
                <input
                  type="color"
                  value={selectedCell.background || "#ffffff"}
                  onChange={(e) => updateCell(selectedCell.id, { background: e.target.value })}
                  className="h-7 flex-1 p-0.5 rounded border border-slate-300 cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  applyBorderToCells("selected", "all", {
                    enabled: true,
                    width: 1.5,
                    color: "#0f766e",
                    style: "dashed",
                  })
                }
                className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
              >
                Dashed Accent Border
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog on Destructive Resize */}
      <AlertDialog open={pendingResize !== null} onOpenChange={(open) => !open && setPendingResize(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle size={18} />
              Confirm Grid Reduction
            </AlertDialogTitle>
            <AlertDialogDescription>
              Shrinking the grid to {pendingResize?.rows} rows × {pendingResize?.cols} columns will remove cells
              that currently contain products or promotional banners. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingResize && applyResize(pendingResize.rows, pendingResize.cols)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm & Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
