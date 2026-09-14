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
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull(),
  label: text('label').notNull().default(''),
  created: integer('created').notNull(),
  lastSeen: integer('last_seen').notNull(),
});
