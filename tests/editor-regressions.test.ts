import test from "node:test";
import assert from "node:assert/strict";
import {createDefaultGrid, createDefaultPage, sampleProducts, defaultBrand} from "../app/model";
import {discountGrid, selectGridCells} from "../app/grid-operations";
import {renderPageSvg, renderProductCard, renderSvgText} from "../app/flyer-renderer";
const offers = sampleProducts.slice(0,6).map(p=>({...p,price:19.99,offer:17.99,badge:""}));
test("selection toggles, selects rectangular ranges, and ignores hidden cells",()=>{
 const grid=createDefaultGrid(2,3,offers);const ids=grid.cells.map(c=>c.id);
 assert.deepEqual(selectGridCells(grid,[ids[0]],ids[1],true),ids.slice(0,2));
 assert.deepEqual(selectGridCells(grid,ids.slice(0,2),ids[0],true),[ids[1]]);
 assert.deepEqual(selectGridCells(grid,[ids[0]],ids[4],false,true),[ids[0],ids[1],ids[3],ids[4]]);
 grid.cells[1].hidden=true;
 assert.deepEqual(selectGridCells(grid,[ids[0]],ids[1],true),[ids[0]]);
});
test("discounts round to cents, preserve regular prices, and never compound",()=>{
 const grid=createDefaultGrid(2,3,offers);const ids=[grid.cells[0].id,grid.cells[1].id];
 const changed=discountGrid(grid,ids,20);
 assert.equal(changed.cells[0].product?.offer,15.99);
 assert.equal(changed.cells[0].product?.price,19.99);
 assert.equal(changed.cells[2].product?.offer,17.99);
 assert.deepEqual(discountGrid(changed,ids,20),changed);
 assert.equal(discountGrid(changed,ids,100).cells[0].product?.offer,0);
 assert.equal(discountGrid(changed,ids,0).cells[0].product?.offer,19.99);
 assert.throws(()=>discountGrid(grid,ids,NaN));assert.throws(()=>discountGrid(grid,ids,-1));assert.throws(()=>discountGrid(grid,ids,101));
 assert.equal(grid.cells[0].product?.offer,17.99);
});
test("all selected cells highlight only in the selected grid and never in exports",()=>{
 const page=createDefaultPage("QA","fresh",true,offers);const grid=page.sections.find(s=>s.grid)!.grid!;
 const selected=grid.cells.slice(0,2).map(c=>c.id);
 const options={interactive:true,selectedCellIds:selected,selectedGridId:grid.id};
 assert.equal((renderPageSvg(page,defaultBrand,options).match(/stroke-width="2.5"/g)||[]).length,2);
 assert.equal((renderPageSvg(page,defaultBrand,{...options,selectedGridId:"another"}).match(/stroke-width="2.5"/g)||[]).length,0);
 assert.equal((renderPageSvg(page,defaultBrand).match(/data-cell-target/g)||[]).length,0);
});
test("dense bilingual cards have bounded text and separate price baselines",()=>{
 const svg=renderProductCard({offer:{...offers[0],name:"Extra long product name ".repeat(10),arabicName:"اسم المنتج طويل جدا",showOldPrice:true},x:0,y:0,width:110,height:90,currency:"AED",brandColor:"#166534",accentColor:"#f5d54b",images:{}});
 assert.ok(svg.includes("clip-path="));assert.ok(svg.includes("…"));assert.ok(!svg.includes("NaN"));
 const oldY=Number(svg.match(/<text[^>]*y="([\d.]+)"[^>]*text-decoration="line-through"/)?.[1]);
 const priceY=Number([...svg.matchAll(/<text[^>]*y="([\d.]+)"/g)].at(-1)?.[1]);
 assert.ok(priceY>oldY+8);
 assert.match(renderSvgText("اسم",100,20),/text-anchor="start"[^>]*direction="rtl"/);
});
