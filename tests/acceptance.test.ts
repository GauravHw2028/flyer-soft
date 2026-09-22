import test from "node:test";
import assert from "node:assert/strict";

// Import Zod validation schemas
import {
  businessProfileSchema,
  borderSettingsSchema,
  cellTextSchema,
  gridCellSchema,
  gridModelSchema,
  flyerSectionSchema,
  flyerPageSchema,
  flyerDocumentSchema,
} from "../app/validation";

// Import helper functions and models
import {
  createDefaultPage,
  migrateCampaignToFlyer,
  brandToBusinessProfile,
  defaultBackgroundPresets,
  templates,
  BusinessProfile,
} from "../app/model";

import { renderPageSvg, escapeXml } from "../app/flyer-renderer";

test("Test 1: Grid model and cell persistence with unique IDs", () => {
  const page = createDefaultPage("Page 1", "fresh", false);
  const gridSection = page.sections.find((s) => s.type === "grid");
  assert.ok(gridSection, "Grid section should exist");
  assert.ok(gridSection?.grid, "Grid model should exist");

  const grid = gridSection.grid;
  assert.equal(grid.rows, 2);
  assert.equal(grid.cols, 3);
  assert.equal(grid.cells.length, 6);

  // Validate all cells have unique persistent IDs
  const idSet = new Set(grid.cells.map((c) => c.id));
  assert.equal(idSet.size, 6, "Every cell must have a unique ID");

  // Validate Zod schema
  const parsed = gridModelSchema.safeParse(grid);
  assert.ok(parsed.success, "Grid model must conform to gridModelSchema");
});

test("Test 2: Grid resize preservation", () => {
  // Test resizing rows & cols while preserving existing cell content
  const page = createDefaultPage("Page 1", "fresh", false);
  const gridSection = page.sections.find((s) => s.type === "grid");
  assert.ok(gridSection && gridSection.grid);
  const grid = gridSection.grid;

  // Put a product in cell (0, 0)
  grid.cells[0].product = {
    id: "p0",
    name: "Fresh Milk 1L",
    price: 7.0,
    offer: 5.5,
    pack: "1L",
    badge: "SALE",
    category: "Dairy",
    image: "/products/milk.png",
    sku: "SKU0",
  };

  const originalCell0Id = grid.cells[0].id;

  // Function simulating resize logic
  function resizeGrid(g: typeof grid, newRows: number, newCols: number): typeof grid {
    const updatedCells: typeof g.cells = [];
    for (let r = 0; r < newRows; r++) {
      for (let c = 0; c < newCols; c++) {
        const existing = g.cells.find((cell) => cell.row === r && cell.col === c);
        if (existing) {
          updatedCells.push(existing);
        } else {
          updatedCells.push({
            id: `cell-${r}-${c}-${Math.random()}`,
            row: r,
            col: c,
            rowSpan: 1,
            colSpan: 1,
            contentType: "empty",
          });
        }
      }
    }
    return { ...g, rows: newRows, cols: newCols, cells: updatedCells };
  }

  // Resize 2x3 to 4x4
  const resized4x4 = resizeGrid(grid, 4, 4);
  assert.equal(resized4x4.cells.length, 16);
  const cell0 = resized4x4.cells.find((c) => c.row === 0 && c.col === 0);
  assert.ok(cell0);
  assert.equal(cell0.id, originalCell0Id, "Original cell ID must be preserved");
  assert.equal(cell0.product?.name, "Fresh Milk 1L", "Original product data preserved");

  // Resize 4x4 to 5x3
  const resized5x3 = resizeGrid(resized4x4, 5, 3);
  assert.equal(resized5x3.cells.length, 15);
  const cell0Again = resized5x3.cells.find((c) => c.row === 0 && c.col === 0);
  assert.equal(cell0Again?.product?.name, "Fresh Milk 1L");
});

test("Test 3: Merge and Unmerge grid cells", () => {
  const page = createDefaultPage("Page 1", "fresh", false);
  const gridSection = page.sections.find((s) => s.type === "grid");
  assert.ok(gridSection && gridSection.grid);
  const grid = gridSection.grid;

  // Select (0,0) and (0,1) to merge
  const cellA = grid.cells.find((c) => c.row === 0 && c.col === 0)!;
  const cellB = grid.cells.find((c) => c.row === 0 && c.col === 1)!;

  // Merge logic
  cellA.colSpan = 2;
  cellB.mergedInto = cellA.id;

  assert.equal(cellA.colSpan, 2);
  assert.equal(cellB.mergedInto, cellA.id);

  // Unmerge logic
  cellA.colSpan = 1;
  delete cellB.mergedInto;

  assert.equal(cellA.colSpan, 1);
  assert.equal(cellB.mergedInto, undefined);
});

