"use client";

import React, { useState } from "react";
import { Product, Offer } from "../../app/model";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, Package, Check, Sparkles } from "lucide-react";

export function ProductPickerModal({
  open,
  onClose,
  products,
  onSelectProduct,
  currency = "AED",
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Offer) => void;
  currency?: string;
}) {
  const [query, setQuery] = useState("");
  const [discountPercent, setDiscountPercent] = useState(25);

  const filtered = products
    .filter((p) => {
      const q = query.toLowerCase().trim();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.arabicName && p.arabicName.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
      );
    })
    .slice(0, 40);

  function handlePick(p: Product) {
    const offerPrice =
      discountPercent > 0
        ? Math.round(p.price * (1 - discountPercent / 100) * 100) / 100
        : p.price;
    const badge = discountPercent > 0 ? `-${discountPercent}%` : "";

    onSelectProduct({
      ...p,
      offer: offerPrice,
      badge,
      showOldPrice: discountPercent > 0,
    });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Package size={20} className="text-emerald-700" />
            Select Product from Library
          </DialogTitle>
          <DialogDescription className="text-xs">
            Search your products to place them into the selected cell.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar & Auto-Discount Slider */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white shadow-sm focus-within:ring-2 focus-within:ring-emerald-700/20">
            <Search size={16} className="text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search products by name, Arabic name, or SKU/barcode..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-sm outline-none bg-transparent"
            />
          </div>

          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              Default Promotional Discount:
            </span>
            <div className="flex items-center gap-2">
              {[0, 15, 20, 25, 30, 50].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiscountPercent(d)}
                  className={`px-2 py-0.5 rounded font-bold transition text-xs ${
                    discountPercent === d
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {d === 0 ? "None" : `-${d}%`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto max-h-80 flex flex-col gap-1.5 pt-2 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
              <Package size={32} className="opacity-40" />
              <p className="text-sm">No products found matching &quot;{query}&quot;</p>
            </div>
          ) : (
            filtered.map((p) => {
              const promoPrice =
                discountPercent > 0
                  ? Math.round(p.price * (1 - discountPercent / 100) * 100) / 100
                  : p.price;

              return (
                <div
                  key={p.id}
                  onClick={() => handlePick(p)}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-11 h-11 object-contain bg-white rounded border border-slate-200 p-0.5"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                        <Package size={18} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <b className="block text-xs font-bold text-slate-800 truncate">
                        {p.name}
                      </b>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        {p.arabicName && <span dir="rtl">{p.arabicName}</span>}
                        {p.pack && <span>· {p.pack}</span>}
                        {p.category && <span>· {p.category}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 text-right">
                    {discountPercent > 0 && (
                      <span className="text-xs text-slate-400 line-through">
                        {currency} {p.price.toFixed(2)}
                      </span>
                    )}
                    <strong className="text-sm font-extrabold text-emerald-800">
                      {currency} {promoPrice.toFixed(2)}
                    </strong>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BulkProductFillModal({
  open,
  onClose,
  products,
  onAssignProducts,
  emptyCellCount,
  currency = "AED",
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onAssignProducts: (selectedOffers: Offer[]) => void;
  emptyCellCount: number;
  currency?: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [discountPercent, setDiscountPercent] = useState(25);

  const filtered = products.filter((p) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.arabicName && p.arabicName.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
    );
  });

  function toggleProduct(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  function handleConfirm() {
    const chosenOffers: Offer[] = selectedIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p))
      .map((p) => {
        const promoPrice =
          discountPercent > 0
            ? Math.round(p.price * (1 - discountPercent / 100) * 100) / 100
            : p.price;
        return {
          ...p,
          offer: promoPrice,
          badge: discountPercent > 0 ? `-${discountPercent}%` : "",
          showOldPrice: discountPercent > 0,
        };
      });

    onAssignProducts(chosenOffers);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Sparkles size={20} className="text-emerald-700" />
            Bulk Fill Products into Grid
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select multiple supermarket products to automatically populate empty cells in the grid.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex-1 flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-1.5 bg-white">
            <Search size={15} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search products for bulk selection..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-xs outline-none bg-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Discount:</span>
            <select
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              className="h-8 text-xs bg-white border border-slate-300 rounded px-2"
            >
              <option value="0">Original Price</option>
              <option value="15">-15%</option>
              <option value="20">-20%</option>
              <option value="25">-25%</option>
              <option value="30">-30%</option>
              <option value="50">-50%</option>
            </select>
          </div>
        </div>

        {/* Selection Count Badge */}
        <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1.5 rounded-lg">
          <span>
            <b>{selectedIds.length}</b> products selected
          </span>
          <span className="text-emerald-700">
            {emptyCellCount} empty cell{emptyCellCount !== 1 ? "s" : ""} available in grid
          </span>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto max-h-80 grid grid-cols-2 gap-2 pt-2 pr-1">
          {filtered.map((p) => {
            const isSelected = selectedIds.includes(p.id);
            return (
              <div
                key={p.id}
                onClick={() => toggleProduct(p.id)}
                className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                  isSelected
                    ? "bg-emerald-50 border-emerald-600 shadow-sm"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isSelected
                      ? "bg-emerald-700 border-emerald-700 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && <Check size={11} />}
                </div>

                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-9 h-9 object-contain bg-white rounded border border-slate-200 p-0.5"
                  />
                ) : (
                  <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                    <Package size={14} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <b className="block text-xs font-bold text-slate-800 truncate">
                    {p.name}
                  </b>
                  <span className="text-[11px] text-emerald-800 font-semibold">
                    {currency} {p.price.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 transition"
          >
            Fill Selected ({selectedIds.length}) into Grid
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
