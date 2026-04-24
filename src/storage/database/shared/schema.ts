import { pgTable, serial, timestamp, varchar, boolean, text, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// Health check table (system table, keep as is)
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// Admin users table
export const adminUsers = pgTable(
	"admin_users",
	{
		id: serial().primaryKey(),
		username: varchar("username", { length: 64 }).notNull().unique(),
		passwordHash: varchar("password_hash", { length: 255 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		index("admin_users_username_idx").on(table.username)
	]
);

// API configurations table (stores per-user API keys and model settings)
export const apiConfigs = pgTable(
	"api_configs",
	{
		id: serial().primaryKey(),
		userId: varchar("user_id", { length: 64 }).notNull().unique(), // User identifier
		username: varchar("username", { length: 128 }).notNull(), // Display name
		apiKey: text("api_key").notNull(), // User's API key (encrypted in production)
		modelName: varchar("model_name", { length: 128 }).notNull().default('gemini-2.0-flash'), // Default model
		provider: varchar("provider", { length: 32 }).notNull().default('google'), // 'google', 'openai', etc.
		isActive: boolean("is_active").default(true).notNull(),
		usageCount: serial("usage_count").default(0), // Usage statistics
		createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		index("api_configs_user_id_idx").on(table.userId),
		index("api_configs_is_active_idx").on(table.isActive)
	]
);