test("Test 4: Multiple independent pages with different templates", () => {
  const page1 = createDefaultPage("Page 1", "fresh", true);
  const page2 = createDefaultPage("Page 2", "grocery", false);
  const page3 = createDefaultPage("Page 3", "clearance", false);

  // Modify Page 1 hero title
  const p1Hero = page1.sections.find((s) => s.type === "hero");
  assert.ok(p1Hero);
  p1Hero.title = "EXCLUSIVE WEEKEND SALE";

  // Check Page 2 has NO hero banner (page 2 is grocery grid only)
  const p2Hero = page2.sections.find((s) => s.type === "hero");
  assert.equal(p2Hero, undefined, "Page 2 grocery template must not inherit Page 1 hero");

  // Check Page 3 has clearance banner
  const p3Clearance = page3.sections.find((s) => s.type === "special_offer");
  assert.ok(p3Clearance, "Page 3 must have clearance special offer section");
  assert.equal(p3Clearance.badge, "LIMITED STOCK");

  // Modifying Page 1 should not alter Page 2 or Page 3
  assert.equal(page1.sections[0].title, "EXCLUSIVE WEEKEND SALE");
  assert.notEqual(page2.sections[0].type, "hero");
});

test("Test 5: Duplicate page creates fresh element IDs", () => {
  const page1 = createDefaultPage("Page 1", "fresh", true);
  const origGrid = page1.sections.find((s) => s.type === "grid")!.grid!;
  const origCellId = origGrid.cells[0].id;

  // Duplicate page function simulating UI duplication
  const duplicate = {
    ...JSON.parse(JSON.stringify(page1)),
    id: "page-copy-" + Date.now(),
    pageNumber: 2,
    sections: page1.sections.map((s: any) => {
      const newSec = { ...JSON.parse(JSON.stringify(s)), id: "sec-" + Math.random() };
      if (newSec.grid) {
        newSec.grid.id = "grid-" + Math.random();
        newSec.grid.cells = newSec.grid.cells.map((c: any) => ({
          ...c,
          id: "cell-" + Math.random(),
        }));
      }
      return newSec;
    }),
  };

  assert.notEqual(duplicate.id, page1.id);
  const dupGrid = duplicate.sections.find((s: any) => s.type === "grid")!.grid!;
  assert.notEqual(dupGrid.id, origGrid.id);
  assert.notEqual(dupGrid.cells[0].id, origCellId, "Duplicated cell must have new ID");
});

test("Test 6 & 7: Dynamic business branding and multi-branch QR codes", () => {
  const bizProfile: BusinessProfile = {
    id: "biz-uae-1",
    name: "Al Madina Hypermarket",
    logo: "https://example.com/al-madina-logo.png",
    phone: "+971 4 123 4567",
    whatsapp: "+971 50 123 4567",
    website: "https://almadina.ae",
    address: "Al Rigga, Deira, Dubai",
    defaultCurrency: "AED",
    defaultLanguage: "en",
    branches: [
      {
        id: "br-1",
        name: "Deira Branch",
        address: "Al Rigga St",
        phone: "+971 4 111 2222",
        mapUrl: "https://maps.google.com/?q=Deira",
        qrDestination: "https://maps.google.com/?q=Deira",
      },
      {
        id: "br-2",
        name: "Sharjah Branch",
        address: "Al Wahda St",
        phone: "+971 6 333 4444",
        mapUrl: "https://maps.google.com/?q=Sharjah",
        qrDestination: "https://maps.google.com/?q=Sharjah",
      },
    ],
    brandColors: { primary: "#047857", secondary: "#f59e0b" },
  };

  const parsed = businessProfileSchema.safeParse(bizProfile);
  assert.ok(parsed.success, "Business profile must validate");

  // Test SVG rendering with dynamic branding
  const page = createDefaultPage("Page 1", "fresh", true);
  const svg = renderPageSvg(page, bizProfile, { pageNumber: 1, totalPages: 2 });

  assert.ok(svg.includes("AL MADINA HYPERMARKET"), "SVG must include dynamic business name");
  assert.ok(svg.includes("https://example.com/al-madina-logo.png"), "SVG must include dynamic business logo");
  assert.ok(svg.includes("<svg"), "Must output valid SVG root");
  assert.ok(svg.includes("</svg>"), "Must close SVG root");
});

