import { SAMPLE_LIBRARY_VERSION, sampleProducts, type Product } from "./model";

export type WorkspaceLike = {
  sampleLibrary?: string;
  products?: Product[];
  businesses?: { products?: Product[] }[];
};

export type WorkspaceWithSampleLibrary = WorkspaceLike & {
  sampleLibrary: string;
  products: Product[];
};

function merge(list: Product[] | undefined): Product[] {
  const existing = list || [];
  const known = new Set(existing.map((p) => p.id));
  const additions = sampleProducts.filter((p) => !known.has(p.id)).map((p) => ({ ...p }));
  return [...existing, ...additions];
}

/**
 * Workspaces saved before a sample-library revision keep their own catalogue.
 * Until a workspace has seen the current revision, hand it the bundled items
 * it is missing so the item library is not stuck on an old, short list. Items
 * the workspace already has, edited or otherwise, are left untouched, and a
 * workspace that is already current is returned unchanged.
 */
export function withSampleLibrary(data: WorkspaceLike): WorkspaceWithSampleLibrary {
  const products = data.products || [];
  if (data.sampleLibrary === SAMPLE_LIBRARY_VERSION)
    return { ...data, sampleLibrary: SAMPLE_LIBRARY_VERSION, products };

  const businesses = data.businesses;
  return {
    ...data,
    sampleLibrary: SAMPLE_LIBRARY_VERSION,
    products: merge(products),
    businesses: Array.isArray(businesses)
      ? businesses.map((b) => ({ ...b, products: merge(b.products) }))
      : businesses,
  };
}
