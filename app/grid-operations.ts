import type { GridModel } from "./model";

export function selectGridCells(grid: GridModel, previous: string[], id: string, toggle = false, range = false): string[] {
  const cell = grid.cells.find(c => c.id === id && !c.hidden);
  if (!cell) return previous;
  const anchor = grid.cells.find(c => c.id === previous[0] && !c.hidden);
  if (range && anchor) {
    const top = Math.min(anchor.row, cell.row);
    const bottom = Math.max(anchor.row + anchor.rowSpan, cell.row + cell.rowSpan);
    const left = Math.min(anchor.col, cell.col);
    const right = Math.max(anchor.col + anchor.colSpan, cell.col + cell.colSpan);
    return grid.cells.filter(c => !c.hidden && c.row < bottom && c.row + c.rowSpan > top && c.col < right && c.col + c.colSpan > left).map(c => c.id);
  }
  return toggle ? previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id] : [id];
}

/** Always use the regular price so applying the same discount twice is safe. */
export function discountGrid(grid: GridModel, ids: string[], percent: number): GridModel {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error("Enter a discount from 0 to 100%.");
  return { ...grid, cells: grid.cells.map(cell => {
    if (cell.hidden || !ids.includes(cell.id) || cell.contentType !== "product" || !cell.product) return cell;
    const product = cell.product;
    return { ...cell, product: { ...product, offer: Math.round(product.price * (100 - percent)) / 100, showOldPrice: percent > 0, badge: percent > 0 ? `-${percent}%` : "" } };
  }) };
}
