import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  state: text('state').notNull(),
  version: integer('version').notNull().default(0),
});
export const deviceLinks = sqliteTable('device_links', {
  code: text('code').primaryKey(),
  profileId: text('profile_id').notNull(),
  expires: integer('expires').notNull(),
});
export const publicLinks = sqliteTable('public_links', {
  publicId: text('public_id').primaryKey(),
  profileId: text('profile_id').notNull().unique(),
  created: integer('created').notNull(),
});