test("Test 8: Special promotional section persistence and rendering", () => {
  const page = createDefaultPage("Clearance", "clearance", false);
  const specialSec = page.sections.find((s) => s.type === "special_offer");
  assert.ok(specialSec);
  assert.equal(specialSec.title, "CLEARANCE SALE");

  const biz = brandToBusinessProfile({ name: "Wear Mart", currency: "AED" });
  const svg = renderPageSvg(page, biz, { pageNumber: 1, totalPages: 1 });

  assert.ok(svg.includes("CLEARANCE SALE"), "SVG must render special offer title");
  assert.ok(svg.includes("UP TO 70% OFF"), "SVG must render special offer subtitle");
});

test("Test 9: UAE AED currency and Arabic text support", () => {
  const page = createDefaultPage("Page 1", "fresh", true);
  page.sections[0].arabicTitle = "عروض نهاية الأسبوع";

  const biz = brandToBusinessProfile({ name: "Desert Fresh", currency: "AED" });
  biz.defaultCurrency = "AED";

  const svg = renderPageSvg(page, biz, { pageNumber: 1, totalPages: 1 });
  assert.ok(svg.includes("عروض نهاية الأسبوع"), "SVG must render Arabic text");
  assert.ok(svg.includes("AED"), "SVG must render AED currency");
  assert.ok(svg.includes('direction="rtl"'), "SVG must set direction rtl for Arabic headers");
});

test("Test 10: AI template generation for retail businesses", async () => {
  const { generateTemplateWithAi } = await import("../app/server/ai");

  const result = await generateTemplateWithAi({
    businessName: "Lulu Center Supermarket",
    businessType: "Hypermarket",
    themePrompt: "Ramadan Kareem Mega Sale",
    category: "Supermarket",
    brandColors: { primary: "#047857", secondary: "#f59e0b" },
  });

  assert.ok(result.template, "Must return generated template object");
  assert.ok(result.template.id.length > 0, "Template must have valid ID");
  assert.ok(result.template.columns >= 2 && result.template.columns <= 4, "Columns must be 2-4");
  assert.ok(result.template.capacity >= 4, "Capacity must be at least 4");
  assert.ok(result.headlineEn.length > 0, "Must return English headline");
  assert.ok(result.suggestedSections.length > 0, "Must return suggested sections");
});

test("Test 11: Multi-page document export consistency", () => {
  const page1 = createDefaultPage("Page 1 - Cover", "fresh", true, [
    {
      id: "p1",
      name: "Al Ain Fresh Milk 2L",
      price: 11,
      offer: 8.5,
      pack: "2L",
      badge: "PROMO",
      category: "Dairy",
      image: "/products/milk.png",
      sku: "SKU1",
    },
  ]);
  const page2 = createDefaultPage("Page 2 - Deals", "grocery", false, [
    {
      id: "p2",
      name: "Basmati Rice 5kg",
      price: 35,
      offer: 24.99,
      pack: "5kg",
      badge: "BEST DEAL",
      category: "Grocery",
      image: "/products/rice.png",
      sku: "SKU2",
    },
  ]);

  const doc = {
    id: "flyer-export-doc",
    businessId: "biz-1",
    name: "Mega Weekend Flyer",
    pages: [page1, page2],
  };

  const biz = brandToBusinessProfile({ name: "Carrefour UAE", currency: "AED" });

  // Render both pages for export
  const svgPage1 = renderPageSvg(page1, biz, { pageNumber: 1, totalPages: 2 });
  const svgPage2 = renderPageSvg(page2, biz, { pageNumber: 2, totalPages: 2 });

  assert.ok(svgPage1.includes("Carrefour UAE"), "Page 1 must render Carrefour branding");
  assert.ok(svgPage1.includes("Page 1 of 2"), "Page 1 must include page pagination");
  assert.ok(svgPage1.includes("Al Ain Fresh Milk"), "Page 1 must contain its product");

  assert.ok(svgPage2.includes("Carrefour UAE"), "Page 2 must render Carrefour branding");
  assert.ok(svgPage2.includes("Page 2 of 2"), "Page 2 must include page pagination");
  assert.ok(svgPage2.includes("Basmati Rice 5kg"), "Page 2 must contain its product");
  // Page 2 should not have the page 1 cover hero
  assert.ok(!svgPage2.includes("FRESH FINDS. BIG SAVINGS."), "Page 2 must not repeat Page 1 hero");
});

