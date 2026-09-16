"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Product, Campaign, Brand, Template, defaultBrand } from "./model";

export type Workspace = {
  products: Product[];
  campaigns: Campaign[];
  brand: Brand;
  customTemplates: Template[];
};

export const emptyWorkspace: Workspace = {
  products: [],
  campaigns: [],
  brand: defaultBrand,
  customTemplates: [],
};

export function useWorkspace() {
  const [data, setData] = useState<Workspace>(emptyWorkspace);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const state = useRef(data);
  const revision = useRef(0);
  const dirty = useRef(false);
  const busy = useRef(false);
  const generation = useRef(0);
  const blocked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/workspace");
      if (!r.ok)
        throw new Error(
          "Your saved workspace could not be loaded. Please retry.",
        );
      const result = (await r.json()) as {
        data: Workspace | null;
        revision: number;
      };
      state.current = result.data || emptyWorkspace;
      setData(state.current);
      revision.current = result.revision;
      dirty.current = false;
      blocked.current = false;
      setLoaded(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async function persist(): Promise<boolean> {
    if (busy.current || blocked.current) return false;
    if (!dirty.current) return true;
    busy.current = true;
    setSaving(true);
    const gen = generation.current;
    try {
      const r = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: state.current,
          revision: revision.current,
        }),
      });
      if (!r.ok) {
        const v = (await r.json()) as { error?: string };
        if (r.status === 409) blocked.current = true;
        throw new Error(v.error || "Save failed. Your edits are still here.");
      }
      const v = (await r.json()) as { revision: number };
      revision.current = v.revision;
      dirty.current = generation.current !== gen;
      setError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
      if (dirty.current && !blocked.current && generation.current !== gen)
        timer.current = setTimeout(() => void persist(), 500);
    }
  }, []);

  const update = useCallback(
    (fn: (d: Workspace) => Workspace) => {
      if (!loaded) return;
      state.current = fn(state.current);
      generation.current++;
      dirty.current = true;
      setData(state.current);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), 700);
    },
    [loaded, save],
  );

  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);

  return { data, loaded, saving, error, update, save, reload: load };
}
