import test from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_LIBRARY_VERSION, sampleProducts } from "../app/model";
import { withSampleLibrary } from "../app/sample-library";

const custom = {
  id: "house-brand-oil",
  name: "House brand oil",
  pack: "1 L",
  category: "Pantry",
  price: 12,
  image: "",
  sku: "SKU-HOUSE",
};

test("an older workspace is handed the bundled items it is missing", () => {
  const older = {
    products: [custom],
    businesses: [{ products: [custom] }],
  };
  const upgraded = withSampleLibrary(older);

  assert.equal(upgraded.sampleLibrary, SAMPLE_LIBRARY_VERSION);
  assert.equal(upgraded.products.length, sampleProducts.length + 1);
  assert.equal(upgraded.businesses?.[0].products?.length, sampleProducts.length + 1);
  assert.ok(upgraded.products.some((p) => p.id === custom.id));
  assert.ok(upgraded.products.some((p) => p.id === "milk"));
  assert.ok(upgraded.products.some((p) => p.id === "bananas"));
});

test("a workspace on the current library keeps its own edits and adds nothing", () => {
  const edited = sampleProducts.map((p) => (p.id === "milk" ? { ...p, price: 3.5 } : p));
  const current = {
    sampleLibrary: SAMPLE_LIBRARY_VERSION,
    products: edited.filter((p) => p.id !== "cheese"),
    businesses: [{ products: edited.filter((p) => p.id !== "cheese") }],
  };
  const result = withSampleLibrary(current);

  assert.equal(result.products.length, sampleProducts.length - 1);
  assert.equal(result.products.find((p) => p.id === "milk")?.price, 3.5);
  assert.equal(result.businesses?.[0].products?.length, sampleProducts.length - 1);
});

test("a workspace without a business list does not gain an empty one", () => {
  assert.equal(withSampleLibrary({ products: [] }).businesses, undefined);
});
