"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Product,
  Campaign,
  Brand,
  Template,
  defaultBrand,
  BusinessRecord,
  brandToBusinessProfile,
  migrateCampaignToFlyer,
} from "./model";

export type Workspace = {
  activeBusinessId?: string;
  businesses?: BusinessRecord[];
  products: Product[];
  campaigns: Campaign[];
  brand: Brand;
  customTemplates: Template[];
};

export const emptyWorkspace: Workspace = {
  activeBusinessId: "biz-default",
  businesses: [
    {
      id: "biz-default",
      name: defaultBrand.name,
      profile: brandToBusinessProfile(defaultBrand, "biz-default"),
      products: [],
      flyers: [],
      customTemplates: [],
    },
  ],
  products: [],
  campaigns: [],
  brand: defaultBrand,
  customTemplates: [],
};

function normalizeWorkspace(data: Workspace | null): Workspace {
  if (!data) return emptyWorkspace;

  let businesses = data.businesses || [];
  let activeBusinessId = data.activeBusinessId || businesses[0]?.id || "biz-default";

  if (businesses.length === 0) {
    const defaultBiz: BusinessRecord = {
      id: "biz-default",
      name: data.brand?.name || "Main Store",
      profile: brandToBusinessProfile(data.brand || defaultBrand, "biz-default"),
      products: data.products || [],
      flyers: (data.campaigns || []).map((c) => migrateCampaignToFlyer(c, "biz-default")),
      customTemplates: data.customTemplates || [],
    };
    businesses = [defaultBiz];
    activeBusinessId = "biz-default";
  }

  return {
    ...data,
    activeBusinessId,
    businesses,
    brand: data.brand || defaultBrand,
    products: data.products || [],
    campaigns: data.campaigns || [],
    customTemplates: data.customTemplates || [],
  };
}

const LOCAL_STORAGE_KEY = "flyerly_workspace_draft";

export function useWorkspace() {
  const [data, setData] = useState<Workspace>(emptyWorkspace);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recoveredDraft, setRecoveredDraft] = useState<Workspace | null>(null);

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
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as {
          error?: string;
          hint?: string;
        } | null;
        throw new Error(
          [
            body?.error || "Your saved workspace could not be loaded.",
            body?.hint,
          ]
            .filter(Boolean)
            .join(" "),
        );
      }
      const result = (await r.json()) as {
        data: Workspace | null;
        revision: number;
      };

      const normalized = normalizeWorkspace(result.data);
      state.current = normalized;
      setData(normalized);
      revision.current = result.revision;
      dirty.current = false;
      blocked.current = false;
      setLoaded(true);
      setError("");

      // Check for unsaved local storage crash recovery
      try {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local) as { data: Workspace; timestamp: number };
          if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            setRecoveredDraft(normalizeWorkspace(parsed.data));
          }
        }
      } catch {
        // localStorage not available
      }
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
        const v = (await r.json()) as { error?: string; hint?: string };
        if (r.status === 409) blocked.current = true;
        throw new Error(
          [v.error, v.hint].filter(Boolean).join(" ") ||
            "Save failed. Your edits are still here.",
        );
      }
      const v = (await r.json()) as { revision: number };
      revision.current = v.revision;
      dirty.current = generation.current !== gen;
      setError("");

      // Clear local recovery when successfully saved to server
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // Ignore localStorage errors
      }

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
      state.current = normalizeWorkspace(fn(state.current));
      generation.current++;
      dirty.current = true;
      setData(state.current);

      // Save to local storage for crash protection
      try {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({ data: state.current, timestamp: Date.now() }),
        );
      } catch {
        // Ignore localStorage quota errors
      }

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), 700);
    },
    [loaded, save],
  );

  function restoreDraft() {
    if (recoveredDraft) {
      update(() => recoveredDraft);
      setRecoveredDraft(null);
    }
  }

  function discardDraft() {
    setRecoveredDraft(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

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

  return {
    data,
    loaded,
    saving,
    error,
    update,
    save,
    reload: load,
    recoveredDraft,
    restoreDraft,
    discardDraft,
  };
}
