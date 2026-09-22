"use client";

import React, { useState } from "react";
import { BusinessRecord, brandToBusinessProfile, defaultBrand } from "../../app/model";
import { Store, ChevronDown, Plus, Check, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function BusinessSwitcher({
  businesses,
  activeBusinessId,
  onSwitchBusiness,
  onCreateBusiness,
  onOpenSettings,
}: {
  businesses: BusinessRecord[];
  activeBusinessId: string;
  onSwitchBusiness: (bizId: string) => void;
  onCreateBusiness: (name: string) => void;
  onOpenSettings: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newBizName, setNewBizName] = useState("");

  const activeBusiness =
    businesses.find((b) => b.id === activeBusinessId) ||
    businesses[0] || {
      id: "default",
      name: "My Business",
      profile: brandToBusinessProfile(defaultBrand),
      products: [],
      flyers: [],
      customTemplates: [],
    };

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newBizName.trim()) return;
    onCreateBusiness(newBizName.trim());
    setNewBizName("");
    setCreateOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition outline-none cursor-pointer">
          {activeBusiness.profile?.logo ? (
            <img
              src={activeBusiness.profile.logo}
              alt={activeBusiness.name}
              className="w-5 h-5 object-contain rounded"
            />
          ) : (
            <div className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <Store size={12} />
            </div>
          )}

          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {activeBusiness.name}
            </span>
            <span className="text-[10px] text-slate-400 leading-tight">
              {activeBusiness.profile?.branches?.length || 1} branch
              {(activeBusiness.profile?.branches?.length || 1) > 1 ? "es" : ""}
            </span>
          </div>

          <ChevronDown size={14} className="text-slate-400 ml-1" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64 p-1.5 shadow-xl">
          <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            Switch Business Context
          </DropdownMenuLabel>

          {businesses.map((b) => {
            const isSelected = b.id === activeBusinessId;
            return (
              <DropdownMenuItem
                key={b.id}
                onClick={() => onSwitchBusiness(b.id)}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
                  isSelected ? "bg-emerald-50 text-emerald-900 font-bold" : "text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {b.profile?.logo ? (
                    <img
                      src={b.profile.logo}
                      alt={b.name}
                      className="w-5 h-5 object-contain rounded"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                      {b.name.charAt(0)}
                    </div>
                  )}
                  <span className="truncate text-xs">{b.name}</span>
                </div>
                {isSelected && <Check size={14} className="text-emerald-700" />}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 text-xs p-2 text-emerald-800 font-semibold cursor-pointer hover:bg-emerald-50"
          >
            <Plus size={14} />
            <span>Create New Business</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={onOpenSettings}
            className="flex items-center gap-2 text-xs p-2 text-slate-600 cursor-pointer hover:bg-slate-100"
          >
            <Settings size={14} />
            <span>Business Branding & Profile</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Business Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Store size={18} className="text-emerald-700" />
              Add New Business to Account
            </DialogTitle>
            <DialogDescription className="text-xs">
              Each business maintains its own branding, logos, branch locations, products, and flyers.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="flex flex-col gap-4 pt-3">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
              <span>Business Name</span>
              <input
                autoFocus
                required
                type="text"
                placeholder="e.g. Discount World Center, Supermarket..."
                value={newBizName}
                onChange={(e) => setNewBizName(e.target.value)}
                className="h-9 border border-slate-300 rounded-lg px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-700/20"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition"
              >
                Create Business
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
