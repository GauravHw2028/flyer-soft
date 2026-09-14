import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const workspaces=sqliteTable('workspaces',{owner:text('owner').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(1),updated:text('updated').notNull()});
export const assets=sqliteTable('assets',{id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),mime:text('mime').notNull(),size:integer('size').notNull(),created:text('created').notNull()},t=>[index('idx_assets_owner').on(t.owner)]);
