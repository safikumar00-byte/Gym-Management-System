var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/app.ts
import express from "express";
import cors from "cors";

// src/routes/health.ts
import { Router } from "express";

// src/db/index.ts
import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  auditLogs: () => auditLogs,
  auditLogsRelations: () => auditLogsRelations,
  communityComments: () => communityComments,
  communityCommentsRelations: () => communityCommentsRelations,
  communityPosts: () => communityPosts,
  communityPostsRelations: () => communityPostsRelations,
  communityReactions: () => communityReactions,
  communityReactionsRelations: () => communityReactionsRelations,
  communityReports: () => communityReports,
  expenses: () => expenses,
  gymCounters: () => gymCounters,
  gyms: () => gyms,
  gymsRelations: () => gymsRelations,
  memberAttendance: () => memberAttendance,
  memberAttendanceRelations: () => memberAttendanceRelations,
  memberWorkouts: () => memberWorkouts,
  memberWorkoutsRelations: () => memberWorkoutsRelations,
  members: () => members,
  membersRelations: () => membersRelations,
  membershipPlans: () => membershipPlans,
  memberships: () => memberships,
  membershipsRelations: () => membershipsRelations,
  notifications: () => notifications,
  payments: () => payments,
  paymentsRelations: () => paymentsRelations,
  userProfiles: () => userProfiles,
  userProfilesRelations: () => userProfilesRelations
});
import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  uniqueIndex,
  index,
  serial
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
var gyms = pgTable("gyms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  upiId: text("upi_id"),
  gstNumber: text("gst_number"),
  currency: text("currency").default("INR").notNull(),
  timezone: text("timezone").default("Asia/Kolkata").notNull(),
  receiptPrefix: text("receipt_prefix").default("GM-").notNull(),
  receiptFooter: text("receipt_footer").default("Thank you for training with us! Fees once paid are non-refundable."),
  status: text("status").default("ACTIVE").notNull(),
  // ACTIVE, SUSPENDED, DEACTIVATED
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role").default("OWNER").notNull(),
  // OWNER, MANAGER, TRAINER
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("user_profiles_gym_id_idx").on(table.gymId),
  index("user_profiles_firebase_uid_idx").on(table.firebaseUid)
]);
var gymCounters = pgTable("gym_counters", {
  id: serial("id").primaryKey(),
  gymId: uuid("gym_id").notNull().unique().references(() => gyms.id, { onDelete: "cascade" }),
  memberSequence: integer("member_sequence").default(0).notNull(),
  receiptSequence: integer("receipt_sequence").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var membershipPlans = pgTable("membership_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  durationMonths: integer("duration_months").default(1).notNull(),
  durationDays: integer("duration_days").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("membership_plans_gym_id_idx").on(table.gymId)
]);
var members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => userProfiles.id, { onDelete: "set null" }),
  memberCode: text("member_code").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender").default("Prefer not to say"),
  address: text("address"),
  joinDate: date("join_date").notNull(),
  status: text("status").default("ACTIVE").notNull(),
  // ACTIVE, PAYMENT PENDING, EXPIRING SOON, EXPIRED, INACTIVE
  accountStatus: text("account_status").default("PENDING").notNull(),
  // PENDING, INVITED, ACTIVE, SUSPENDED
  invitationToken: text("invitation_token"),
  invitationExpiresAt: timestamp("invitation_expires_at", { withTimezone: true }),
  photoUrl: text("photo_url"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  uniqueIndex("gym_member_code_unique").on(table.gymId, table.memberCode),
  index("members_gym_id_idx").on(table.gymId),
  index("members_gym_phone_idx").on(table.gymId, table.phone),
  index("members_gym_code_idx").on(table.gymId, table.memberCode),
  index("members_user_id_idx").on(table.userId),
  index("members_invitation_token_idx").on(table.invitationToken)
]);
var memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => membershipPlans.id),
  planName: text("plan_name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalFee: numeric("total_fee", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).default("0").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  // finalAmount
  status: text("status").default("Active").notNull(),
  // Active, Expiring, Expired, Pending
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("memberships_gym_id_idx").on(table.gymId),
  index("memberships_member_id_idx").on(table.memberId),
  index("memberships_end_date_idx").on(table.gymId, table.endDate)
]);
var payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "restrict" }),
  memberName: text("member_name").notNull(),
  membershipId: uuid("membership_id").references(() => memberships.id, { onDelete: "set null" }),
  receiptNumber: text("receipt_number").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").default("Cash").notNull(),
  status: text("status").default("Paid").notNull(),
  // Paid, Partial, Pending, Refunded
  paymentDate: timestamp("payment_date", { withTimezone: true }).defaultNow().notNull(),
  idempotencyKey: text("idempotency_key"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  uniqueIndex("gym_receipt_unique").on(table.gymId, table.receiptNumber),
  uniqueIndex("gym_payment_idempotency_unique").on(table.gymId, table.idempotencyKey),
  index("payments_gym_id_idx").on(table.gymId),
  index("payments_member_id_idx").on(table.memberId),
  index("payments_date_idx").on(table.gymId, table.paymentDate)
]);
var expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  paymentMethod: text("payment_method").default("Cash").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("expenses_gym_id_idx").on(table.gymId),
  index("expenses_date_idx").on(table.gymId, table.expenseDate)
]);
var notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
  memberName: text("member_name"),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  date: date("date"),
  read: boolean("read").default(false).notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("notifications_gym_id_idx").on(table.gymId)
]);
var auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  userId: uuid("user_id"),
  action: text("action").notNull(),
  // USER_PROVISIONED, MEMBER_CREATED, MEMBER_DELETED, MEMBER_ARCHIVED, MEMBERSHIP_RENEWED, PAYMENT_CREATED, PAYMENT_REFUNDED, EXPENSE_CREATED, EXPENSE_DELETED, ROLE_CHANGED, GYM_STATUS_CHANGED, BACKUP_EXPORTED, POST_CREATED, POST_DELETED, ATTENDANCE_CHECKIN
  entityType: text("entity_type").notNull(),
  // USER, MEMBER, MEMBERSHIP, PAYMENT, EXPENSE, GYM, BACKUP, COMMUNITY_POST, ATTENDANCE
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("audit_logs_gym_id_idx").on(table.gymId),
  index("audit_logs_gym_created_idx").on(table.gymId, table.createdAt)
]);
var memberAttendance = pgTable("member_attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  checkInTime: timestamp("check_in_time", { withTimezone: true }).defaultNow().notNull(),
  checkOutTime: timestamp("check_out_time", { withTimezone: true }),
  checkInMethod: text("check_in_method").default("SELF").notNull(),
  // SELF, QR, MANUAL, KIOSK
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("member_attendance_gym_id_idx").on(table.gymId),
  index("member_attendance_member_id_idx").on(table.memberId),
  index("member_attendance_check_in_idx").on(table.gymId, table.checkInTime)
]);
var communityPosts = pgTable("community_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  authorMemberId: uuid("author_member_id").references(() => members.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").notNull(),
  // OWNER, MANAGER, TRAINER, MEMBER
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  postType: text("post_type").default("MEMBER_POST").notNull(),
  // MEMBER_POST, GYM_ANNOUNCEMENT, ACHIEVEMENT, CHALLENGE, EVENT
  isPinned: boolean("is_pinned").default(false).notNull(),
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
}, (table) => [
  index("community_posts_gym_id_idx").on(table.gymId),
  index("community_posts_created_idx").on(table.gymId, table.createdAt)
]);
var communityComments = pgTable("community_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  authorMemberId: uuid("author_member_id").references(() => members.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
}, (table) => [
  index("community_comments_post_id_idx").on(table.postId),
  index("community_comments_gym_id_idx").on(table.gymId)
]);
var communityReactions = pgTable("community_reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  reactionType: text("reaction_type").default("LIKE").notNull(),
  // LIKE, FIRE, CLAP, HEART
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  uniqueIndex("community_reaction_user_post_unique").on(table.postId, table.userId),
  index("community_reactions_post_id_idx").on(table.postId),
  index("community_reactions_gym_id_idx").on(table.gymId)
]);
var communityReports = pgTable("community_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  reportedByUserId: uuid("reported_by_user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status").default("PENDING").notNull(),
  // PENDING, RESOLVED, DISMISSED
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("community_reports_gym_id_idx").on(table.gymId)
]);
var memberWorkouts = pgTable("member_workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  scheduledDate: date("scheduled_date").notNull(),
  status: text("status").default("ASSIGNED").notNull(),
  // ASSIGNED, COMPLETED, SKIPPED
  exercises: text("exercises"),
  // JSON string of exercises
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("member_workouts_gym_id_idx").on(table.gymId),
  index("member_workouts_member_id_idx").on(table.memberId),
  index("member_workouts_date_idx").on(table.gymId, table.scheduledDate)
]);
var gymsRelations = relations(gyms, ({ many, one }) => ({
  userProfiles: many(userProfiles),
  members: many(members),
  plans: many(membershipPlans),
  memberships: many(memberships),
  payments: many(payments),
  expenses: many(expenses),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  communityPosts: many(communityPosts),
  attendance: many(memberAttendance),
  workouts: many(memberWorkouts),
  counters: one(gymCounters, {
    fields: [gyms.id],
    references: [gymCounters.gymId]
  })
}));
var auditLogsRelations = relations(auditLogs, ({ one }) => ({
  gym: one(gyms, {
    fields: [auditLogs.gymId],
    references: [gyms.id]
  })
}));
var userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  gym: one(gyms, {
    fields: [userProfiles.gymId],
    references: [gyms.id]
  }),
  member: one(members, {
    fields: [userProfiles.id],
    references: [members.userId]
  }),
  communityPosts: many(communityPosts),
  communityComments: many(communityComments),
  communityReactions: many(communityReactions)
}));
var membersRelations = relations(members, ({ one, many }) => ({
  gym: one(gyms, {
    fields: [members.gymId],
    references: [gyms.id]
  }),
  userProfile: one(userProfiles, {
    fields: [members.userId],
    references: [userProfiles.id]
  }),
  memberships: many(memberships),
  payments: many(payments),
  attendance: many(memberAttendance),
  workouts: many(memberWorkouts)
}));
var memberAttendanceRelations = relations(memberAttendance, ({ one }) => ({
  gym: one(gyms, {
    fields: [memberAttendance.gymId],
    references: [gyms.id]
  }),
  member: one(members, {
    fields: [memberAttendance.memberId],
    references: [members.id]
  })
}));
var communityPostsRelations = relations(communityPosts, ({ one, many }) => ({
  gym: one(gyms, {
    fields: [communityPosts.gymId],
    references: [gyms.id]
  }),
  authorUser: one(userProfiles, {
    fields: [communityPosts.authorUserId],
    references: [userProfiles.id]
  }),
  authorMember: one(members, {
    fields: [communityPosts.authorMemberId],
    references: [members.id]
  }),
  comments: many(communityComments),
  reactions: many(communityReactions)
}));
var communityCommentsRelations = relations(communityComments, ({ one }) => ({
  post: one(communityPosts, {
    fields: [communityComments.postId],
    references: [communityPosts.id]
  }),
  gym: one(gyms, {
    fields: [communityComments.gymId],
    references: [gyms.id]
  }),
  authorUser: one(userProfiles, {
    fields: [communityComments.authorUserId],
    references: [userProfiles.id]
  }),
  authorMember: one(members, {
    fields: [communityComments.authorMemberId],
    references: [members.id]
  })
}));
var communityReactionsRelations = relations(communityReactions, ({ one }) => ({
  post: one(communityPosts, {
    fields: [communityReactions.postId],
    references: [communityPosts.id]
  }),
  gym: one(gyms, {
    fields: [communityReactions.gymId],
    references: [gyms.id]
  }),
  user: one(userProfiles, {
    fields: [communityReactions.userId],
    references: [userProfiles.id]
  })
}));
var memberWorkoutsRelations = relations(memberWorkouts, ({ one }) => ({
  gym: one(gyms, {
    fields: [memberWorkouts.gymId],
    references: [gyms.id]
  }),
  member: one(members, {
    fields: [memberWorkouts.memberId],
    references: [members.id]
  })
}));
var membershipsRelations = relations(memberships, ({ one, many }) => ({
  gym: one(gyms, {
    fields: [memberships.gymId],
    references: [gyms.id]
  }),
  member: one(members, {
    fields: [memberships.memberId],
    references: [members.id]
  }),
  plan: one(membershipPlans, {
    fields: [memberships.planId],
    references: [membershipPlans.id]
  }),
  payments: many(payments)
}));
var paymentsRelations = relations(payments, ({ one }) => ({
  gym: one(gyms, {
    fields: [payments.gymId],
    references: [gyms.id]
  }),
  member: one(members, {
    fields: [payments.memberId],
    references: [members.id]
  }),
  membership: one(memberships, {
    fields: [payments.membershipId],
    references: [memberships.id]
  })
}));

// src/db/index.ts
import * as fs from "fs";
import * as path from "path";
dotenv.config();
var { Pool } = pg;
function getDatabaseConfigSummary() {
  let host = process.env.SQL_HOST || "127.0.0.1";
  let port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;
  let user = process.env.SQL_USER || process.env.SQL_ADMIN_USER || "postgres";
  let database = process.env.SQL_DB_NAME || "postgres";
  const hasPassword = Boolean(process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.DATABASE_URL);
  const ssl = process.env.SQL_SSL === "true" || (process.env.DATABASE_URL?.includes("sslmode=") ?? false);
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      host = parsed.hostname || host;
      port = parsed.port ? parseInt(parsed.port, 10) : port;
      user = decodeURIComponent(parsed.username || user);
      database = parsed.pathname ? parsed.pathname.replace(/^\//, "") : database;
    } catch (_) {
    }
  }
  const mode = process.env.DATABASE_MODE || (host.includes("pooler.supabase.com") ? "supabase-pooler" : host.includes("supabase.co") ? "supabase-direct" : "direct");
  return {
    host,
    port,
    database,
    user,
    mode,
    ssl,
    hasPassword,
    hasDatabaseUrl
  };
}
function formatDatabaseError(err) {
  const summary = getDatabaseConfigSummary();
  const code = err?.code || err?.cause?.code || "UNKNOWN";
  const rawMessage = err?.message || String(err);
  let guidance = "Verify your database configuration in .env and ensure PostgreSQL is accessible.";
  if (code === "ECONNREFUSED" || rawMessage.includes("ECONNREFUSED")) {
    guidance = `PostgreSQL is not listening at ${summary.host}:${summary.port}.
  \u2022 If using Supabase:
      Verify DATABASE_URL in .env (Direct: db.<project-ref>.supabase.co:5432 or Pooler: aws-0-<region>.pooler.supabase.com:5432).
  \u2022 If using Cloud SQL Auth Proxy (Rollback/Legacy):
      Start proxy in another terminal: cloud-sql-proxy <INSTANCE_CONNECTION_NAME> --port ${summary.port}
  \u2022 If using local PostgreSQL:
      Start local PostgreSQL service or Docker: docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=${summary.database} postgres:16-alpine`;
  } else if (code === "28P01" || rawMessage.includes("password authentication failed")) {
    guidance = `Authentication failed for user '${summary.user}'. Check your database password in DATABASE_URL or SQL_PASSWORD in .env.`;
  } else if (code === "3D000" || rawMessage.includes("does not exist")) {
    guidance = `Database '${summary.database}' does not exist on ${summary.host}:${summary.port}. Default Supabase database is 'postgres'.`;
  } else if (code === "42P01" || rawMessage.includes("relation") && rawMessage.includes("does not exist")) {
    guidance = `Database tables are missing. Apply migrations using: npm run db:migrate`;
  } else if (code === "ETIMEDOUT" || code === "ENOTFOUND") {
    guidance = `Cannot reach database host '${summary.host}'. Check host name, DNS resolution (IPv4/IPv6), and firewall settings.`;
  }
  return {
    code,
    message: rawMessage,
    guidance
  };
}
function getSslConfig() {
  const caPath = process.env.DATABASE_CA_CERT_PATH || path.join(process.cwd(), "certs", "supabase-ca.crt");
  const caCert = process.env.DATABASE_CA_CERT || (fs.existsSync(caPath) ? fs.readFileSync(caPath, "utf8") : void 0);
  if (caCert) {
    return { rejectUnauthorized: true, ca: caCert };
  }
  const sslEnabled = process.env.SQL_SSL === "true" || (process.env.DATABASE_URL?.includes("sslmode=") ?? false);
  if (sslEnabled) {
    return { rejectUnauthorized: false };
  }
  return false;
}
var createPool = () => {
  if (!global._postgresPool) {
    const summary = getDatabaseConfigSummary();
    const sslConfig = getSslConfig();
    const rawUrl = process.env.DATABASE_URL;
    const cleanUrl = rawUrl ? rawUrl.replace(/[\?&]sslmode=[^&]+/, "") : void 0;
    const poolConfig = cleanUrl ? {
      connectionString: cleanUrl,
      ssl: sslConfig,
      max: parseInt(process.env.SQL_MAX_CONNECTIONS || "10", 10),
      connectionTimeoutMillis: 1e4,
      idleTimeoutMillis: 3e4
    } : {
      host: summary.host,
      port: summary.port,
      user: summary.user,
      password: process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || "",
      database: summary.database,
      ssl: sslConfig,
      max: parseInt(process.env.SQL_MAX_CONNECTIONS || "10", 10),
      connectionTimeoutMillis: 1e4,
      idleTimeoutMillis: 3e4
    };
    global._postgresPool = new Pool(poolConfig);
    global._postgresPool.on("error", (err) => {
      console.error("[DB Pool] Unexpected error on idle SQL pool client:", err.message || err);
    });
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });
async function checkDatabaseConnection() {
  const summary = getDatabaseConfigSummary();
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1 AS health_check;");
      const latencyMs = Date.now() - start;
      return { ok: true, latencyMs, summary };
    } finally {
      client.release();
    }
  } catch (err) {
    const formatted = formatDatabaseError(err);
    return { ok: false, summary, error: formatted };
  }
}

// src/routes/health.ts
var router = Router();
router.get(["/health", "/api/health"], (req, res) => {
  res.json({
    status: "ok",
    service: "gym-manager-saas",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router.get(["/health/db", "/api/health/db"], async (req, res) => {
  const result = await checkDatabaseConnection();
  if (result.ok) {
    res.status(200).json({
      status: "ok",
      database: "connected",
      latencyMs: result.latencyMs,
      config: {
        host: result.summary.host,
        port: result.summary.port,
        database: result.summary.database,
        mode: result.summary.mode,
        ssl: result.summary.ssl
      }
    });
  } else {
    res.status(503).json({
      status: "error",
      database: "unavailable",
      code: result.error?.code || "DB_UNREACHABLE",
      error: result.error?.message || "Database connection failed",
      guidance: result.error?.guidance || "Check database configuration and proxy status.",
      config: {
        host: result.summary.host,
        port: result.summary.port,
        database: result.summary.database,
        mode: result.summary.mode
      }
    });
  }
});
var health_default = router;

// src/routes/auth.ts
import { Router as Router2 } from "express";

// src/lib/firebase-admin.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs2 from "fs";
import path2 from "path";
function getProjectId() {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  if (process.env.VITE_FIREBASE_PROJECT_ID) return process.env.VITE_FIREBASE_PROJECT_ID;
  try {
    const configPath = path2.join(process.cwd(), "firebase-applet-config.json");
    if (fs2.existsSync(configPath)) {
      const parsed = JSON.parse(fs2.readFileSync(configPath, "utf8"));
      if (parsed?.projectId) return parsed.projectId;
    }
  } catch (_) {
  }
  return "sage-passkey-8q7jp";
}
if (!getApps().length) {
  initializeApp({
    projectId: getProjectId()
  });
}
var adminAuth = getAuth();

// src/middleware/auth.ts
import { eq as eq2, and as and2, ne } from "drizzle-orm";

// src/lib/audit.ts
async function logAuditEvent({
  gymId,
  userId,
  action,
  entityType,
  entityId,
  details,
  tx
}) {
  try {
    const executor = tx || db;
    await executor.insert(auditLogs).values({
      gymId,
      userId: userId || null,
      action,
      entityType,
      entityId: entityId || null,
      details: details ? details.substring(0, 500) : null
    });
  } catch (error) {
    console.error(`[AUDIT ERROR] Failed to record audit log (${action}):`, error);
  }
}

// src/lib/demo-member.ts
import { eq } from "drizzle-orm";
var DEMO_GYM_ID = "00000000-0000-0000-0000-000000000001";
var DEMO_USER_ID = "00000000-0000-0000-0000-000000000002";
var DEMO_MEMBER_ID = "00000000-0000-0000-0000-000000000003";
var DEMO_PLAN_ID = "00000000-0000-0000-0000-000000000004";
var DEMO_MEMBERSHIP_ID = "00000000-0000-0000-0000-000000000005";
var DEMO_PAYMENT_ID = "00000000-0000-0000-0000-000000000006";
var DEMO_STAFF_USER_ID = "00000000-0000-0000-0000-000000000007";
var DEMO_MEMBER_2_USER_ID = "00000000-0000-0000-0000-000000000008";
async function seedOrResetDemoMember() {
  console.log("[Demo] Seeding or resetting isolated Demo Member tenant data...");
  return await db.transaction(async (tx) => {
    await tx.delete(memberAttendance).where(eq(memberAttendance.gymId, DEMO_GYM_ID));
    await tx.delete(memberWorkouts).where(eq(memberWorkouts.gymId, DEMO_GYM_ID));
    await tx.delete(communityReactions).where(eq(communityReactions.gymId, DEMO_GYM_ID));
    await tx.delete(communityComments).where(eq(communityComments.gymId, DEMO_GYM_ID));
    await tx.delete(communityPosts).where(eq(communityPosts.gymId, DEMO_GYM_ID));
    await tx.delete(payments).where(eq(payments.gymId, DEMO_GYM_ID));
    await tx.delete(memberships).where(eq(memberships.gymId, DEMO_GYM_ID));
    await tx.delete(notifications).where(eq(notifications.gymId, DEMO_GYM_ID));
    await tx.delete(members).where(eq(members.gymId, DEMO_GYM_ID));
    await tx.delete(userProfiles).where(eq(userProfiles.gymId, DEMO_GYM_ID));
    await tx.delete(membershipPlans).where(eq(membershipPlans.gymId, DEMO_GYM_ID));
    await tx.delete(gymCounters).where(eq(gymCounters.gymId, DEMO_GYM_ID));
    await tx.delete(gyms).where(eq(gyms.id, DEMO_GYM_ID));
    const [demoGym] = await tx.insert(gyms).values({
      id: DEMO_GYM_ID,
      name: "Raw Power Gym \u2014 Demo",
      phone: "+91 98111 00000",
      email: "demo@rawpowergym.app",
      address: "4th Floor, Platinum Towers, MG Road, Bengaluru",
      upiId: "rawpowerdemo@upi",
      currency: "INR",
      timezone: "Asia/Kolkata",
      receiptPrefix: "RPM-",
      receiptFooter: "Thank you for training with us at Raw Power Gym \u2014 Demo! Keep pushing limits.",
      status: "ACTIVE"
    }).returning();
    await tx.insert(gymCounters).values({
      gymId: DEMO_GYM_ID,
      memberSequence: 20,
      receiptSequence: 9020
    });
    const [demoPlan] = await tx.insert(membershipPlans).values({
      id: DEMO_PLAN_ID,
      gymId: DEMO_GYM_ID,
      name: "Premium Annual Pass",
      durationMonths: 12,
      durationDays: 365,
      price: "18000.00",
      description: "All-inclusive annual membership: 24/7 gym access, recovery zone, cardio theater & mobility workshops.",
      active: true
    }).returning();
    const [staffUser] = await tx.insert(userProfiles).values({
      id: DEMO_STAFF_USER_ID,
      firebaseUid: "uid-demo-trainer-vikram",
      gymId: DEMO_GYM_ID,
      name: "Coach Vikram (Head Trainer)",
      email: "vikram.coach@rawpowergym.app",
      role: "TRAINER"
    }).returning();
    const [peerUser] = await tx.insert(userProfiles).values({
      id: DEMO_MEMBER_2_USER_ID,
      firebaseUid: "uid-demo-member-priya",
      gymId: DEMO_GYM_ID,
      name: "Priya Sharma",
      email: "priya.s@demo.rawpowergym.app",
      role: "MEMBER"
    }).returning();
    const [demoUser] = await tx.insert(userProfiles).values({
      id: DEMO_USER_ID,
      firebaseUid: "uid-demo-member-alex",
      gymId: DEMO_GYM_ID,
      name: "Alex Johnson",
      email: "demo-member@demo.rawpowergym.app",
      role: "MEMBER"
    }).returning();
    const [demoMember] = await tx.insert(members).values({
      id: DEMO_MEMBER_ID,
      gymId: DEMO_GYM_ID,
      userId: DEMO_USER_ID,
      memberCode: "RPM-DEMO-001",
      name: "Alex Johnson",
      phone: "+91 98111 22334",
      email: "demo-member@demo.rawpowergym.app",
      dateOfBirth: "1996-05-14",
      gender: "Male",
      address: "Flat 402, Highrise Heights, Sector 18, Bengaluru",
      emergencyContactName: "Sarah Johnson",
      emergencyContactPhone: "+91 98111 55667",
      joinDate: "2025-06-15",
      status: "Active",
      accountStatus: "ACTIVE",
      notes: "Fitness Focus: Hypertrophy & Deadlift Strength (Current PR: 180kg)"
    }).returning();
    const startDate = /* @__PURE__ */ new Date();
    startDate.setDate(startDate.getDate() - 290);
    const endDate = /* @__PURE__ */ new Date();
    endDate.setDate(endDate.getDate() + 75);
    const [demoMembership] = await tx.insert(memberships).values({
      id: DEMO_MEMBERSHIP_ID,
      gymId: DEMO_GYM_ID,
      memberId: DEMO_MEMBER_ID,
      planId: DEMO_PLAN_ID,
      planName: "Premium Annual Pass",
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      totalFee: "18000.00",
      discount: "0.00",
      price: "18000.00",
      status: "Active"
    }).returning();
    const prevStart = /* @__PURE__ */ new Date();
    prevStart.setDate(prevStart.getDate() - 380);
    const prevEnd = /* @__PURE__ */ new Date();
    prevEnd.setDate(prevEnd.getDate() - 290);
    const DEMO_PREV_MS_ID = "00000000-0000-0000-0000-000000000009";
    const DEMO_PREV_PAY_ID = "00000000-0000-0000-0000-000000000010";
    await tx.insert(memberships).values({
      id: DEMO_PREV_MS_ID,
      gymId: DEMO_GYM_ID,
      memberId: DEMO_MEMBER_ID,
      planId: DEMO_PLAN_ID,
      planName: "3 Months Starter Pass",
      startDate: prevStart.toISOString().split("T")[0],
      endDate: prevEnd.toISOString().split("T")[0],
      totalFee: "5500.00",
      discount: "0.00",
      price: "5500.00",
      status: "Expired"
    });
    const recentPayDate = /* @__PURE__ */ new Date();
    recentPayDate.setDate(recentPayDate.getDate() - 15);
    await tx.insert(payments).values([
      {
        id: DEMO_PAYMENT_ID,
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        memberName: "Alex Johnson",
        membershipId: DEMO_MEMBERSHIP_ID,
        receiptNumber: "RPM-REC-9012",
        amount: "18000.00",
        paymentMethod: "UPI",
        status: "Paid",
        paymentDate: recentPayDate,
        notes: "Annual membership renewal paid via Google Pay UPI. Transaction verified."
      },
      {
        id: DEMO_PREV_PAY_ID,
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        memberName: "Alex Johnson",
        membershipId: DEMO_PREV_MS_ID,
        receiptNumber: "RPM-REC-8901",
        amount: "5500.00",
        paymentMethod: "UPI",
        status: "Paid",
        paymentDate: prevStart,
        notes: "Introductory 3-month gym membership fee paid via UPI."
      }
    ]);
    const attendanceTimes = [
      { daysAgo: 1, hour: 7, min: 45, method: "SELF", notes: "Morning session" },
      { daysAgo: 2, hour: 8, min: 10, method: "QR" },
      { daysAgo: 3, hour: 7, min: 30, method: "QR" },
      { daysAgo: 4, hour: 18, min: 15, method: "QR" },
      { daysAgo: 5, hour: 8, min: 0, method: "QR" },
      { daysAgo: 7, hour: 7, min: 50, method: "QR" },
      { daysAgo: 8, hour: 8, min: 20, method: "QR" },
      { daysAgo: 10, hour: 7, min: 40, method: "QR" },
      { daysAgo: 12, hour: 8, min: 15, method: "QR" },
      { daysAgo: 14, hour: 7, min: 30, method: "QR" },
      { daysAgo: 16, hour: 8, min: 5, method: "QR" },
      { daysAgo: 17, hour: 7, min: 55, method: "QR" },
      { daysAgo: 19, hour: 18, min: 30, method: "QR" },
      { daysAgo: 21, hour: 8, min: 0, method: "QR" },
      { daysAgo: 23, hour: 7, min: 40, method: "QR" },
      { daysAgo: 25, hour: 8, min: 10, method: "QR" }
    ];
    for (let d = 27; d <= 285; d += 2) {
      if (d % 7 === 0) continue;
      attendanceTimes.push({
        daysAgo: d,
        hour: d % 2 === 0 ? 7 : 18,
        min: d * 7 % 50,
        method: d % 3 === 0 ? "SELF" : "QR",
        notes: null
      });
    }
    const attendanceInserts = attendanceTimes.map((item) => {
      const dt = /* @__PURE__ */ new Date();
      dt.setDate(dt.getDate() - item.daysAgo);
      dt.setHours(item.hour, item.min, 0, 0);
      return {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        checkInTime: dt,
        checkInMethod: item.method || "QR",
        notes: item.notes || null
      };
    });
    await tx.insert(memberAttendance).values(attendanceInserts);
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const yesterdayDate = /* @__PURE__ */ new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];
    const threeDaysAgo = /* @__PURE__ */ new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split("T")[0];
    const fiveDaysAgo = /* @__PURE__ */ new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const fiveDaysAgoStr = fiveDaysAgo.toISOString().split("T")[0];
    const tomorrowDate = /* @__PURE__ */ new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split("T")[0];
    await tx.insert(memberWorkouts).values([
      // Today's workout (Assigned)
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        title: "Chest & Hypertrophy Conditioning",
        description: "Focus on high-tension hypertrophy, controlled eccentrics, and strict core bracing.",
        scheduledDate: todayStr,
        status: "ASSIGNED",
        exercises: JSON.stringify([
          { name: "Warm-up: Dynamic Stretch & Jump Rope", sets: "3", reps: "2 min", completed: true },
          { name: "Barbell Flat Bench Press", sets: "4", reps: "8-10", weight: "75 kg", completed: false },
          { name: "Incline Dumbbell Press", sets: "3", reps: "12", weight: "24 kg", completed: false },
          { name: "Cable Chest Flyes (Low-to-High)", sets: "3", reps: "15", weight: "14 kg", completed: false },
          { name: "Dips (Weighted)", sets: "3", reps: "10", weight: "+10 kg", completed: false },
          { name: "Hanging Knee Tucks", sets: "3", reps: "15", completed: false }
        ]),
        notes: "Coach Vikram: Rest 90 seconds between heavy bench sets. Maintain retract-and-depress scapula position."
      },
      // Yesterday's completed workout
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        title: "Full Body Conditioning & Core",
        description: "High-density strength workout focusing on compound lifts and core endurance.",
        scheduledDate: yesterdayStr,
        status: "COMPLETED",
        exercises: JSON.stringify([
          { name: "Warm-up: Dynamic Mobility & Band Pull-Aparts", sets: "3", reps: "10", completed: true },
          { name: "Barbell Flat Bench Press", sets: "4", reps: "8", weight: "95 kg", completed: true },
          { name: "Incline Dumbbell Press", sets: "3", reps: "10", weight: "26 kg", completed: true },
          { name: "Standing Overhead Barbell Press", sets: "3", reps: "8", weight: "55 kg", completed: true },
          { name: "Plank Hold (Weighted)", sets: "3", reps: "60 sec", weight: "+15 kg", completed: true }
        ]),
        notes: "Felt great! Bench press 95kg PR hit smoothly with solid leg drive."
      },
      // 3 days ago: Back & Biceps PR Day (Completed)
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        title: "Back, Biceps & Pull Strength",
        description: "Heavy posterior chain pull routine with high-volume lat hypertrophy.",
        scheduledDate: threeDaysAgoStr,
        status: "COMPLETED",
        exercises: JSON.stringify([
          { name: "Deadlift (Conventional)", sets: "5", reps: "5", weight: "180 kg", completed: true },
          { name: "Barbell Bent-Over Row", sets: "4", reps: "8", weight: "75 kg", completed: true },
          { name: "Wide Grip Lat Pulldown", sets: "4", reps: "12", weight: "65 kg", completed: true },
          { name: "Incline Dumbbell Bicep Curls", sets: "3", reps: "12", weight: "16 kg", completed: true }
        ]),
        notes: "Deadlift locked out solid at 180kg without belt slip. Excellent speed off the floor."
      },
      // 5 days ago: Leg Day (Completed)
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        title: "Leg Day & Explosive Power",
        description: "Quad and hamstring hypertrophy with eccentric deceleration control.",
        scheduledDate: fiveDaysAgoStr,
        status: "COMPLETED",
        exercises: JSON.stringify([
          { name: "Barbell Back Squat", sets: "4", reps: "8", weight: "120 kg", completed: true },
          { name: "Romanian Deadlift", sets: "4", reps: "10", weight: "90 kg", completed: true },
          { name: "Leg Press (Plate Loaded)", sets: "3", reps: "15", weight: "220 kg", completed: true },
          { name: "Seated Calf Raises", sets: "4", reps: "20", weight: "50 kg", completed: true }
        ]),
        notes: "Deep squat depth achieved on all sets. Hydrated well."
      },
      // Upcoming tomorrow (Assigned)
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        title: "Mobility & Active Recovery Flow",
        description: "Hip openers, thoracic spine rotations, and light treadmill flush.",
        scheduledDate: tomorrowStr,
        status: "ASSIGNED",
        exercises: JSON.stringify([
          { name: "Foam Rolling (Quads, Lats, Calves)", sets: "1", reps: "10 min", completed: false },
          { name: "World Greatest Stretch", sets: "3", reps: "8 / side", completed: false },
          { name: "Light Incline Treadmill Walk", sets: "1", reps: "20 min", completed: false }
        ]),
        notes: "Focus on full lung capacity breathing and tissue relaxation."
      }
    ]);
    const [post1] = await tx.insert(communityPosts).values({
      gymId: DEMO_GYM_ID,
      authorUserId: DEMO_STAFF_USER_ID,
      authorName: "Coach Vikram (Head Trainer)",
      authorRole: "TRAINER",
      content: "\u{1F525} 30-Day Consistency Challenge kicks off Monday! Check in daily on the Member App to climb the gym leaderboard and earn exclusive Raw Power athletic gear. Let\u2019s make every workout count!",
      postType: "GYM_ANNOUNCEMENT",
      isPinned: true,
      likesCount: 6,
      commentsCount: 2
    }).returning();
    await tx.insert(communityComments).values([
      {
        gymId: DEMO_GYM_ID,
        postId: post1.id,
        authorUserId: DEMO_MEMBER_2_USER_ID,
        authorName: "Priya Sharma",
        content: "Ready for this challenge! Count me in \u{1F4A5}"
      },
      {
        gymId: DEMO_GYM_ID,
        postId: post1.id,
        authorUserId: DEMO_USER_ID,
        authorName: "Alex Johnson",
        content: "Streak is already at 5 days. Bringing my A-game!"
      }
    ]);
    const [post2] = await tx.insert(communityPosts).values({
      gymId: DEMO_GYM_ID,
      authorUserId: DEMO_USER_ID,
      authorMemberId: DEMO_MEMBER_ID,
      authorName: "Alex Johnson",
      authorRole: "MEMBER",
      content: "Hit a new personal record on Bench Press today: 95kg for 3 clean reps! Big shoutout to Coach Vikram for the bar-path cue. Consistency and nutrition are finally compounding \u{1F4AA}\u{1F3CB}\uFE0F\u200D\u2642\uFE0F",
      postType: "ACHIEVEMENT",
      isPinned: false,
      likesCount: 8,
      commentsCount: 2
    }).returning();
    await tx.insert(communityReactions).values({
      gymId: DEMO_GYM_ID,
      postId: post2.id,
      userId: DEMO_USER_ID,
      reactionType: "LIKE"
    });
    await tx.insert(communityComments).values([
      {
        gymId: DEMO_GYM_ID,
        postId: post2.id,
        authorUserId: DEMO_STAFF_USER_ID,
        authorName: "Coach Vikram (Head Trainer)",
        content: "Phenomenal bar path Alex! 100kg is right around the corner next month."
      },
      {
        gymId: DEMO_GYM_ID,
        postId: post2.id,
        authorUserId: DEMO_MEMBER_2_USER_ID,
        authorName: "Priya Sharma",
        content: "Insane progress! Super inspiring \u{1F525}"
      }
    ]);
    const [post3] = await tx.insert(communityPosts).values({
      gymId: DEMO_GYM_ID,
      authorUserId: DEMO_MEMBER_2_USER_ID,
      authorName: "Priya Sharma",
      authorRole: "MEMBER",
      content: "Early morning spin and core circuit done! 500 kcal burned before 7:30 AM \u{1F6B4}\u200D\u2640\uFE0F Who else trained today?",
      postType: "MEMBER_POST",
      isPinned: false,
      likesCount: 4,
      commentsCount: 1
    }).returning();
    await tx.insert(communityComments).values({
      gymId: DEMO_GYM_ID,
      postId: post3.id,
      authorUserId: DEMO_USER_ID,
      authorName: "Alex Johnson",
      content: "Crushing it Priya! Hitting the weights this afternoon."
    });
    await tx.insert(notifications).values([
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        memberName: "Alex Johnson",
        type: "MEMBERSHIP_ACTIVE",
        title: "Membership Active",
        message: "Your Premium Annual Pass is active with 75 days remaining. Enjoy full facility access.",
        read: false
      },
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        memberName: "Alex Johnson",
        type: "WORKOUT_ASSIGNED",
        title: "New Workout Assigned",
        message: "Coach Vikram assigned today\u2019s routine: Chest & Hypertrophy Conditioning.",
        read: true
      },
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        memberName: "Alex Johnson",
        type: "COMMUNITY_INTERACTION",
        title: "Community Interaction",
        message: 'Coach Vikram commented on your PR post: "Phenomenal bar path Alex!"',
        read: true
      }
    ]);
    await logAuditEvent({
      gymId: DEMO_GYM_ID,
      userId: DEMO_USER_ID,
      action: "DEMO_MEMBER_SEEDED",
      entityType: "MEMBER",
      entityId: DEMO_MEMBER_ID,
      details: "Demo member Alex Johnson (RPM-DEMO-001) seeded with rich isolated state.",
      tx
    });
    console.log("[Demo] Seeding complete successfully.");
    return {
      gym: demoGym,
      user: demoUser,
      member: demoMember,
      membership: demoMembership
    };
  });
}

// src/middleware/auth.ts
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing or malformed authorization token" } });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    let decodedToken;
    if (token === "test-token-demo-member" || token.includes("demo-member")) {
      decodedToken = {
        uid: "uid-demo-member-alex",
        email: "demo-member@demo.rawpowergym.app",
        name: "Alex Johnson",
        auth_time: Math.floor(Date.now() / 1e3),
        iss: "https://securetoken.google.com/test",
        sub: "uid-demo-member-alex",
        aud: "test",
        iat: Math.floor(Date.now() / 1e3),
        exp: Math.floor(Date.now() / 1e3) + 3600 * 24,
        firebase: { identities: {}, sign_in_provider: "custom" }
      };
    } else if (process.env.NODE_ENV !== "production" && token.startsWith("test-token-")) {
      const isMember = token.includes("member");
      const isManager = token.includes("manager");
      const isTrainer = token.includes("trainer");
      const role = isMember ? "MEMBER" : isManager ? "MANAGER" : isTrainer ? "TRAINER" : "OWNER";
      const uid = `uid-${token}`;
      let email = isMember ? "member@testgym.com" : `${role.toLowerCase()}@testgym.com`;
      let name = isMember ? "Aditya Verma (Member)" : `Test ${role}`;
      if (token.includes("rohit")) {
        email = "rohit.sharma@testlifecycle.com";
        name = "Rohit Sharma";
      }
      decodedToken = {
        uid,
        email,
        name,
        auth_time: Math.floor(Date.now() / 1e3),
        iss: "https://securetoken.google.com/test",
        sub: uid,
        aud: "test",
        iat: Math.floor(Date.now() / 1e3),
        exp: Math.floor(Date.now() / 1e3) + 3600,
        firebase: { identities: {}, sign_in_provider: "custom" }
      };
    } else {
      decodedToken = await adminAuth.verifyIdToken(token);
    }
    req.decodedToken = decodedToken;
    if (decodedToken.uid === "uid-demo-member-alex") {
      let demoProfile = await db.query.userProfiles.findFirst({
        where: eq2(userProfiles.firebaseUid, "uid-demo-member-alex"),
        with: { gym: true }
      });
      if (!demoProfile) {
        await seedOrResetDemoMember();
        demoProfile = await db.query.userProfiles.findFirst({
          where: eq2(userProfiles.firebaseUid, "uid-demo-member-alex"),
          with: { gym: true }
        });
      }
      req.user = {
        firebaseUid: decodedToken.uid,
        userId: demoProfile.id,
        gymId: demoProfile.gymId,
        role: "MEMBER",
        name: demoProfile.name,
        email: demoProfile.email,
        gymStatus: "ACTIVE",
        memberId: DEMO_MEMBER_ID
      };
      return next();
    }
    let profile = await db.query.userProfiles.findFirst({
      where: eq2(userProfiles.firebaseUid, decodedToken.uid),
      with: {
        gym: true
      }
    });
    if (!profile) {
      try {
        profile = await db.transaction(async (tx) => {
          const existingInTx = await tx.query.userProfiles.findFirst({
            where: eq2(userProfiles.firebaseUid, decodedToken.uid),
            with: { gym: true }
          });
          if (existingInTx) return existingInTx;
          const isMember = decodedToken.uid.includes("member");
          const isManager = decodedToken.uid.includes("manager");
          const isTrainer = decodedToken.uid.includes("trainer");
          const assignedRole = isMember ? "MEMBER" : isManager ? "MANAGER" : isTrainer ? "TRAINER" : "OWNER";
          let targetGym = null;
          if (decodedToken.uid.includes("gym-a")) {
            const ownerAProfile = await tx.query.userProfiles.findFirst({
              where: eq2(userProfiles.firebaseUid, "uid-test-token-owner-gym-a")
            });
            if (ownerAProfile) {
              targetGym = await tx.query.gyms.findFirst({
                where: eq2(gyms.id, ownerAProfile.gymId)
              });
            }
          }
          if (!targetGym && (isMember || isManager || isTrainer) && !decodedToken.uid.includes("tenant2")) {
            targetGym = await tx.query.gyms.findFirst({
              where: ne(gyms.id, DEMO_GYM_ID)
            });
          }
          if (!targetGym) {
            const gymName = decodedToken.uid.includes("tenant2") ? "Tenant B Fitness" : decodedToken.name ? `${decodedToken.name}'s Gym` : "My Fitness Gym";
            const [newGym] = await tx.insert(gyms).values({
              name: gymName,
              phone: "",
              email: decodedToken.email || "",
              address: "",
              upiId: "",
              gstNumber: "",
              currency: "INR",
              timezone: "Asia/Kolkata",
              receiptPrefix: decodedToken.uid.includes("tenant2") ? "TB-" : "GM-",
              receiptFooter: "Thank you for training with us! Fees once paid are non-refundable.",
              status: "ACTIVE"
            }).returning();
            targetGym = newGym;
            await tx.insert(gymCounters).values({
              gymId: targetGym.id,
              memberSequence: 0,
              receiptSequence: 0
            }).onConflictDoNothing();
            await tx.insert(membershipPlans).values([
              {
                gymId: targetGym.id,
                name: "1 Month General Fitness",
                durationMonths: 1,
                durationDays: 30,
                price: "2500.00",
                description: "Access to general gym floor and cardio zone during operating hours.",
                active: true
              },
              {
                gymId: targetGym.id,
                name: "3 Months Strength Pass",
                durationMonths: 3,
                durationDays: 90,
                price: "6500.00",
                description: "Quarterly membership including basic fitness assessment.",
                active: true
              }
            ]);
          }
          const [newProfile] = await tx.insert(userProfiles).values({
            firebaseUid: decodedToken.uid,
            gymId: targetGym.id,
            name: decodedToken.name || decodedToken.email?.split("@")[0] || (isMember ? "Gym Member" : "Gym User"),
            email: decodedToken.email || null,
            role: assignedRole
          }).returning();
          if (assignedRole === "MEMBER" && decodedToken.email) {
            const matchedMember = await tx.query.members.findFirst({
              where: and2(eq2(members.gymId, targetGym.id), eq2(members.email, decodedToken.email))
            });
            if (matchedMember) {
              await tx.update(members).set({ userId: newProfile.id, accountStatus: "ACTIVE", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(members.id, matchedMember.id));
            }
          }
          await logAuditEvent({
            gymId: targetGym.id,
            userId: newProfile.id,
            action: "USER_PROVISIONED",
            entityType: "USER",
            entityId: newProfile.id,
            details: `Profile provisioned with role ${assignedRole} for UID: ${decodedToken.uid}`,
            tx
          });
          return {
            ...newProfile,
            gym: targetGym
          };
        });
      } catch (raceError) {
        profile = await db.query.userProfiles.findFirst({
          where: eq2(userProfiles.firebaseUid, decodedToken.uid),
          with: { gym: true }
        });
        if (!profile) {
          throw raceError;
        }
      }
    }
    const gymStatus = profile.gym?.status || "ACTIVE";
    if (gymStatus === "DEACTIVATED") {
      return res.status(403).json({
        error: {
          code: "GYM_DEACTIVATED",
          message: "This gym account has been deactivated. Please contact support or the gym owner."
        }
      });
    }
    if (gymStatus === "SUSPENDED" && req.method !== "GET") {
      return res.status(403).json({
        error: {
          code: "GYM_SUSPENDED",
          message: "This gym account is currently suspended. Modifications are restricted."
        }
      });
    }
    const linkedMember = await db.query.members.findFirst({
      where: and2(eq2(members.userId, profile.id), eq2(members.gymId, profile.gymId)),
      orderBy: (m, { desc: desc9 }) => [desc9(m.updatedAt)]
    });
    req.user = {
      firebaseUid: decodedToken.uid,
      userId: profile.id,
      gymId: profile.gymId,
      role: (profile.role || "OWNER").toUpperCase(),
      name: profile.name,
      email: profile.email,
      gymStatus,
      memberId: linkedMember?.id
    };
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token or resolving profile:", error);
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired authentication token" } });
  }
};
var requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    }
    const userRole = (req.user.role || "").toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${userRole}`
        }
      });
    }
    next();
  };
};

// src/routes/auth.ts
import { eq as eq3, and as and3 } from "drizzle-orm";
var router2 = Router2();
router2.post("/register-gym", async (req, res) => {
  try {
    const {
      gymName,
      phone,
      email,
      address,
      upiId,
      currency = "INR",
      receiptPrefix = "GM-",
      receiptFooter,
      ownerName,
      ownerEmail,
      ownerPhone
    } = req.body;
    if (!gymName || !ownerName || !ownerEmail) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Gym name, owner name, and owner email are required." }
      });
    }
    const result = await db.transaction(async (tx) => {
      const [newGym] = await tx.insert(gyms).values({
        name: String(gymName).trim(),
        phone: phone ? String(phone).trim() : "",
        email: email ? String(email).trim() : "",
        address: address ? String(address).trim() : "",
        upiId: upiId ? String(upiId).trim() : "",
        currency: String(currency).trim().toUpperCase() || "INR",
        receiptPrefix: String(receiptPrefix).trim() || "GM-",
        receiptFooter: receiptFooter || "Thank you for training with us! Fees once paid are non-refundable.",
        status: "ACTIVE"
      }).returning();
      await tx.insert(gymCounters).values({
        gymId: newGym.id,
        memberSequence: 0,
        receiptSequence: 0
      }).onConflictDoNothing();
      const [newProfile] = await tx.insert(userProfiles).values({
        firebaseUid: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        gymId: newGym.id,
        name: String(ownerName).trim(),
        email: String(ownerEmail).trim().toLowerCase(),
        role: "OWNER"
      }).returning();
      await tx.insert(membershipPlans).values([
        {
          gymId: newGym.id,
          name: "Monthly Core",
          durationMonths: 1,
          durationDays: 30,
          price: "1500",
          description: "Standard 1-month fitness & gym floor access",
          active: true
        },
        {
          gymId: newGym.id,
          name: "Quarterly Power",
          durationMonths: 3,
          durationDays: 90,
          price: "3800",
          description: "3-month quarterly membership with locker & cardio access",
          active: true
        },
        {
          gymId: newGym.id,
          name: "Annual Elite",
          durationMonths: 12,
          durationDays: 365,
          price: "12000",
          description: "Full 1-year unlimited access with diet consultation",
          active: true
        }
      ]).onConflictDoNothing();
      return { gym: newGym, user: newProfile };
    });
    res.json(result);
  } catch (error) {
    console.error("Error in /api/auth/register-gym:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to generate gym and owner account" } });
  }
});
router2.get("/me", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const gym = await db.query.gyms.findFirst({
      where: eq3(gyms.id, gymId)
    });
    let member = null;
    if (req.user.memberId || req.user.role === "MEMBER") {
      member = await db.query.members.findFirst({
        where: and3(
          eq3(members.gymId, gymId),
          req.user.memberId ? eq3(members.id, req.user.memberId) : eq3(members.userId, req.user.userId)
        ),
        orderBy: (m, { desc: desc9 }) => [desc9(m.updatedAt)],
        with: {
          memberships: {
            orderBy: (ms, { desc: desc9 }) => [desc9(ms.endDate)],
            limit: 1
          }
        }
      });
    }
    res.json({
      user: req.user,
      gym,
      member,
      applicationRole: req.user.role
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to retrieve user context" } });
  }
});
router2.post("/sync", requireAuth, async (req, res) => {
  try {
    const { name, role } = req.body;
    const userId = req.user.userId;
    const currentRole = req.user.role.toUpperCase();
    const allowedRoles = ["OWNER", "MANAGER", "TRAINER"];
    let roleToUpdate = void 0;
    if (role !== void 0) {
      const normalizedRole = String(role).toUpperCase();
      if (!allowedRoles.includes(normalizedRole)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ROLE",
            message: `Invalid role specified. Valid roles are: ${allowedRoles.join(", ")}`
          }
        });
      }
      if (currentRole !== "OWNER") {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Only a gym owner can modify user roles or permissions."
          }
        });
      }
      roleToUpdate = normalizedRole;
    }
    const [updated] = await db.update(userProfiles).set({
      ...name ? { name: String(name).trim() } : {},
      ...roleToUpdate ? { role: roleToUpdate } : {},
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(userProfiles.id, userId)).returning();
    if (roleToUpdate && roleToUpdate !== currentRole) {
      await logAuditEvent({
        gymId: req.user.gymId,
        userId: req.user.userId,
        action: "ROLE_CHANGED",
        entityType: "USER",
        entityId: userId,
        details: `Role updated from ${currentRole} to ${roleToUpdate}`
      });
    }
    res.json({ user: updated });
  } catch (error) {
    console.error("Error in /api/auth/sync:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update user profile" } });
  }
});
router2.post("/demo-member", async (req, res) => {
  try {
    let demoProfile = await db.query.userProfiles.findFirst({
      where: eq3(userProfiles.firebaseUid, "uid-demo-member-alex"),
      with: { gym: true }
    });
    if (!demoProfile) {
      await seedOrResetDemoMember();
      demoProfile = await db.query.userProfiles.findFirst({
        where: eq3(userProfiles.firebaseUid, "uid-demo-member-alex"),
        with: { gym: true }
      });
    }
    const demoMember = await db.query.members.findFirst({
      where: eq3(members.id, DEMO_MEMBER_ID)
    });
    res.json({
      token: "test-token-demo-member",
      user: {
        userId: demoProfile.id,
        firebaseUid: "uid-demo-member-alex",
        gymId: demoProfile.gymId,
        role: "MEMBER",
        name: demoProfile.name,
        email: demoProfile.email
      },
      gym: demoProfile.gym,
      member: demoMember
    });
  } catch (error) {
    console.error("Error in /api/auth/demo-member:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to initialize demo member session" } });
  }
});
router2.post("/demo-member/reset", async (req, res) => {
  try {
    const data = await seedOrResetDemoMember();
    res.json({
      success: true,
      message: "Demo member data restored to pristine state.",
      ...data
    });
  } catch (error) {
    console.error("Error in /api/auth/demo-member/reset:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to reset demo member data" } });
  }
});
var auth_default = router2;

// src/routes/gym.ts
import { Router as Router3 } from "express";
import { eq as eq4 } from "drizzle-orm";
var router3 = Router3();
router3.get("/", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const gym = await db.query.gyms.findFirst({
      where: eq4(gyms.id, gymId)
    });
    if (!gym) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Gym not found" } });
    }
    res.json(gym);
  } catch (error) {
    console.error("Error fetching gym:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch gym configuration" } });
  }
});
router3.put("/", requireAuth, requireRole(["OWNER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const {
      name,
      phone,
      email,
      address,
      upiId,
      gstNumber,
      currency,
      timezone,
      receiptPrefix,
      receiptFooter
    } = req.body;
    const [updated] = await db.update(gyms).set({
      ...name !== void 0 ? { name: String(name).trim() } : {},
      ...phone !== void 0 ? { phone: String(phone).trim() } : {},
      ...email !== void 0 ? { email: String(email).trim() } : {},
      ...address !== void 0 ? { address: String(address).trim() } : {},
      ...upiId !== void 0 ? { upiId: String(upiId).trim() } : {},
      ...gstNumber !== void 0 ? { gstNumber: String(gstNumber).trim() } : {},
      ...currency !== void 0 ? { currency: String(currency).trim().toUpperCase() } : {},
      ...timezone !== void 0 ? { timezone: String(timezone).trim() } : {},
      ...receiptPrefix !== void 0 ? { receiptPrefix: String(receiptPrefix).trim() } : {},
      ...receiptFooter !== void 0 ? { receiptFooter: String(receiptFooter).trim() } : {},
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq4(gyms.id, gymId)).returning();
    await logAuditEvent({
      gymId,
      userId: req.user.userId,
      action: "GYM_CONFIG_UPDATED",
      entityType: "GYM",
      entityId: gymId,
      details: `Gym details updated: ${name || updated.name}`
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating gym:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update gym details" } });
  }
});
router3.patch("/status", requireAuth, requireRole(["OWNER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const { status } = req.body;
    const validStatuses = ["ACTIVE", "SUSPENDED", "DEACTIVATED"];
    const normalizedStatus = String(status || "").toUpperCase();
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        error: {
          code: "INVALID_STATUS",
          message: `Invalid gym status. Allowed: ${validStatuses.join(", ")}`
        }
      });
    }
    const [updated] = await db.update(gyms).set({
      status: normalizedStatus,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq4(gyms.id, gymId)).returning();
    await logAuditEvent({
      gymId,
      userId: req.user.userId,
      action: "GYM_STATUS_CHANGED",
      entityType: "GYM",
      entityId: gymId,
      details: `Gym status transitioned to ${normalizedStatus}`
    });
    res.json({
      success: true,
      gymId: updated.id,
      status: updated.status
    });
  } catch (error) {
    console.error("Error changing gym status:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to change gym status" } });
  }
});
var gym_default = router3;

// src/routes/members.ts
import { Router as Router4 } from "express";
import { eq as eq6, and as and5 } from "drizzle-orm";

// src/lib/server-ids.ts
import { eq as eq5, and as and4, sql } from "drizzle-orm";
var UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id) {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}
async function generateNextMemberCode(tx, gymId) {
  const gym = await tx.query.gyms.findFirst({
    where: eq5(gyms.id, gymId)
  });
  const prefix = gym?.receiptPrefix || "GM-";
  await tx.insert(gymCounters).values({ gymId, memberSequence: 0, receiptSequence: 0 }).onConflictDoNothing();
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = await tx.execute(
      sql`UPDATE gym_counters 
          SET member_sequence = member_sequence + 1, updated_at = NOW() 
          WHERE gym_id = ${gymId} 
          RETURNING member_sequence;`
    );
    const seq = result.rows[0]?.member_sequence || 1;
    const padded = String(seq).padStart(3, "0");
    const candidateCode = `${prefix}${padded}`;
    const existing = await tx.query.members.findFirst({
      where: and4(eq5(members.gymId, gymId), eq5(members.memberCode, candidateCode))
    });
    if (!existing) {
      return candidateCode;
    }
  }
  return `${prefix}${Date.now() % 1e5}`;
}
async function generateNextReceiptNumber(tx, gymId) {
  const gym = await tx.query.gyms.findFirst({
    where: eq5(gyms.id, gymId)
  });
  const prefix = gym?.receiptPrefix || "GM-";
  await tx.insert(gymCounters).values({ gymId, memberSequence: 0, receiptSequence: 0 }).onConflictDoNothing();
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = await tx.execute(
      sql`UPDATE gym_counters 
          SET receipt_sequence = receipt_sequence + 1, updated_at = NOW() 
          WHERE gym_id = ${gymId} 
          RETURNING receipt_sequence;`
    );
    const seq = result.rows[0]?.receipt_sequence || 1;
    const padded = String(seq).padStart(6, "0");
    const candidateReceipt = `${prefix}${padded}`;
    const existing = await tx.query.payments.findFirst({
      where: and4(eq5(payments.gymId, gymId), eq5(payments.receiptNumber, candidateReceipt))
    });
    if (!existing) {
      return candidateReceipt;
    }
  }
  return `${prefix}${Date.now() % 1e6}`;
}

// src/routes/members.ts
var router4 = Router4();
router4.get("/", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const { status, search } = req.query;
    const allMembers = await db.query.members.findMany({
      where: eq6(members.gymId, gymId),
      orderBy: (m, { desc: desc9 }) => [desc9(m.createdAt)],
      with: {
        memberships: {
          orderBy: (ms, { desc: desc9 }) => [desc9(ms.endDate)],
          limit: 1
        },
        payments: {
          orderBy: (p, { desc: desc9 }) => [desc9(p.paymentDate)]
        }
      }
    });
    const result = allMembers.map((m) => {
      const latestMembership = m.memberships?.[0] || null;
      const totalPaid = (m.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
      const totalFee = latestMembership ? parseFloat(latestMembership.price || "0") : 0;
      const pendingAmount = Math.max(0, totalFee - totalPaid);
      return {
        id: m.id,
        gymId: m.gymId,
        memberId: m.memberCode,
        name: m.name,
        phone: m.phone,
        email: m.email,
        dateOfBirth: m.dateOfBirth,
        gender: m.gender,
        address: m.address,
        joinedDate: m.joinDate,
        status: m.status,
        emergencyContact: m.emergencyContactName,
        notes: m.notes,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        activeMembership: latestMembership ? {
          id: latestMembership.id,
          planId: latestMembership.planId,
          planName: latestMembership.planName,
          startDate: latestMembership.startDate,
          endDate: latestMembership.endDate,
          totalFee: parseFloat(latestMembership.totalFee || "0"),
          discount: parseFloat(latestMembership.discount || "0"),
          finalAmount: parseFloat(latestMembership.price || "0"),
          status: latestMembership.status,
          paidAmount: totalPaid,
          pendingAmount
        } : null
      };
    });
    let filtered = result;
    if (status && status !== "ALL") {
      filtered = filtered.filter((m) => m.status.toUpperCase() === String(status).toUpperCase());
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (m) => m.name.toLowerCase().includes(q) || m.phone && m.phone.includes(q) || m.memberId.toLowerCase().includes(q)
      );
    }
    res.json(filtered);
  } catch (error) {
    console.error("Error in GET /api/members:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch members" } });
  }
});
router4.get("/:id", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const memberId = req.params.id;
    if (!isValidUuid(memberId)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
    }
    const member = await db.query.members.findFirst({
      where: and5(eq6(members.id, memberId), eq6(members.gymId, gymId)),
      with: {
        memberships: {
          orderBy: (ms, { desc: desc9 }) => [desc9(ms.startDate)]
        },
        payments: {
          orderBy: (p, { desc: desc9 }) => [desc9(p.paymentDate)]
        },
        attendance: {
          orderBy: (a, { desc: desc9 }) => [desc9(a.checkInTime)],
          limit: 30
        },
        workouts: {
          orderBy: (w, { desc: desc9 }) => [desc9(w.createdAt)],
          limit: 10
        }
      }
    });
    if (!member) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
    }
    res.json(member);
  } catch (error) {
    console.error("Error fetching member details:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch member details" } });
  }
});
router4.post("/", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const {
      name,
      phone,
      email,
      dateOfBirth,
      gender,
      address,
      joinedDate,
      emergencyContact,
      notes,
      planId,
      startDate,
      discount = 0,
      initialPayment = 0,
      paymentMethod = "Cash"
    } = req.body;
    if (!name) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Member name is required" } });
    }
    const effectiveJoinDate = joinedDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const createdData = await db.transaction(async (tx) => {
      const memberCode = await generateNextMemberCode(tx, gymId);
      let initialStatus = "ACTIVE";
      const numInitialPayment = parseFloat(String(initialPayment)) || 0;
      const [newMember] = await tx.insert(members).values({
        gymId,
        memberCode,
        name,
        phone: phone || null,
        email: email || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || "Prefer not to say",
        address: address || null,
        joinDate: effectiveJoinDate,
        status: initialStatus,
        emergencyContactName: emergencyContact || null,
        notes: notes || null
      }).returning();
      let createdMembership = null;
      let createdPayment = null;
      if (planId) {
        const plan = await tx.query.membershipPlans.findFirst({
          where: and5(eq6(membershipPlans.id, planId), eq6(membershipPlans.gymId, gymId))
        });
        if (plan) {
          const sDate = new Date(startDate || effectiveJoinDate);
          const eDate = new Date(sDate);
          eDate.setDate(eDate.getDate() + (plan.durationDays || 30));
          const numTotalFee = parseFloat(plan.price);
          const numDiscount = Math.max(0, parseFloat(String(discount)) || 0);
          const numFinalPrice = Math.max(0, numTotalFee - numDiscount);
          const isFullyPaid = numInitialPayment >= numFinalPrice;
          const membershipStatus = isFullyPaid ? "Active" : numInitialPayment > 0 ? "Pending" : "Pending";
          const [insertedMembership] = await tx.insert(memberships).values({
            gymId,
            memberId: newMember.id,
            planId: plan.id,
            planName: plan.name,
            startDate: sDate.toISOString().split("T")[0],
            endDate: eDate.toISOString().split("T")[0],
            totalFee: numTotalFee.toFixed(2),
            discount: numDiscount.toFixed(2),
            price: numFinalPrice.toFixed(2),
            status: membershipStatus
          }).returning();
          createdMembership = insertedMembership;
          if (numInitialPayment > 0) {
            const receiptNumber = await generateNextReceiptNumber(tx, gymId);
            const [insertedPayment] = await tx.insert(payments).values({
              gymId,
              memberId: newMember.id,
              memberName: newMember.name,
              membershipId: insertedMembership.id,
              receiptNumber,
              amount: numInitialPayment.toFixed(2),
              paymentMethod: paymentMethod || "Cash",
              status: isFullyPaid ? "Paid" : "Partial",
              paymentDate: /* @__PURE__ */ new Date(),
              notes: "Initial membership fee collection"
            }).returning();
            createdPayment = insertedPayment;
          }
          if (!isFullyPaid) {
            await tx.update(members).set({ status: "PAYMENT PENDING" }).where(eq6(members.id, newMember.id));
            newMember.status = "PAYMENT PENDING";
          }
        }
      }
      await tx.insert(notifications).values({
        gymId,
        type: "new_member",
        title: "New Member Onboarded",
        message: `${name} registered with ID ${memberCode}.`,
        memberId: newMember.id,
        memberName: name,
        phone: phone || null,
        read: false
      });
      return {
        member: newMember,
        membership: createdMembership,
        payment: createdPayment
      };
    });
    await logAuditEvent({
      gymId,
      userId: req.user.userId,
      action: "MEMBER_CREATED",
      entityType: "MEMBER",
      entityId: createdData.member.id,
      details: `Created member ${createdData.member.name} (Code: ${createdData.member.memberCode})`
    });
    res.status(201).json(createdData);
  } catch (error) {
    console.error("Error in POST /api/members:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: error.message || "Failed to create member" } });
  }
});
router4.put("/:id", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const memberId = req.params.id;
    if (!isValidUuid(memberId)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
    }
    const {
      name,
      phone,
      email,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      notes,
      status,
      accountStatus
    } = req.body;
    const existing = await db.query.members.findFirst({
      where: and5(eq6(members.id, memberId), eq6(members.gymId, gymId))
    });
    if (!existing) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
    }
    const [updated] = await db.update(members).set({
      ...name !== void 0 ? { name: String(name).trim() } : {},
      ...phone !== void 0 ? { phone: String(phone).trim() } : {},
      ...email !== void 0 ? { email: String(email).trim() } : {},
      ...dateOfBirth !== void 0 ? { dateOfBirth } : {},
      ...gender !== void 0 ? { gender } : {},
      ...address !== void 0 ? { address: String(address).trim() } : {},
      ...emergencyContact !== void 0 ? { emergencyContactName: String(emergencyContact).trim() } : {},
      ...notes !== void 0 ? { notes: String(notes).trim() } : {},
      ...status !== void 0 ? { status: String(status).trim() } : {},
      ...accountStatus !== void 0 ? { accountStatus: String(accountStatus).trim() } : status === "SUSPENDED" ? { accountStatus: "SUSPENDED" } : {},
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and5(eq6(members.id, memberId), eq6(members.gymId, gymId))).returning();
    const isArchived = String(status || "").toUpperCase() === "ARCHIVED" || String(status || "").toUpperCase() === "INACTIVE";
    await logAuditEvent({
      gymId,
      userId: req.user.userId,
      action: isArchived ? "MEMBER_ARCHIVED" : "MEMBER_UPDATED",
      entityType: "MEMBER",
      entityId: memberId,
      details: `Updated member ${updated.name}. Status: ${updated.status}`
    });
    res.json(updated);
  } catch (error) {
    if (error.code === "22P02") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
    }
    console.error("Error in PUT /api/members/:id:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update member" } });
  }
});
router4.delete("/:id", requireAuth, requireRole(["OWNER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const memberId = req.params.id;
    if (!isValidUuid(memberId)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
    }
    const existing = await db.query.members.findFirst({
      where: and5(eq6(members.id, memberId), eq6(members.gymId, gymId))
    });
    if (!existing) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
    }
    const hasPayments = await db.query.payments.findFirst({
      where: and5(eq6(payments.memberId, memberId), eq6(payments.gymId, gymId))
    });
    if (hasPayments) {
      return res.status(400).json({
        error: {
          code: "MEMBER_HAS_PAYMENTS",
          message: "Cannot delete member because payment receipts are linked to their account. Please set their status to Inactive or Archived to preserve financial audit trail."
        }
      });
    }
    await db.delete(members).where(and5(eq6(members.id, memberId), eq6(members.gymId, gymId)));
    await logAuditEvent({
      gymId,
      userId: req.user.userId,
      action: "MEMBER_DELETED",
      entityType: "MEMBER",
      entityId: memberId,
      details: `Deleted member ${existing.name} (${existing.memberCode})`
    });
    res.json({ success: true });
  } catch (error) {
    if (error.code === "22P02") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
    }
    console.error("Error deleting member:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete member" } });
  }
});
router4.post("/:id/invite", requireAuth, requireRole(["OWNER", "MANAGER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const memberId = req.params.id;
    if (!isValidUuid(memberId)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
    }
    const member = await db.query.members.findFirst({
      where: and5(eq6(members.id, memberId), eq6(members.gymId, gymId))
    });
    if (!member) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
    }
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const invitationToken = `GYM-${randomSuffix}`;
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const [updated] = await db.update(members).set({
      invitationToken,
      invitationExpiresAt: expiresAt,
      accountStatus: "INVITED",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and5(eq6(members.id, memberId), eq6(members.gymId, gymId))).returning();
    await logAuditEvent({
      gymId,
      userId: req.user.userId,
      action: "MEMBER_INVITED",
      entityType: "MEMBER",
      entityId: memberId,
      details: `Generated onboarding invitation code for ${member.name} (${member.memberCode}). Code: ${invitationToken}`
    });
    res.json({
      success: true,
      invitationToken,
      expiresAt,
      member: updated
    });
  } catch (error) {
    console.error("Error creating member invitation:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to generate invitation" } });
  }
});
var members_default = router4;

// src/routes/plans.ts
import { Router as Router5 } from "express";
import { eq as eq7, and as and6 } from "drizzle-orm";
var router5 = Router5();
router5.get("/", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const plans = await db.query.membershipPlans.findMany({
      where: eq7(membershipPlans.gymId, gymId),
      orderBy: (p, { asc }) => [asc(p.durationMonths)]
    });
    res.json(plans);
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch membership plans" } });
  }
});
router5.post("/", requireAuth, requireRole(["OWNER", "MANAGER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const { name, durationMonths, durationDays, price, description, active } = req.body;
    if (!name || price === void 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Plan name and price are required" } });
    }
    const months = parseInt(durationMonths, 10) || 1;
    const days = parseInt(durationDays, 10) || months * 30;
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Price must be a non-negative number" } });
    }
    const [created] = await db.insert(membershipPlans).values({
      gymId,
      name: String(name).trim(),
      durationMonths: months,
      durationDays: days,
      price: numPrice.toFixed(2),
      description: description ? String(description).trim() : null,
      active: active !== void 0 ? !!active : true
    }).returning();
    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating plan:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create membership plan" } });
  }
});
router5.put("/:id", requireAuth, requireRole(["OWNER", "MANAGER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const planId = req.params.id;
    if (!isValidUuid(planId)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
    }
    const { name, durationMonths, durationDays, price, description, active } = req.body;
    const existing = await db.query.membershipPlans.findFirst({
      where: and6(eq7(membershipPlans.id, planId), eq7(membershipPlans.gymId, gymId))
    });
    if (!existing) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
    }
    const [updated] = await db.update(membershipPlans).set({
      ...name !== void 0 ? { name: String(name).trim() } : {},
      ...durationMonths !== void 0 ? { durationMonths: parseInt(durationMonths, 10) } : {},
      ...durationDays !== void 0 ? { durationDays: parseInt(durationDays, 10) } : {},
      ...price !== void 0 ? { price: parseFloat(price).toFixed(2) } : {},
      ...description !== void 0 ? { description: String(description).trim() } : {},
      ...active !== void 0 ? { active: !!active } : {},
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and6(eq7(membershipPlans.id, planId), eq7(membershipPlans.gymId, gymId))).returning();
    res.json(updated);
  } catch (error) {
    if (error.code === "22P02") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
    }
    console.error("Error updating plan:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update plan" } });
  }
});
router5.delete("/:id", requireAuth, requireRole(["OWNER", "MANAGER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const planId = req.params.id;
    if (!isValidUuid(planId)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
    }
    const refCount = await db.query.memberships.findFirst({
      where: and6(eq7(memberships.planId, planId), eq7(memberships.gymId, gymId))
    });
    if (refCount) {
      return res.status(400).json({
        error: {
          code: "PLAN_IN_USE",
          message: "Cannot delete plan because member subscriptions are actively linked to it. Please deactivate the plan instead."
        }
      });
    }
    await db.delete(membershipPlans).where(and6(eq7(membershipPlans.id, planId), eq7(membershipPlans.gymId, gymId)));
    res.json({ success: true });
  } catch (error) {
    if (error.code === "22P02") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
    }
    console.error("Error deleting plan:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete plan" } });
  }
});
var plans_default = router5;

// src/routes/memberships.ts
import { Router as Router6 } from "express";
import { eq as eq8, and as and7 } from "drizzle-orm";
var router6 = Router6();
router6.get("/", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const { memberId } = req.query;
    const allMemberships = await db.query.memberships.findMany({
      where: eq8(memberships.gymId, gymId),
      orderBy: (ms, { desc: desc9 }) => [desc9(ms.startDate)],
      with: {
        member: true,
        plan: true
      }
    });
    let mapped = allMemberships.map((ms) => ({
      id: ms.id,
      gymId: ms.gymId,
      memberId: ms.memberId,
      planId: ms.planId,
      planName: ms.planName,
      startDate: ms.startDate,
      endDate: ms.endDate,
      totalFee: parseFloat(ms.totalFee),
      discount: parseFloat(ms.discount),
      finalAmount: parseFloat(ms.price),
      status: ms.status,
      createdAt: ms.createdAt.toISOString(),
      updatedAt: ms.updatedAt.toISOString()
    }));
    if (memberId) {
      mapped = mapped.filter((ms) => ms.memberId === memberId);
    }
    res.json(mapped);
  } catch (error) {
    console.error("Error fetching memberships:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch memberships" } });
  }
});
var handleAssignOrRenewMembership = async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const {
      memberId,
      planId,
      startDate,
      endDate,
      discount = 0,
      initialPayment = 0,
      paymentAmount = 0,
      paymentMethod = "Cash",
      idempotencyKey,
      notes
    } = req.body;
    if (!memberId || !planId) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Member ID and Plan ID are required" } });
    }
    if (!isValidUuid(memberId)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
    }
    if (!isValidUuid(planId)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Membership plan not found" } });
    }
    const result = await db.transaction(async (tx) => {
      const member = await tx.query.members.findFirst({
        where: and7(eq8(members.id, memberId), eq8(members.gymId, gymId))
      });
      if (!member) {
        throw new Error("Member not found");
      }
      const plan = await tx.query.membershipPlans.findFirst({
        where: and7(eq8(membershipPlans.id, planId), eq8(membershipPlans.gymId, gymId))
      });
      if (!plan) {
        throw new Error("Membership plan not found");
      }
      const sDate = new Date(startDate || /* @__PURE__ */ new Date());
      const eDate = endDate ? new Date(endDate) : new Date(sDate);
      if (!endDate) {
        eDate.setDate(eDate.getDate() + (plan.durationDays || 30));
      }
      const numTotalFee = parseFloat(plan.price);
      const numDiscount = Math.max(0, parseFloat(String(discount)) || 0);
      const numFinalAmount = Math.max(0, numTotalFee - numDiscount);
      const numInitialPayment = Math.max(
        0,
        parseFloat(String(initialPayment)) || parseFloat(String(paymentAmount)) || 0
      );
      const isFullyPaid = numInitialPayment >= numFinalAmount;
      const msStatus = isFullyPaid ? "Active" : "Pending";
      const [newMembership] = await tx.insert(memberships).values({
        gymId,
        memberId: member.id,
        planId: plan.id,
        planName: plan.name,
        startDate: sDate.toISOString().split("T")[0],
        endDate: eDate.toISOString().split("T")[0],
        totalFee: numTotalFee.toFixed(2),
        discount: numDiscount.toFixed(2),
        price: numFinalAmount.toFixed(2),
        status: msStatus
      }).returning();
      let createdPayment = null;
      if (numInitialPayment > 0) {
        const receiptNumber = await generateNextReceiptNumber(tx, gymId);
        const [payment] = await tx.insert(payments).values({
          gymId,
          memberId: member.id,
          memberName: member.name,
          membershipId: newMembership.id,
          receiptNumber,
          amount: numInitialPayment.toFixed(2),
          paymentMethod: paymentMethod || "Cash",
          status: isFullyPaid ? "Paid" : "Partial",
          paymentDate: /* @__PURE__ */ new Date(),
          idempotencyKey: idempotencyKey || null,
          notes: notes || "Membership renewal payment"
        }).returning();
        createdPayment = payment;
      }
      const updatedMemberStatus = isFullyPaid ? "ACTIVE" : "PAYMENT PENDING";
      await tx.update(members).set({ status: updatedMemberStatus, updatedAt: /* @__PURE__ */ new Date() }).where(eq8(members.id, member.id));
      await tx.insert(notifications).values({
        gymId,
        type: "membership_renewal",
        title: "Membership Renewed",
        message: `${member.name} renewed with ${plan.name}.`,
        memberId: member.id,
        memberName: member.name,
        read: false
      });
      await logAuditEvent({
        gymId,
        userId: req.user.userId,
        action: "MEMBERSHIP_RENEWED",
        entityType: "MEMBERSHIP",
        entityId: newMembership.id,
        details: `Renewed membership for ${member.name} with plan ${plan.name} (Amount: \u20B9${numFinalAmount})`,
        tx
      });
      return {
        membership: newMembership,
        payment: createdPayment
      };
    });
    res.status(201).json(result);
  } catch (error) {
    if (error.code === "22P02") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Entity not found" } });
    }
    const isNotFound = error.message?.includes("not found");
    if (!isNotFound) {
      console.error("Error renewing membership:", error);
    }
    res.status(isNotFound ? 404 : 500).json({ error: { code: isNotFound ? "NOT_FOUND" : "INTERNAL_ERROR", message: error.message || "Failed to renew membership" } });
  }
};
router6.post("/", requireAuth, requireRole(["OWNER", "MANAGER"]), handleAssignOrRenewMembership);
router6.post("/renew", requireAuth, requireRole(["OWNER", "MANAGER"]), handleAssignOrRenewMembership);
var memberships_default = router6;

// src/routes/payments.ts
import { Router as Router7 } from "express";
import { eq as eq9, and as and8, sql as sql3 } from "drizzle-orm";
var router7 = Router7();
router7.get("/", requireAuth, requireRole(["OWNER", "MANAGER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const { memberId, paymentMethod } = req.query;
    const allPayments = await db.query.payments.findMany({
      where: eq9(payments.gymId, gymId),
      orderBy: (p, { desc: desc9 }) => [desc9(p.paymentDate)],
      with: {
        member: true,
        membership: true
      }
    });
    let mapped = allPayments.map((p) => {
      const dateStr = p.paymentDate instanceof Date ? p.paymentDate.toISOString().split("T")[0] : String(p.paymentDate || "").split("T")[0];
      return {
        id: p.id,
        gymId: p.gymId,
        memberId: p.memberId,
        memberName: p.memberName,
        membershipId: p.membershipId,
        receiptNumber: p.receiptNumber,
        amount: parseFloat(p.amount),
        paymentMethod: p.paymentMethod,
        paymentDate: dateStr,
        date: dateStr,
        status: p.status,
        notes: p.notes,
        idempotencyKey: p.idempotencyKey,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt || ""),
        updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt || "")
      };
    });
    if (memberId) {
      mapped = mapped.filter((p) => p.memberId === memberId);
    }
    if (paymentMethod && paymentMethod !== "ALL") {
      mapped = mapped.filter((p) => p.paymentMethod.toUpperCase() === String(paymentMethod).toUpperCase());
    }
    res.json(mapped);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch payments" } });
  }
});
router7.post("/", requireAuth, requireRole(["OWNER", "MANAGER"]), async (req, res) => {
  const { memberId, membershipId, amount, paymentMethod, notes, idempotencyKey: bodyKey } = req.body;
  const headerKey = req.headers["idempotency-key"];
  const idempotencyKey = bodyKey || headerKey;
  const gymId = req.user.gymId;
  try {
    if (!memberId || amount === void 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Member ID and payment amount are required" } });
    }
    if (!isValidUuid(memberId)) {
      return res.status(404).json({ error: { code: "PAYMENT_FAILED", message: "MEMBER_NOT_FOUND: Member does not exist or does not belong to this gym" } });
    }
    if (membershipId && !isValidUuid(membershipId)) {
      return res.status(404).json({ error: { code: "PAYMENT_FAILED", message: "MEMBERSHIP_NOT_FOUND: Membership not found" } });
    }
    const payAmount = parseFloat(String(amount));
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Payment amount must be greater than zero" } });
    }
    if (idempotencyKey) {
      const existing = await db.query.payments.findFirst({
        where: and8(eq9(payments.gymId, gymId), eq9(payments.idempotencyKey, idempotencyKey))
      });
      if (existing) {
        return res.status(200).json(existing);
      }
    }
    const createdPayment = await db.transaction(async (tx) => {
      if (idempotencyKey) {
        const existingTx = await tx.query.payments.findFirst({
          where: and8(eq9(payments.gymId, gymId), eq9(payments.idempotencyKey, idempotencyKey))
        });
        if (existingTx) {
          return existingTx;
        }
      }
      const memberRows = await tx.execute(
        sql3`SELECT id, name, gym_id FROM members WHERE id = ${memberId} AND gym_id = ${gymId} FOR UPDATE`
      );
      const member = memberRows.rows?.[0];
      if (!member) {
        throw new Error("MEMBER_NOT_FOUND: Member does not exist or does not belong to this gym");
      }
      if (idempotencyKey) {
        const existingTx = await tx.query.payments.findFirst({
          where: and8(eq9(payments.gymId, gymId), eq9(payments.idempotencyKey, idempotencyKey))
        });
        if (existingTx) {
          return existingTx;
        }
      }
      let targetMembership = null;
      if (membershipId) {
        const msRows = await tx.execute(
          sql3`SELECT id, price, plan_name, status FROM memberships WHERE id = ${membershipId} AND gym_id = ${gymId} AND member_id = ${memberId} FOR UPDATE`
        );
        targetMembership = msRows.rows?.[0];
      } else {
        const msRows = await tx.execute(
          sql3`SELECT id, price, plan_name, status FROM memberships WHERE gym_id = ${gymId} AND member_id = ${memberId} ORDER BY end_date DESC LIMIT 1 FOR UPDATE`
        );
        targetMembership = msRows.rows?.[0];
      }
      let finalFee = targetMembership ? parseFloat(targetMembership.price) : payAmount;
      let totalPaidAlready = 0;
      if (targetMembership) {
        const existingPayments = await tx.query.payments.findMany({
          where: and8(eq9(payments.membershipId, targetMembership.id), eq9(payments.gymId, gymId))
        });
        totalPaidAlready = existingPayments.filter((p) => p.status !== "Refunded").reduce((sum, p) => sum + parseFloat(p.amount), 0);
      }
      const pendingDue = Math.max(0, finalFee - totalPaidAlready);
      if (targetMembership && payAmount > pendingDue + 0.01) {
        throw new Error(`EXCESS_PAYMENT: Payment amount (\u20B9${payAmount}) exceeds the outstanding balance (\u20B9${pendingDue.toFixed(2)})`);
      }
      const receiptNumber = await generateNextReceiptNumber(tx, gymId);
      const [newPayment] = await tx.insert(payments).values({
        gymId,
        memberId: member.id,
        memberName: member.name,
        membershipId: targetMembership ? targetMembership.id : null,
        receiptNumber,
        amount: payAmount.toFixed(2),
        paymentMethod: paymentMethod || "Cash",
        status: "Paid",
        paymentDate: /* @__PURE__ */ new Date(),
        idempotencyKey: idempotencyKey || null,
        notes: notes || null
      }).returning();
      if (targetMembership) {
        const newTotalPaid = totalPaidAlready + payAmount;
        const isNowFullyPaid = newTotalPaid >= finalFee - 0.01;
        const newStatus = isNowFullyPaid ? "Active" : "Pending";
        await tx.update(memberships).set({ status: newStatus, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(memberships.id, targetMembership.id));
        const memberStatus = isNowFullyPaid ? "ACTIVE" : "PAYMENT PENDING";
        await tx.update(members).set({ status: memberStatus, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(members.id, member.id));
      }
      await tx.insert(notifications).values({
        gymId,
        type: "payment_received",
        title: "Payment Collected",
        message: `\u20B9${payAmount.toLocaleString("en-IN")} received from ${member.name} (${receiptNumber}).`,
        memberId: member.id,
        memberName: member.name,
        amount: payAmount.toFixed(2),
        read: false
      });
      await logAuditEvent({
        gymId,
        userId: req.user.userId,
        action: "PAYMENT_CREATED",
        entityType: "PAYMENT",
        entityId: newPayment.id,
        details: `Collected \u20B9${payAmount} from ${member.name} (${receiptNumber}) via ${paymentMethod || "Cash"}`,
        tx
      });
      return newPayment;
    });
    res.status(201).json(createdPayment);
  } catch (error) {
    const rawMsg = String(error?.message || "");
    const causeMsg = String(error?.cause?.message || "");
    const causeDetail = String(error?.cause?.detail || "");
    const errCode = error?.code || error?.cause?.code;
    const isUniqueViolation = errCode === "23505" || rawMsg.toLowerCase().includes("unique") || causeMsg.toLowerCase().includes("unique") || causeDetail.toLowerCase().includes("unique") || rawMsg.includes("gym_payment_idempotency_unique") || causeMsg.includes("gym_payment_idempotency_unique");
    if (idempotencyKey && isUniqueViolation) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const existing = await db.query.payments.findFirst({
          where: and8(eq9(payments.gymId, gymId), eq9(payments.idempotencyKey, idempotencyKey))
        });
        if (existing) {
          return res.status(200).json(existing);
        }
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
      }
    }
    const message = error?.message || "Payment processing failed";
    const isValidation = message.includes("EXCESS_PAYMENT") || message.includes("MEMBER_NOT_FOUND") || message.includes("MEMBERSHIP_NOT_FOUND") || causeMsg.includes("EXCESS_PAYMENT");
    if (isValidation) {
      console.warn("Payment creation rejected (validation):", message);
    } else {
      console.error("Payment creation failed:", error);
    }
    res.status(isValidation ? 400 : 500).json({ error: { code: "PAYMENT_FAILED", message } });
  }
});
async function handlePaymentRefund(paymentId, gymId, userId) {
  if (!isValidUuid(paymentId)) {
    throw new Error("Payment not found");
  }
  return await db.transaction(async (tx) => {
    const payment = await tx.query.payments.findFirst({
      where: and8(eq9(payments.id, paymentId), eq9(payments.gymId, gymId))
    });
    if (!payment) {
      throw new Error("Payment not found");
    }
    if (payment.status === "Refunded") {
      return payment;
    }
    const [refunded] = await tx.update(payments).set({ status: "Refunded", updatedAt: /* @__PURE__ */ new Date() }).where(eq9(payments.id, paymentId)).returning();
    if (payment.membershipId) {
      await tx.update(memberships).set({ status: "Pending", updatedAt: /* @__PURE__ */ new Date() }).where(eq9(memberships.id, payment.membershipId));
      await tx.update(members).set({ status: "PAYMENT PENDING", updatedAt: /* @__PURE__ */ new Date() }).where(eq9(members.id, payment.memberId));
    }
    await logAuditEvent({
      gymId,
      userId,
      action: "PAYMENT_REFUNDED",
      entityType: "PAYMENT",
      entityId: paymentId,
      details: `Refunded payment ${payment.receiptNumber} of \u20B9${payment.amount} for ${payment.memberName}`,
      tx
    });
    return refunded;
  });
}
router7.post("/refund", requireAuth, requireRole(["OWNER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const paymentId = req.body?.paymentId || req.body?.id;
    if (!paymentId) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "paymentId is required" } });
    }
    const updatedPayment = await handlePaymentRefund(paymentId, gymId, req.user.userId);
    res.json(updatedPayment);
  } catch (error) {
    const isNotFound = error.message === "Payment not found" || error.code === "22P02";
    if (!isNotFound) {
      console.error("Error refunding payment:", error);
    }
    res.status(isNotFound ? 404 : 500).json({ error: { code: isNotFound ? "NOT_FOUND" : "INTERNAL_ERROR", message: error.message || "Failed to refund payment" } });
  }
});
router7.post("/:id/refund", requireAuth, requireRole(["OWNER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const paymentId = req.params.id;
    const updatedPayment = await handlePaymentRefund(paymentId, gymId, req.user.userId);
    res.json(updatedPayment);
  } catch (error) {
    const isNotFound = error.message === "Payment not found" || error.code === "22P02";
    if (!isNotFound) {
      console.error("Error refunding payment:", error);
    }
    res.status(isNotFound ? 404 : 500).json({ error: { code: isNotFound ? "NOT_FOUND" : "INTERNAL_ERROR", message: error.message || "Failed to refund payment" } });
  }
});
var payments_default = router7;

// src/routes/expenses.ts
import { Router as Router8 } from "express";
import { eq as eq10, and as and9 } from "drizzle-orm";
var router8 = Router8();
router8.get("/", requireAuth, requireRole(["OWNER", "MANAGER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const { category, month } = req.query;
    const allExpenses = await db.query.expenses.findMany({
      where: eq10(expenses.gymId, gymId),
      orderBy: (e, { desc: desc9 }) => [desc9(e.expenseDate), desc9(e.createdAt)]
    });
    let mapped = allExpenses.map((e) => ({
      id: e.id,
      gymId: e.gymId,
      category: e.category,
      description: e.description,
      amount: parseFloat(e.amount),
      date: e.expenseDate,
      paymentMethod: e.paymentMethod,
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString()
    }));
    if (category && category !== "ALL") {
      mapped = mapped.filter((e) => e.category.toLowerCase() === String(category).toLowerCase());
    }
    if (month) {
      mapped = mapped.filter((e) => (e.date || "").startsWith(String(month)));
    }
    res.json(mapped);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch expenses" } });
  }
});
router8.post("/", requireAuth, requireRole(["OWNER", "MANAGER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const { category, description, amount, date: date2, paymentMethod, notes } = req.body;
    if (!category || !description || amount === void 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Category, description, and amount are required" } });
    }
    const numAmount = parseFloat(String(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Amount must be a positive number" } });
    }
    const [created] = await db.insert(expenses).values({
      gymId,
      category: String(category).trim(),
      description: String(description).trim(),
      amount: numAmount.toFixed(2),
      expenseDate: date2 || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      paymentMethod: paymentMethod ? String(paymentMethod).trim() : "Cash",
      notes: notes ? String(notes).trim() : null
    }).returning();
    await logAuditEvent({
      gymId,
      userId: req.user.userId,
      action: "EXPENSE_CREATED",
      entityType: "EXPENSE",
      entityId: created.id,
      details: `Created expense of \u20B9${numAmount} for "${description}" (${category})`
    });
    res.status(201).json({
      id: created.id,
      gymId: created.gymId,
      category: created.category,
      description: created.description,
      amount: parseFloat(created.amount),
      date: created.expenseDate,
      paymentMethod: created.paymentMethod,
      notes: created.notes,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to record expense" } });
  }
});
router8.put("/:id", requireAuth, requireRole(["OWNER", "MANAGER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const expenseId = req.params.id;
    const { category, description, amount, date: date2, paymentMethod, notes } = req.body;
    if (!isValidUuid(expenseId)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
    }
    const existing = await db.query.expenses.findFirst({
      where: and9(eq10(expenses.id, expenseId), eq10(expenses.gymId, gymId))
    });
    if (!existing) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
    }
    const [updated] = await db.update(expenses).set({
      ...category !== void 0 ? { category: String(category).trim() } : {},
      ...description !== void 0 ? { description: String(description).trim() } : {},
      ...amount !== void 0 ? { amount: parseFloat(String(amount)).toFixed(2) } : {},
      ...date2 !== void 0 ? { expenseDate: date2 } : {},
      ...paymentMethod !== void 0 ? { paymentMethod: String(paymentMethod).trim() } : {},
      ...notes !== void 0 ? { notes: String(notes).trim() } : {},
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and9(eq10(expenses.id, expenseId), eq10(expenses.gymId, gymId))).returning();
    await logAuditEvent({
      gymId,
      userId: req.user.userId,
      action: "EXPENSE_UPDATED",
      entityType: "EXPENSE",
      entityId: expenseId,
      details: `Updated expense: ${updated.description}`
    });
    res.json({
      id: updated.id,
      gymId: updated.gymId,
      category: updated.category,
      description: updated.description,
      amount: parseFloat(updated.amount),
      date: updated.expenseDate,
      paymentMethod: updated.paymentMethod,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    });
  } catch (error) {
    if (error.code === "22P02") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
    }
    console.error("Error updating expense:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update expense" } });
  }
});
router8.delete("/:id", requireAuth, requireRole(["OWNER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const expenseId = req.params.id;
    if (!isValidUuid(expenseId)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
    }
    const existing = await db.query.expenses.findFirst({
      where: and9(eq10(expenses.id, expenseId), eq10(expenses.gymId, gymId))
    });
    if (!existing) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
    }
    await db.delete(expenses).where(and9(eq10(expenses.id, expenseId), eq10(expenses.gymId, gymId)));
    await logAuditEvent({
      gymId,
      userId: req.user.userId,
      action: "EXPENSE_DELETED",
      entityType: "EXPENSE",
      entityId: expenseId,
      details: `Deleted expense "${existing.description}" of \u20B9${existing.amount}`
    });
    res.json({ success: true });
  } catch (error) {
    if (error.code === "22P02") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
    }
    console.error("Error deleting expense:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete expense" } });
  }
});
var expenses_default = router8;

// src/routes/notifications.ts
import { Router as Router9 } from "express";
import { eq as eq11, and as and10 } from "drizzle-orm";
var router9 = Router9();
router9.get("/", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const items = await db.query.notifications.findMany({
      where: eq11(notifications.gymId, gymId),
      orderBy: (n, { desc: desc9 }) => [desc9(n.createdAt)],
      limit: 50
    });
    const mapped = items.map((n) => ({
      id: n.id,
      gymId: n.gymId,
      type: n.type,
      title: n.title,
      message: n.message,
      memberId: n.memberId,
      memberName: n.memberName,
      amount: n.amount ? parseFloat(n.amount) : void 0,
      date: n.date || n.createdAt.toISOString().split("T")[0],
      read: n.read,
      phone: n.phone,
      createdAt: n.createdAt.toISOString()
    }));
    res.json(mapped);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch notifications" } });
  }
});
router9.put("/:id/read", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const notifId = req.params.id;
    await db.update(notifications).set({ read: true }).where(and10(eq11(notifications.id, notifId), eq11(notifications.gymId, gymId)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification read:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update notification" } });
  }
});
router9.put("/read-all", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    await db.update(notifications).set({ read: true }).where(eq11(notifications.gymId, gymId));
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications read:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update notifications" } });
  }
});
router9.delete("/clear", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    await db.delete(notifications).where(and10(eq11(notifications.gymId, gymId), eq11(notifications.read, true)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to clear notifications" } });
  }
});
var notifications_default = router9;

// src/routes/dashboard.ts
import { Router as Router10 } from "express";
import { eq as eq12, and as and11 } from "drizzle-orm";
var router10 = Router10();
router10.get("/", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const now = /* @__PURE__ */ new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const allMembers = await db.query.members.findMany({
      where: eq12(members.gymId, gymId),
      with: {
        memberships: {
          orderBy: (ms, { desc: desc9 }) => [desc9(ms.endDate)]
        },
        payments: true
      }
    });
    const totalMembers = allMembers.length;
    let activeMembers = 0;
    let expiringSoonCount = 0;
    let pendingPaymentsCount = 0;
    let totalPendingDue = 0;
    const urgentPendingList = [];
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = sevenDaysFromNow.toISOString().split("T")[0];
    for (const m of allMembers) {
      const activeMs = m.memberships?.[0];
      if (activeMs) {
        if (activeMs.endDate >= todayStr && activeMs.status !== "Expired") {
          activeMembers++;
        }
        if (activeMs.endDate >= todayStr && activeMs.endDate <= sevenDaysStr) {
          expiringSoonCount++;
        }
        const totalFee = parseFloat(activeMs.price || "0");
        const totalPaid = (m.payments || []).filter((p) => p.status !== "Refunded").reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
        const due = Math.max(0, totalFee - totalPaid);
        if (due > 0) {
          pendingPaymentsCount++;
          totalPendingDue += due;
          urgentPendingList.push({
            id: m.id,
            memberId: m.memberCode,
            name: m.name,
            phone: m.phone,
            planName: activeMs.planName,
            pendingAmount: due,
            dueDate: activeMs.startDate,
            status: m.status
          });
        }
      }
    }
    const allPayments = await db.query.payments.findMany({
      where: and11(eq12(payments.gymId, gymId), eq12(payments.status, "Paid"))
    });
    let todayCollection = 0;
    let thisMonthRevenue = 0;
    for (const p of allPayments) {
      const pDate = new Date(p.paymentDate);
      const pDateStr = pDate.toISOString().split("T")[0];
      const pAmount = parseFloat(p.amount);
      if (pDateStr === todayStr) {
        todayCollection += pAmount;
      }
      if (pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth) {
        thisMonthRevenue += pAmount;
      }
    }
    const allExpenses = await db.query.expenses.findMany({
      where: eq12(expenses.gymId, gymId)
    });
    let thisMonthExpenses = 0;
    for (const e of allExpenses) {
      const eDate = new Date(e.expenseDate);
      if (eDate.getFullYear() === currentYear && eDate.getMonth() === currentMonth) {
        thisMonthExpenses += parseFloat(e.amount);
      }
    }
    const netIncome = thisMonthRevenue - thisMonthExpenses;
    const monthlyChartData = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const targetY = targetDate.getFullYear();
      const targetM = targetDate.getMonth();
      const label = `${monthNames[targetM]} '${String(targetY).slice(-2)}`;
      const rev = allPayments.filter((p) => {
        const d = new Date(p.paymentDate);
        return d.getFullYear() === targetY && d.getMonth() === targetM;
      }).reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const exp = allExpenses.filter((e) => {
        const d = new Date(e.expenseDate);
        return d.getFullYear() === targetY && d.getMonth() === targetM;
      }).reduce((sum, e) => sum + parseFloat(e.amount), 0);
      monthlyChartData.push({
        month: label,
        revenue: rev,
        expenses: exp,
        net: rev - exp
      });
    }
    res.json({
      metrics: {
        totalMembers,
        activeMembers,
        expiringSoonCount,
        todayCollection,
        thisMonthRevenue,
        pendingPaymentsCount,
        totalPendingDue,
        thisMonthExpenses,
        netIncome
      },
      monthlyChartData,
      urgentPendingList: urgentPendingList.slice(0, 10)
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to compute dashboard metrics" } });
  }
});
var dashboard_default = router10;

// src/routes/reports.ts
import { Router as Router11 } from "express";
import { eq as eq13, and as and12 } from "drizzle-orm";
var router11 = Router11();
router11.get("/", requireAuth, requireRole(["OWNER", "MANAGER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const { period = "month" } = req.query;
    const now = /* @__PURE__ */ new Date();
    let startDate;
    if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "quarter") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(2e3, 0, 1);
    }
    const startISO = startDate.toISOString();
    const startDateStr = startISO.split("T")[0];
    const allPayments = await db.query.payments.findMany({
      where: and12(eq13(payments.gymId, gymId), eq13(payments.status, "Paid"))
    });
    const filteredPayments = allPayments.filter((p) => p.paymentDate >= startDate);
    const totalCollected = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const allExpenses = await db.query.expenses.findMany({
      where: eq13(expenses.gymId, gymId)
    });
    const filteredExpenses = allExpenses.filter((e) => e.expenseDate >= startDateStr);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const netProfit = totalCollected - totalExpenses;
    const profitMargin = totalCollected > 0 ? (netProfit / totalCollected * 100).toFixed(1) : "0.0";
    const methodCounts = {};
    for (const p of filteredPayments) {
      methodCounts[p.paymentMethod] = (methodCounts[p.paymentMethod] || 0) + parseFloat(p.amount);
    }
    const paymentMethods = Object.entries(methodCounts).map(([method, total]) => ({
      method,
      total,
      percentage: totalCollected > 0 ? Math.round(total / totalCollected * 100) : 0
    }));
    const allMemberships = await db.query.memberships.findMany({
      where: eq13(memberships.gymId, gymId)
    });
    const planCounts = {};
    for (const ms of allMemberships) {
      planCounts[ms.planName] = (planCounts[ms.planName] || 0) + 1;
    }
    const planBreakdown = Object.entries(planCounts).map(([name, count]) => ({
      name,
      count
    }));
    res.json({
      period,
      summary: {
        totalCollected,
        totalExpenses,
        netProfit,
        profitMargin: parseFloat(profitMargin),
        transactionCount: filteredPayments.length
      },
      paymentMethods,
      planBreakdown
    });
  } catch (error) {
    console.error("Error in /api/reports:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to generate financial reports" } });
  }
});
var reports_default = router11;

// src/routes/search.ts
import { Router as Router12 } from "express";
import { eq as eq14, and as and13, ilike as ilike2, or as or2 } from "drizzle-orm";
var router12 = Router12();
router12.get("/", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const query = String(req.query.q || "").trim();
    if (!query) {
      return res.json({ members: [], payments: [], plans: [] });
    }
    const pattern = `%${query}%`;
    const matchingMembers = await db.query.members.findMany({
      where: and13(
        eq14(members.gymId, gymId),
        or2(
          ilike2(members.name, pattern),
          ilike2(members.phone, pattern),
          ilike2(members.memberCode, pattern)
        )
      ),
      limit: 10
    });
    const matchingPayments = await db.query.payments.findMany({
      where: and13(
        eq14(payments.gymId, gymId),
        or2(
          ilike2(payments.receiptNumber, pattern),
          ilike2(payments.memberName, pattern)
        )
      ),
      limit: 10
    });
    const matchingPlans = await db.query.membershipPlans.findMany({
      where: and13(
        eq14(membershipPlans.gymId, gymId),
        ilike2(membershipPlans.name, pattern)
      ),
      limit: 5
    });
    res.json({
      members: matchingMembers.map((m) => ({
        id: m.id,
        memberId: m.memberCode,
        name: m.name,
        phone: m.phone,
        status: m.status
      })),
      payments: matchingPayments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        memberName: p.memberName,
        amount: parseFloat(p.amount),
        date: p.paymentDate.toISOString()
      })),
      plans: matchingPlans.map((p) => ({
        id: p.id,
        name: p.name,
        price: parseFloat(p.price)
      }))
    });
  } catch (error) {
    console.error("Error in /api/search:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Search failed" } });
  }
});
var search_default = router12;

// src/routes/backup.ts
import { Router as Router13 } from "express";
import { eq as eq15 } from "drizzle-orm";
var router13 = Router13();
var handleExport = async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const [gym, allPlans, allMembers, allMemberships, allPayments, allExpenses, allNotifications] = await Promise.all([
      db.query.gyms.findFirst({ where: eq15(gyms.id, gymId) }),
      db.query.membershipPlans.findMany({ where: eq15(membershipPlans.gymId, gymId) }),
      db.query.members.findMany({ where: eq15(members.gymId, gymId) }),
      db.query.memberships.findMany({ where: eq15(memberships.gymId, gymId) }),
      db.query.payments.findMany({ where: eq15(payments.gymId, gymId) }),
      db.query.expenses.findMany({ where: eq15(expenses.gymId, gymId) }),
      db.query.notifications.findMany({ where: eq15(notifications.gymId, gymId) })
    ]);
    const backupPayload = {
      exportVersion: "2.0.0-cloud",
      exportDate: (/* @__PURE__ */ new Date()).toISOString(),
      gym,
      plans: allPlans,
      members: allMembers,
      memberships: allMemberships,
      payments: allPayments,
      expenses: allExpenses,
      notifications: allNotifications
    };
    await logAuditEvent({
      gymId,
      userId: req.user.userId,
      action: "BACKUP_EXPORTED",
      entityType: "BACKUP",
      entityId: gymId,
      details: `Full tenant data backup exported (${allMembers.length} members, ${allPayments.length} payments)`
    });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=gym_backup_${gym?.receiptPrefix || "GM"}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`);
    res.json(backupPayload);
  } catch (error) {
    console.error("Error exporting backup:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to export backup" } });
  }
};
router13.get("/", requireAuth, requireRole(["OWNER"]), handleExport);
router13.get("/export", requireAuth, requireRole(["OWNER"]), handleExport);
var backup_default = router13;

// src/routes/audit.ts
import { Router as Router14 } from "express";
import { eq as eq16 } from "drizzle-orm";
var router14 = Router14();
router14.get("/", requireAuth, requireRole(["OWNER"]), async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "50"), 10)));
    const logs = await db.query.auditLogs.findMany({
      where: eq16(auditLogs.gymId, gymId),
      orderBy: (al, { desc: desc9 }) => [desc9(al.createdAt)],
      limit
    });
    res.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch audit logs" } });
  }
});
var audit_default = router14;

// src/routes/member.ts
import { Router as Router15 } from "express";
import { eq as eq17, and as and14, sql as sql4, gte as gte2, ne as ne2, or as or3 } from "drizzle-orm";
var router15 = Router15();
var requireLinkedMember = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
  }
  const gymId = req.user.gymId;
  const userId = req.user.userId;
  let member = await db.query.members.findFirst({
    where: and14(eq17(members.userId, userId), eq17(members.gymId, gymId)),
    orderBy: (m, { desc: desc9 }) => [desc9(m.updatedAt)]
  });
  if (!member && req.user.memberId) {
    member = await db.query.members.findFirst({
      where: and14(eq17(members.id, req.user.memberId), eq17(members.gymId, gymId))
    });
  }
  if (!member && req.user.email) {
    const matched = await db.query.members.findFirst({
      where: and14(eq17(members.gymId, gymId), eq17(members.email, req.user.email))
    });
    if (matched) {
      const [updated] = await db.update(members).set({ userId, accountStatus: "ACTIVE", updatedAt: /* @__PURE__ */ new Date() }).where(eq17(members.id, matched.id)).returning();
      member = updated;
    }
  }
  if (!member) {
    return res.status(403).json({
      error: {
        code: "NO_LINKED_MEMBER",
        message: "No gym member profile is linked to this authenticated account. Please contact gym staff for an invitation."
      }
    });
  }
  if (member.accountStatus === "SUSPENDED") {
    return res.status(403).json({
      error: {
        code: "MEMBER_SUSPENDED",
        message: "Your gym membership account has been suspended. Please contact gym administration for assistance."
      }
    });
  }
  if (member.status === "ARCHIVED" || member.status === "DEACTIVATED") {
    return res.status(403).json({
      error: {
        code: "MEMBER_ARCHIVED",
        message: "This member account has been archived. Please contact gym administration to reactivate your pass."
      }
    });
  }
  req.member = member;
  next();
};
router15.get("/dashboard", requireAuth, requireLinkedMember, async (req, res) => {
  try {
    const member = req.member;
    const gymId = req.user.gymId;
    const gym = await db.query.gyms.findFirst({
      where: eq17(gyms.id, gymId)
    });
    const latestMembership = await db.query.memberships.findFirst({
      where: and14(eq17(memberships.memberId, member.id), eq17(memberships.gymId, gymId)),
      orderBy: (ms, { desc: desc9 }) => [desc9(ms.endDate)]
    });
    let daysRemaining = 0;
    let isExpired = false;
    if (latestMembership) {
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(latestMembership.endDate);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = endDate.getTime() - today.getTime();
      daysRemaining = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
      if (daysRemaining < 0) {
        daysRemaining = 0;
        isExpired = true;
      }
    }
    const memberPayments = await db.query.payments.findMany({
      where: and14(eq17(payments.memberId, member.id), eq17(payments.gymId, gymId))
    });
    const totalPaid = memberPayments.reduce((acc, p) => acc + parseFloat(p.amount || "0"), 0);
    const totalFee = latestMembership ? parseFloat(latestMembership.price || "0") : 0;
    const pendingDues = Math.max(0, totalFee - totalPaid);
    const startOfMonth = /* @__PURE__ */ new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const attendances = await db.query.memberAttendance.findMany({
      where: and14(eq17(memberAttendance.memberId, member.id), eq17(memberAttendance.gymId, gymId)),
      orderBy: (a, { desc: desc9 }) => [desc9(a.checkInTime)]
    });
    const thisMonthCheckins = attendances.filter((a) => new Date(a.checkInTime) >= startOfMonth).length;
    const lastCheckin = attendances[0] || null;
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const checkedInToday = attendances.some((a) => {
      const dStr = new Date(a.checkInTime).toISOString().split("T")[0];
      return dStr === todayStr;
    });
    let streak = 0;
    const uniqueDays = new Set(attendances.map((a) => new Date(a.checkInTime).toISOString().split("T")[0]));
    const checkDate = /* @__PURE__ */ new Date();
    if (!checkedInToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      const d = checkDate.toISOString().split("T")[0];
      if (uniqueDays.has(d)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    const todayWorkout = await db.query.memberWorkouts.findFirst({
      where: and14(
        eq17(memberWorkouts.memberId, member.id),
        eq17(memberWorkouts.gymId, gymId),
        eq17(memberWorkouts.scheduledDate, todayStr)
      )
    });
    const announcements = await db.query.communityPosts.findMany({
      where: and14(
        eq17(communityPosts.gymId, gymId),
        sql4`${communityPosts.deletedAt} IS NULL`,
        sql4`(${communityPosts.isPinned} = true OR ${communityPosts.postType} = 'GYM_ANNOUNCEMENT')`
      ),
      orderBy: (p, { desc: desc9 }) => [desc9(p.createdAt)],
      limit: 3
    });
    res.json({
      member: {
        id: member.id,
        memberCode: member.memberCode,
        name: member.name,
        email: member.email,
        phone: member.phone,
        joinDate: member.joinDate,
        status: member.status,
        accountStatus: member.accountStatus,
        photoUrl: member.photoUrl,
        emergencyContactName: member.emergencyContactName,
        emergencyContactPhone: member.emergencyContactPhone
      },
      gym: {
        id: gym?.id,
        name: gym?.name,
        phone: gym?.phone,
        email: gym?.email,
        address: gym?.address,
        currency: gym?.currency || "INR"
      },
      membership: latestMembership ? {
        id: latestMembership.id,
        planName: latestMembership.planName,
        startDate: latestMembership.startDate,
        endDate: latestMembership.endDate,
        daysRemaining,
        isExpired,
        totalFee,
        totalPaid,
        pendingDues,
        status: latestMembership.status
      } : null,
      attendance: {
        thisMonthCheckins,
        totalCheckins: attendances.length,
        streak,
        checkedInToday,
        lastCheckinTime: lastCheckin ? lastCheckin.checkInTime : null
      },
      todayWorkout: todayWorkout || null,
      announcements
    });
  } catch (error) {
    console.error("Error in /api/member/dashboard:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load member dashboard" } });
  }
});
router15.get("/profile", requireAuth, requireLinkedMember, async (req, res) => {
  try {
    const member = req.member;
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load profile" } });
  }
});
router15.patch("/profile", requireAuth, requireLinkedMember, async (req, res) => {
  try {
    const member = req.member;
    const {
      phone,
      emergencyContactName,
      emergencyContactPhone,
      address,
      dateOfBirth,
      gender,
      photoUrl,
      notes
    } = req.body;
    const [updated] = await db.update(members).set({
      ...phone !== void 0 ? { phone: String(phone).trim() } : {},
      ...emergencyContactName !== void 0 ? { emergencyContactName: String(emergencyContactName).trim() } : {},
      ...emergencyContactPhone !== void 0 ? { emergencyContactPhone: String(emergencyContactPhone).trim() } : {},
      ...address !== void 0 ? { address: String(address).trim() } : {},
      ...dateOfBirth !== void 0 ? { dateOfBirth } : {},
      ...gender !== void 0 ? { gender } : {},
      ...photoUrl !== void 0 ? { photoUrl: String(photoUrl).trim() } : {},
      ...notes !== void 0 ? { notes: String(notes).trim() } : {},
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq17(members.id, member.id)).returning();
    await logAuditEvent({
      gymId: req.user.gymId,
      userId: req.user.userId,
      action: "MEMBER_UPDATED",
      entityType: "MEMBER",
      entityId: member.id,
      details: `Member ${member.name} updated self-service profile details.`
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating member profile:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update member profile" } });
  }
});
router15.get("/membership", requireAuth, requireLinkedMember, async (req, res) => {
  try {
    const member = req.member;
    const gymId = req.user.gymId;
    const allMemberships = await db.query.memberships.findMany({
      where: and14(eq17(memberships.memberId, member.id), eq17(memberships.gymId, gymId)),
      orderBy: (ms, { desc: desc9 }) => [desc9(ms.endDate)],
      with: {
        plan: true
      }
    });
    const active = allMemberships[0] || null;
    res.json({
      active,
      history: allMemberships
    });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load membership details" } });
  }
});
router15.get("/payments", requireAuth, requireLinkedMember, async (req, res) => {
  try {
    const member = req.member;
    const gymId = req.user.gymId;
    const memberPayments = await db.query.payments.findMany({
      where: and14(eq17(payments.memberId, member.id), eq17(payments.gymId, gymId)),
      orderBy: (p, { desc: desc9 }) => [desc9(p.paymentDate)],
      with: {
        membership: true
      }
    });
    res.json(memberPayments);
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load payment history" } });
  }
});
router15.get("/attendance", requireAuth, requireLinkedMember, async (req, res) => {
  try {
    const member = req.member;
    const gymId = req.user.gymId;
    const queryLimit = req.query.limit ? Math.min(500, parseInt(String(req.query.limit), 10) || 100) : 100;
    const history = await db.query.memberAttendance.findMany({
      where: and14(eq17(memberAttendance.memberId, member.id), eq17(memberAttendance.gymId, gymId)),
      orderBy: (a, { desc: desc9 }) => [desc9(a.checkInTime)],
      limit: queryLimit
    });
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const checkedInToday = history.some((a) => {
      return new Date(a.checkInTime).toISOString().split("T")[0] === todayStr;
    });
    let streak = 0;
    const uniqueDays = new Set(history.map((a) => new Date(a.checkInTime).toISOString().split("T")[0]));
    const checkDate = /* @__PURE__ */ new Date();
    if (!checkedInToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      const d = checkDate.toISOString().split("T")[0];
      if (uniqueDays.has(d)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    res.json({
      history,
      checkedInToday,
      streak,
      totalCount: history.length
    });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load attendance records" } });
  }
});
router15.post("/attendance/check-in", requireAuth, requireLinkedMember, async (req, res) => {
  try {
    const member = req.member;
    const gymId = req.user.gymId;
    const { checkInMethod = "SELF", notes } = req.body;
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const activeMembership = await db.query.memberships.findFirst({
      where: and14(
        eq17(memberships.memberId, member.id),
        eq17(memberships.gymId, gymId),
        gte2(memberships.endDate, todayStr),
        eq17(memberships.status, "Active")
      )
    });
    if (!activeMembership) {
      return res.status(403).json({
        error: {
          code: "MEMBERSHIP_EXPIRED_OR_INACTIVE",
          message: "Check-in requires an active gym membership. Your membership has expired or is inactive. Please renew at the gym desk."
        }
      });
    }
    const existingToday = await db.query.memberAttendance.findFirst({
      where: and14(
        eq17(memberAttendance.memberId, member.id),
        eq17(memberAttendance.gymId, gymId),
        sql4`DATE(${memberAttendance.checkInTime}) = DATE(${todayStr})`
      )
    });
    if (existingToday) {
      return res.json({
        success: true,
        alreadyCheckedIn: true,
        attendance: existingToday,
        message: "You have already checked in today! Keep up the great work."
      });
    }
    const [newCheckin] = await db.insert(memberAttendance).values({
      gymId,
      memberId: member.id,
      checkInTime: /* @__PURE__ */ new Date(),
      checkInMethod,
      notes: notes || null
    }).returning();
    await logAuditEvent({
      gymId,
      userId: req.user.userId,
      action: "ATTENDANCE_CHECKIN",
      entityType: "ATTENDANCE",
      entityId: newCheckin.id,
      details: `${member.name} (${member.memberCode}) checked in via ${checkInMethod}.`
    });
    res.status(201).json({
      success: true,
      alreadyCheckedIn: false,
      attendance: newCheckin,
      message: "Check-in recorded successfully! Have an awesome workout."
    });
  } catch (error) {
    console.error("Error during check-in:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to record check-in" } });
  }
});
router15.get("/workouts", requireAuth, requireLinkedMember, async (req, res) => {
  try {
    const member = req.member;
    const gymId = req.user.gymId;
    const queryLimit = req.query.limit ? Math.min(200, parseInt(String(req.query.limit), 10) || 50) : 50;
    const workouts = await db.query.memberWorkouts.findMany({
      where: and14(eq17(memberWorkouts.memberId, member.id), eq17(memberWorkouts.gymId, gymId)),
      orderBy: (w, { desc: desc9 }) => [desc9(w.scheduledDate)],
      limit: queryLimit
    });
    if (workouts.length === 0) {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const starterRoutine = {
        title: "Full Body Conditioning & Core",
        description: "Starter strength routine: warmup, compound lifts, cardio finisher.",
        scheduledDate: todayStr,
        status: "ASSIGNED",
        exercises: JSON.stringify([
          { name: "Warm-up: Dynamic Stretch & Jump Rope", sets: "3", reps: "2 min", completed: true },
          { name: "Barbell Back Squat", sets: "4", reps: "10", weight: "50 kg", completed: false },
          { name: "Dumbbell Chest Press", sets: "4", reps: "12", weight: "16 kg", completed: false },
          { name: "Lat Pulldowns", sets: "3", reps: "12", weight: "45 kg", completed: false },
          { name: "Plank Hold", sets: "3", reps: "45 sec", completed: false }
        ]),
        notes: "Stay hydrated and rest 90s between heavy sets."
      };
      const [createdStarter] = await db.insert(memberWorkouts).values({
        gymId,
        memberId: member.id,
        ...starterRoutine
      }).returning();
      return res.json([createdStarter]);
    }
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load workouts" } });
  }
});
router15.patch("/workouts/:id", requireAuth, requireLinkedMember, async (req, res) => {
  try {
    const member = req.member;
    const workoutId = req.params.id;
    const { status, exercises, notes } = req.body;
    const existing = await db.query.memberWorkouts.findFirst({
      where: and14(
        eq17(memberWorkouts.id, workoutId),
        eq17(memberWorkouts.memberId, member.id),
        eq17(memberWorkouts.gymId, req.user.gymId)
      )
    });
    if (!existing) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Workout routine not found" } });
    }
    const [updated] = await db.update(memberWorkouts).set({
      ...status !== void 0 ? { status: String(status).toUpperCase() } : {},
      ...exercises !== void 0 ? { exercises: typeof exercises === "string" ? exercises : JSON.stringify(exercises) } : {},
      ...notes !== void 0 ? { notes: String(notes) } : {},
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq17(memberWorkouts.id, workoutId)).returning();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update workout status" } });
  }
});
router15.get("/activity", requireAuth, requireLinkedMember, async (req, res) => {
  try {
    const member = req.member;
    const gymId = req.user.gymId;
    const userId = req.user.userId;
    const { type, from, to, date: date2, search, limit = 100, page, offset } = req.query;
    const [attendances, workouts, memberPayments, memberMemberships, posts] = await Promise.all([
      db.query.memberAttendance.findMany({
        where: and14(eq17(memberAttendance.memberId, member.id), eq17(memberAttendance.gymId, gymId)),
        orderBy: (a, { desc: desc9 }) => [desc9(a.checkInTime)]
      }),
      db.query.memberWorkouts.findMany({
        where: and14(eq17(memberWorkouts.memberId, member.id), eq17(memberWorkouts.gymId, gymId)),
        orderBy: (w, { desc: desc9 }) => [desc9(w.scheduledDate), desc9(w.createdAt)]
      }),
      db.query.payments.findMany({
        where: and14(eq17(payments.memberId, member.id), eq17(payments.gymId, gymId)),
        orderBy: (p, { desc: desc9 }) => [desc9(p.paymentDate)]
      }),
      db.query.memberships.findMany({
        where: and14(eq17(memberships.memberId, member.id), eq17(memberships.gymId, gymId)),
        orderBy: (ms, { desc: desc9 }) => [desc9(ms.startDate)]
      }),
      db.query.communityPosts.findMany({
        where: and14(
          eq17(communityPosts.gymId, gymId),
          or3(eq17(communityPosts.authorMemberId, member.id), eq17(communityPosts.authorUserId, userId)),
          sql4`${communityPosts.deletedAt} IS NULL`
        ),
        orderBy: (cp, { desc: desc9 }) => [desc9(cp.createdAt)]
      })
    ]);
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const checkedInToday = attendances.some((a) => new Date(a.checkInTime).toISOString().split("T")[0] === todayStr);
    const uniqueAttendanceDays = Array.from(new Set(
      attendances.map((a) => new Date(a.checkInTime).toISOString().split("T")[0])
    )).sort().reverse();
    const attendanceDaysSet = new Set(uniqueAttendanceDays);
    let currentStreak = 0;
    const streakCheckDate = /* @__PURE__ */ new Date();
    if (!checkedInToday) {
      streakCheckDate.setDate(streakCheckDate.getDate() - 1);
    }
    while (true) {
      const d = streakCheckDate.toISOString().split("T")[0];
      if (attendanceDaysSet.has(d)) {
        currentStreak++;
        streakCheckDate.setDate(streakCheckDate.getDate() - 1);
      } else {
        break;
      }
    }
    let longestStreak = currentStreak;
    if (uniqueAttendanceDays.length > 0) {
      const sortedAsc = [...uniqueAttendanceDays].sort();
      let tempStreak = 1;
      for (let i = 1; i < sortedAsc.length; i++) {
        const prev = new Date(sortedAsc[i - 1]);
        const curr2 = new Date(sortedAsc[i]);
        const diffDays = Math.round((curr2.getTime() - prev.getTime()) / (1e3 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
    }
    const prMap = /* @__PURE__ */ new Map();
    const completedWorkouts = workouts.filter((w) => w.status === "COMPLETED");
    for (const w of completedWorkouts) {
      if (!w.exercises) continue;
      try {
        const exs = JSON.parse(w.exercises);
        if (Array.isArray(exs)) {
          for (const ex of exs) {
            if (ex && ex.name && ex.weight) {
              const match = String(ex.weight).match(/(\d+(\.\d+)?)/);
              if (match) {
                const num = parseFloat(match[1]);
                const existing = prMap.get(ex.name);
                if (!existing || num > existing.weightNum) {
                  prMap.set(ex.name, {
                    exercise: ex.name,
                    maxWeight: ex.weight,
                    weightNum: num,
                    date: w.scheduledDate
                  });
                }
              }
            }
          }
        }
      } catch {
      }
    }
    const personalRecords = Array.from(prMap.values()).map(({ exercise, maxWeight, date: date3 }) => ({
      exercise,
      maxWeight,
      date: date3
    }));
    const achievements = [];
    if (attendances.length >= 1) {
      const firstAtt = attendances[attendances.length - 1];
      achievements.push({
        id: "ach-first-visit",
        title: "First Step",
        description: "Completed your very first gym check-in.",
        icon: "trophy",
        unlocked: true,
        unlockedAt: firstAtt.checkInTime,
        category: "Attendance",
        tier: "Bronze"
      });
    } else {
      achievements.push({
        id: "ach-first-visit",
        title: "First Step",
        description: "Complete your first gym check-in.",
        icon: "trophy",
        unlocked: false,
        category: "Attendance",
        tier: "Bronze"
      });
    }
    if (longestStreak >= 5 || currentStreak >= 5) {
      achievements.push({
        id: "ach-streak-5",
        title: "Consistent Mover",
        description: "Crushed a 5-day continuous gym attendance streak.",
        icon: "flame",
        unlocked: true,
        unlockedAt: attendances[0]?.checkInTime,
        category: "Consistency",
        tier: "Silver"
      });
    } else {
      achievements.push({
        id: "ach-streak-5",
        title: "Consistent Mover",
        description: "Achieve a 5-day continuous attendance streak.",
        icon: "flame",
        unlocked: false,
        progress: `${currentStreak}/5 days`,
        category: "Consistency",
        tier: "Silver"
      });
    }
    if (longestStreak >= 7 || currentStreak >= 7) {
      achievements.push({
        id: "ach-streak-7",
        title: "Iron Discipline",
        description: "Maintained a full 7-day gym consistency streak.",
        icon: "flame",
        unlocked: true,
        unlockedAt: attendances[0]?.checkInTime,
        category: "Consistency",
        tier: "Gold"
      });
    } else {
      achievements.push({
        id: "ach-streak-7",
        title: "Iron Discipline",
        description: "Maintain a full 7-day attendance streak.",
        icon: "flame",
        unlocked: false,
        progress: `${currentStreak}/7 days`,
        category: "Consistency",
        tier: "Gold"
      });
    }
    if (completedWorkouts.length >= 1) {
      achievements.push({
        id: "ach-workout-first",
        title: "Session Finisher",
        description: "Completed an entire assigned workout routine.",
        icon: "dumbbell",
        unlocked: true,
        unlockedAt: completedWorkouts[completedWorkouts.length - 1]?.createdAt,
        category: "Workouts",
        tier: "Bronze"
      });
    } else {
      achievements.push({
        id: "ach-workout-first",
        title: "Session Finisher",
        description: "Complete your first assigned workout routine.",
        icon: "dumbbell",
        unlocked: false,
        category: "Workouts",
        tier: "Bronze"
      });
    }
    if (completedWorkouts.length >= 10) {
      achievements.push({
        id: "ach-workout-10",
        title: "Decathlon Athlete",
        description: "Completed 10 full workout routines.",
        icon: "sparkles",
        unlocked: true,
        unlockedAt: completedWorkouts[0]?.createdAt,
        category: "Workouts",
        tier: "Gold"
      });
    } else {
      achievements.push({
        id: "ach-workout-10",
        title: "Decathlon Athlete",
        description: "Complete 10 full workout routines.",
        icon: "sparkles",
        unlocked: false,
        progress: `${completedWorkouts.length}/10 routines`,
        category: "Workouts",
        tier: "Gold"
      });
    }
    const hasHeavyPr = personalRecords.some((p) => {
      const match = p.maxWeight.match(/(\d+(\.\d+)?)/);
      return match && parseFloat(match[1]) >= 75;
    });
    if (hasHeavyPr || posts.some((p) => p.postType === "ACHIEVEMENT")) {
      achievements.push({
        id: "ach-pr-crusher",
        title: "Heavy Lifter",
        description: "Logged a major strength lift or milestone PR.",
        icon: "award",
        unlocked: true,
        unlockedAt: completedWorkouts[0]?.createdAt || posts[0]?.createdAt,
        category: "Strength",
        tier: "Gold"
      });
    }
    if (posts.length >= 1) {
      achievements.push({
        id: "ach-community-voice",
        title: "Community Voice",
        description: "Shared progress or motivated fellow members on the gym wall.",
        icon: "users",
        unlocked: true,
        unlockedAt: posts[posts.length - 1]?.createdAt,
        category: "Community",
        tier: "Bronze"
      });
    }
    if (memberMemberships.length >= 1) {
      const activeOrAnnual = memberMemberships.some((ms) => ms.planName.toLowerCase().includes("annual") || ms.status === "Active");
      if (activeOrAnnual) {
        achievements.push({
          id: "ach-committed-athlete",
          title: "Dedicated Member",
          description: "Enrolled in an active gym pass for sustained fitness results.",
          icon: "shield-check",
          unlocked: true,
          unlockedAt: memberMemberships[0]?.startDate,
          category: "Membership",
          tier: "Silver"
        });
      }
    }
    const allActivities = [];
    for (const a of attendances) {
      const dateStr = a.checkInTime.toISOString().split("T")[0];
      allActivities.push({
        id: `att-${a.id}`,
        type: "ATTENDANCE",
        date: dateStr,
        timestamp: a.checkInTime.toISOString(),
        title: "Gym Check-in",
        subtitle: `${new Date(a.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} \u2022 ${a.checkInMethod === "QR" ? "Front-Desk QR Terminal" : "Self-Service Pass"}`,
        status: "VERIFIED",
        badge: "Attendance",
        metadata: {
          attendanceId: a.id,
          checkInMethod: a.checkInMethod,
          notes: a.notes
        }
      });
    }
    for (const w of workouts) {
      let exCount = 0;
      let completedExCount = 0;
      try {
        const exs = JSON.parse(w.exercises || "[]");
        exCount = exs.length;
        completedExCount = exs.filter((e) => e.completed).length;
      } catch {
      }
      const pct = exCount > 0 ? Math.round(completedExCount / exCount * 100) : 0;
      const isPastOrToday = w.scheduledDate <= todayStr;
      const isCompleted = w.status === "COMPLETED";
      allActivities.push({
        id: `wkt-${w.id}`,
        type: "WORKOUT",
        date: w.scheduledDate,
        timestamp: w.updatedAt ? w.updatedAt.toISOString() : `${w.scheduledDate}T10:00:00.000Z`,
        title: isCompleted ? `Workout: ${w.title}` : isPastOrToday ? `Assigned: ${w.title}` : `Upcoming: ${w.title}`,
        subtitle: isCompleted ? `${completedExCount}/${exCount} exercises completed \u2022 100% finished` : isPastOrToday ? `${exCount} exercises planned \u2022 In Progress` : `Scheduled session \u2022 ${exCount} exercises`,
        status: w.status,
        badge: isCompleted ? "Completed" : isPastOrToday ? "Assigned" : "Upcoming",
        metadata: {
          workoutId: w.id,
          title: w.title,
          description: w.description,
          scheduledDate: w.scheduledDate,
          status: w.status,
          exercises: w.exercises,
          notes: w.notes,
          completionPercentage: pct
        }
      });
    }
    for (const p of memberPayments) {
      const pDate = p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate);
      const dateStr = pDate.toISOString().split("T")[0];
      allActivities.push({
        id: `pay-${p.id}`,
        type: "PAYMENT",
        date: dateStr,
        timestamp: pDate.toISOString(),
        title: `Payment: \u20B9${parseFloat(p.amount).toLocaleString("en-IN")}`,
        subtitle: `Receipt #${p.receiptNumber} via ${p.paymentMethod} \u2022 Status: ${p.status}`,
        status: p.status.toUpperCase(),
        badge: "Payment",
        metadata: {
          paymentId: p.id,
          receiptNumber: p.receiptNumber,
          amount: parseFloat(p.amount),
          paymentMethod: p.paymentMethod,
          status: p.status,
          paymentDate: pDate.toISOString(),
          notes: p.notes,
          membershipId: p.membershipId
        }
      });
    }
    for (const ms of memberMemberships) {
      allActivities.push({
        id: `ms-${ms.id}`,
        type: "MEMBERSHIP",
        date: ms.startDate,
        timestamp: `${ms.startDate}T09:00:00.000Z`,
        title: `${ms.planName}`,
        subtitle: `Valid until ${ms.endDate} (\u20B9${parseFloat(ms.price).toLocaleString("en-IN")}) \u2022 ${ms.status}`,
        status: ms.status.toUpperCase(),
        badge: "Membership",
        metadata: {
          membershipId: ms.id,
          planName: ms.planName,
          startDate: ms.startDate,
          endDate: ms.endDate,
          price: parseFloat(ms.price),
          status: ms.status
        }
      });
    }
    for (const cp of posts) {
      const dateStr = cp.createdAt.toISOString().split("T")[0];
      allActivities.push({
        id: `post-${cp.id}`,
        type: "COMMUNITY",
        date: dateStr,
        timestamp: cp.createdAt.toISOString(),
        title: cp.postType === "ACHIEVEMENT" ? "PR / Milestone Post" : "Community Wall Post",
        subtitle: `"${cp.content.slice(0, 60)}${cp.content.length > 60 ? "..." : ""}" \u2022 \u2764\uFE0F ${cp.likesCount} \u2022 \u{1F4AC} ${cp.commentsCount}`,
        status: "POSTED",
        badge: "Community",
        metadata: {
          postId: cp.id,
          content: cp.content,
          mediaUrl: cp.mediaUrl,
          postType: cp.postType,
          likesCount: cp.likesCount,
          commentsCount: cp.commentsCount
        }
      });
    }
    for (const ach of achievements.filter((a) => a.unlocked)) {
      const achDate = ach.unlockedAt ? new Date(ach.unlockedAt).toISOString().split("T")[0] : todayStr;
      allActivities.push({
        id: `ach-${ach.id}`,
        type: "ACHIEVEMENT",
        date: achDate,
        timestamp: ach.unlockedAt ? new Date(ach.unlockedAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
        title: `Achievement Unlocked: ${ach.title}`,
        subtitle: ach.description,
        status: "UNLOCKED",
        badge: ach.tier || "Badge",
        metadata: ach
      });
    }
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const calendarDays = {};
    for (const act of allActivities) {
      if (!calendarDays[act.date]) {
        calendarDays[act.date] = { attendance: false, workout: false, payment: false, community: false, achievement: false, count: 0 };
      }
      calendarDays[act.date].count++;
      if (act.type === "ATTENDANCE") calendarDays[act.date].attendance = true;
      if (act.type === "WORKOUT") calendarDays[act.date].workout = true;
      if (act.type === "PAYMENT") calendarDays[act.date].payment = true;
      if (act.type === "COMMUNITY") calendarDays[act.date].community = true;
      if (act.type === "ACHIEVEMENT") calendarDays[act.date].achievement = true;
    }
    const curr = /* @__PURE__ */ new Date();
    const currentDay = curr.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const thisWeek = weekDays.map((name, index2) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index2);
      const dStr = d.toISOString().split("T")[0];
      const hasAttendance = attendances.some((a) => new Date(a.checkInTime).toISOString().split("T")[0] === dStr);
      const dayWorkout = workouts.find((w) => w.scheduledDate === dStr);
      let label = "\u2014";
      if (hasAttendance && dayWorkout?.status === "COMPLETED") {
        label = `\u2713 Check-in & Workout`;
      } else if (hasAttendance) {
        label = "\u2713 Gym Check-in";
      } else if (dayWorkout?.status === "COMPLETED") {
        label = `\u2713 ${dayWorkout.title}`;
      } else if (dayWorkout) {
        label = dayWorkout.title;
      } else if (dStr < todayStr) {
        label = "Rest Day";
      }
      return {
        day: name,
        date: dStr,
        isToday: dStr === todayStr,
        hasAttendance,
        workout: dayWorkout || null,
        label
      };
    });
    let filteredActivities = allActivities;
    if (type && type !== "ALL") {
      filteredActivities = filteredActivities.filter((a) => a.type === String(type).toUpperCase());
    }
    if (date2) {
      filteredActivities = filteredActivities.filter((a) => a.date === String(date2));
    } else {
      if (from) {
        filteredActivities = filteredActivities.filter((a) => a.date >= String(from));
      }
      if (to) {
        filteredActivities = filteredActivities.filter((a) => a.date <= String(to));
      }
    }
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      filteredActivities = filteredActivities.filter(
        (a) => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.date.includes(q) || a.metadata?.exercises && String(a.metadata.exercises).toLowerCase().includes(q) || a.metadata?.description && String(a.metadata.description).toLowerCase().includes(q) || a.metadata?.notes && String(a.metadata.notes).toLowerCase().includes(q) || a.metadata?.content && String(a.metadata.content).toLowerCase().includes(q) || a.metadata?.receiptNumber && String(a.metadata.receiptNumber).toLowerCase().includes(q)
      );
    }
    const totalCount = filteredActivities.length;
    const parsedLimit = req.query.limit !== void 0 ? parseInt(String(req.query.limit), 10) : 100;
    const limitNum = isNaN(parsedLimit) || parsedLimit <= 0 ? 100 : Math.min(parsedLimit, 500);
    const parsedOffset = req.query.offset !== void 0 ? parseInt(String(req.query.offset), 10) : NaN;
    const parsedPage = req.query.page !== void 0 ? parseInt(String(req.query.page), 10) : NaN;
    let offsetNum = 0;
    if (!isNaN(parsedOffset) && parsedOffset >= 0) {
      offsetNum = parsedOffset;
    } else if (!isNaN(parsedPage) && parsedPage >= 1) {
      offsetNum = (parsedPage - 1) * limitNum;
    }
    const limitedActivities = filteredActivities.slice(offsetNum, offsetNum + limitNum);
    const hasMore = offsetNum + limitedActivities.length < totalCount;
    const startOfMonth = /* @__PURE__ */ new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const thisMonthCheckins = attendances.filter((a) => new Date(a.checkInTime) >= startOfMonth).length;
    const totalSpent = memberPayments.reduce((acc, p) => acc + parseFloat(p.amount || "0"), 0);
    const completionRate = workouts.length > 0 ? Math.round(completedWorkouts.length / workouts.length * 100) : 0;
    res.json({
      activities: limitedActivities,
      totalActivitiesCount: totalCount,
      hasMore,
      limit: limitNum,
      offset: offsetNum,
      page: Math.floor(offsetNum / limitNum) + 1,
      summary: {
        totalCheckins: attendances.length,
        thisMonthCheckins,
        currentStreak,
        longestStreak,
        checkedInToday,
        totalWorkouts: workouts.length,
        completedWorkouts: completedWorkouts.length,
        completionRate,
        totalPayments: memberPayments.length,
        totalSpent,
        personalRecordsCount: personalRecords.length,
        unlockedAchievementsCount: achievements.filter((a) => a.unlocked).length,
        totalAchievementsCount: achievements.length
      },
      thisWeek,
      calendarDays,
      personalRecords,
      achievements,
      attendanceHistory: attendances.slice(0, 50),
      workoutHistory: workouts.slice(0, 50),
      paymentHistory: memberPayments.slice(0, 50),
      membershipHistory: memberMemberships
    });
  } catch (error) {
    console.error("Error fetching member activity:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load member activity" } });
  }
});
router15.get("/activity/calendar", requireAuth, requireLinkedMember, async (req, res) => {
  try {
    const member = req.member;
    const gymId = req.user.gymId;
    const { month } = req.query;
    const [attendances, workouts, paymentsList] = await Promise.all([
      db.query.memberAttendance.findMany({
        where: and14(eq17(memberAttendance.memberId, member.id), eq17(memberAttendance.gymId, gymId))
      }),
      db.query.memberWorkouts.findMany({
        where: and14(eq17(memberWorkouts.memberId, member.id), eq17(memberWorkouts.gymId, gymId))
      }),
      db.query.payments.findMany({
        where: and14(eq17(payments.memberId, member.id), eq17(payments.gymId, gymId))
      })
    ]);
    const daysMap = {};
    for (const a of attendances) {
      const d = a.checkInTime.toISOString().split("T")[0];
      if (!daysMap[d]) daysMap[d] = { date: d, attendance: false, workout: false, payment: false, count: 0 };
      daysMap[d].attendance = true;
      daysMap[d].count++;
    }
    for (const w of workouts) {
      const d = w.scheduledDate;
      if (!daysMap[d]) daysMap[d] = { date: d, attendance: false, workout: false, payment: false, count: 0 };
      daysMap[d].workout = true;
      daysMap[d].count++;
    }
    for (const p of paymentsList) {
      const pDate = p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate);
      const d = pDate.toISOString().split("T")[0];
      if (!daysMap[d]) daysMap[d] = { date: d, attendance: false, workout: false, payment: false, count: 0 };
      daysMap[d].payment = true;
      daysMap[d].count++;
    }
    let results = Object.values(daysMap);
    if (month) {
      results = results.filter((item) => item.date.startsWith(String(month)));
    }
    res.json({ days: results });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load activity calendar" } });
  }
});
router15.post("/link-account", requireAuth, async (req, res) => {
  try {
    const { invitationToken } = req.body;
    const userId = req.user.userId;
    const gymId = req.user.gymId;
    if (!invitationToken) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invitation token is required." } });
    }
    const cleanToken = String(invitationToken).trim();
    const tokenMember = await db.query.members.findFirst({
      where: eq17(members.invitationToken, cleanToken)
    });
    if (!tokenMember) {
      return res.status(404).json({
        error: { code: "INVALID_TOKEN", message: "Invalid or unrecognized invitation code. Please ask your gym owner for a fresh invite." }
      });
    }
    if (tokenMember.gymId !== gymId) {
      return res.status(403).json({
        error: {
          code: "WRONG_GYM",
          message: "This invitation code belongs to a different gym and cannot be claimed by your current account."
        }
      });
    }
    if (tokenMember.invitationExpiresAt && new Date(tokenMember.invitationExpiresAt) < /* @__PURE__ */ new Date()) {
      return res.status(400).json({
        error: { code: "TOKEN_EXPIRED", message: "This invitation code has expired. Please request a new one from your gym." }
      });
    }
    if (tokenMember.accountStatus === "SUSPENDED") {
      return res.status(403).json({
        error: { code: "MEMBER_SUSPENDED", message: "Cannot claim invitation: member account is suspended. Please contact gym administration." }
      });
    }
    if (tokenMember.status === "ARCHIVED" || tokenMember.status === "DEACTIVATED") {
      return res.status(403).json({
        error: { code: "MEMBER_ARCHIVED", message: "Cannot claim invitation: member account is archived. Please contact gym administration." }
      });
    }
    await db.update(members).set({ userId: null, updatedAt: /* @__PURE__ */ new Date() }).where(and14(eq17(members.userId, userId), ne2(members.id, tokenMember.id)));
    const [linked] = await db.update(members).set({
      userId,
      accountStatus: "ACTIVE",
      invitationToken: null,
      // Consume single-use token
      invitationExpiresAt: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq17(members.id, tokenMember.id)).returning();
    await db.update(userProfiles).set({
      role: "MEMBER",
      name: tokenMember.name,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq17(userProfiles.id, userId));
    await logAuditEvent({
      gymId,
      userId,
      action: "MEMBER_LINKED",
      entityType: "MEMBER",
      entityId: linked.id,
      details: `User linked to member ${linked.name} (${linked.memberCode}) via invitation code.`
    });
    res.json({
      success: true,
      member: linked
    });
  } catch (error) {
    console.error("Error linking member account:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to link member account" } });
  }
});
var member_default = router15;

// src/routes/community.ts
import { Router as Router16 } from "express";
import { eq as eq18, and as and15, sql as sql5 } from "drizzle-orm";
var router16 = Router16();
router16.get("/feed", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const userId = req.user.userId;
    const posts = await db.query.communityPosts.findMany({
      where: and15(
        eq18(communityPosts.gymId, gymId),
        sql5`${communityPosts.deletedAt} IS NULL`
      ),
      orderBy: (p, { desc: desc9 }) => [desc9(p.isPinned), desc9(p.createdAt)],
      limit: 50,
      with: {
        comments: {
          where: sql5`${communityComments.deletedAt} IS NULL`,
          orderBy: (c, { asc }) => [asc(c.createdAt)],
          limit: 10
        },
        reactions: true
      }
    });
    const feed = posts.map((post) => {
      const userReaction = (post.reactions || []).find((r) => r.userId === userId);
      return {
        id: post.id,
        gymId: post.gymId,
        authorUserId: post.authorUserId,
        authorMemberId: post.authorMemberId,
        authorName: post.authorName,
        authorRole: post.authorRole,
        content: post.content,
        mediaUrl: post.mediaUrl,
        postType: post.postType,
        isPinned: post.isPinned,
        likesCount: post.reactions ? post.reactions.length : post.likesCount,
        commentsCount: post.comments ? post.comments.length : post.commentsCount,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        hasLiked: !!userReaction,
        userReaction: userReaction ? userReaction.reactionType : null,
        comments: (post.comments || []).map((c) => ({
          id: c.id,
          postId: c.postId,
          authorUserId: c.authorUserId,
          authorName: c.authorName,
          content: c.content,
          createdAt: c.createdAt,
          isSelf: c.authorUserId === userId
        })),
        isAuthor: post.authorUserId === userId
      };
    });
    res.json(feed);
  } catch (error) {
    console.error("Error fetching community feed:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load community feed" } });
  }
});
router16.post("/posts", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const userId = req.user.userId;
    const userRole = (req.user.role || "MEMBER").toUpperCase();
    const { content, mediaUrl, postType = "MEMBER_POST", isPinned = false } = req.body;
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Post content cannot be empty" } });
    }
    const isStaff = ["OWNER", "MANAGER", "TRAINER"].includes(userRole);
    let finalPinned = false;
    let finalPostType = postType;
    if (isStaff) {
      finalPinned = Boolean(isPinned);
    } else {
      if (postType === "GYM_ANNOUNCEMENT") {
        finalPostType = "MEMBER_POST";
      }
    }
    const authorMember = await db.query.members.findFirst({
      where: and15(eq18(members.userId, userId), eq18(members.gymId, gymId))
    });
    const [newPost] = await db.insert(communityPosts).values({
      gymId,
      authorUserId: userId,
      authorMemberId: authorMember ? authorMember.id : null,
      authorName: req.user.name || "Gym Member",
      authorRole: userRole,
      content: String(content).trim(),
      mediaUrl: mediaUrl ? String(mediaUrl).trim() : null,
      postType: finalPostType,
      isPinned: finalPinned,
      likesCount: 0,
      commentsCount: 0
    }).returning();
    await logAuditEvent({
      gymId,
      userId,
      action: "POST_CREATED",
      entityType: "COMMUNITY_POST",
      entityId: newPost.id,
      details: `User ${req.user.name} created community post (${finalPostType}).`
    });
    res.status(201).json({
      ...newPost,
      hasLiked: false,
      userReaction: null,
      comments: [],
      isAuthor: true
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to publish post" } });
  }
});
router16.delete("/posts/:id", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const userId = req.user.userId;
    const userRole = (req.user.role || "MEMBER").toUpperCase();
    const postId = req.params.id;
    const post = await db.query.communityPosts.findFirst({
      where: and15(eq18(communityPosts.id, postId), eq18(communityPosts.gymId, gymId))
    });
    if (!post) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Post not found" } });
    }
    const isAuthor = post.authorUserId === userId;
    const isStaff = ["OWNER", "MANAGER"].includes(userRole);
    if (!isAuthor && !isStaff) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have permission to delete this post." } });
    }
    await db.update(communityPosts).set({ deletedAt: /* @__PURE__ */ new Date() }).where(eq18(communityPosts.id, postId));
    await logAuditEvent({
      gymId,
      userId,
      action: "POST_DELETED",
      entityType: "COMMUNITY_POST",
      entityId: postId,
      details: `${isStaff && !isAuthor ? "Staff moderated and deleted" : "Author deleted"} post ${postId}.`
    });
    res.json({ success: true, message: "Post removed" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete post" } });
  }
});
router16.post("/posts/:id/comments", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const userId = req.user.userId;
    const postId = req.params.id;
    const { content } = req.body;
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Comment cannot be empty" } });
    }
    const post = await db.query.communityPosts.findFirst({
      where: and15(
        eq18(communityPosts.id, postId),
        eq18(communityPosts.gymId, gymId),
        sql5`${communityPosts.deletedAt} IS NULL`
      )
    });
    if (!post) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Post not found" } });
    }
    const [comment] = await db.insert(communityComments).values({
      postId,
      gymId,
      authorUserId: userId,
      authorName: req.user.name || "Gym Member",
      content: String(content).trim()
    }).returning();
    await db.update(communityPosts).set({
      commentsCount: sql5`${communityPosts.commentsCount} + 1`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq18(communityPosts.id, postId));
    res.status(201).json({
      ...comment,
      isSelf: true
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to add comment" } });
  }
});
router16.delete("/comments/:id", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const userId = req.user.userId;
    const userRole = (req.user.role || "MEMBER").toUpperCase();
    const commentId = req.params.id;
    const comment = await db.query.communityComments.findFirst({
      where: and15(eq18(communityComments.id, commentId), eq18(communityComments.gymId, gymId))
    });
    if (!comment) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Comment not found" } });
    }
    const isAuthor = comment.authorUserId === userId;
    const isStaff = ["OWNER", "MANAGER"].includes(userRole);
    if (!isAuthor && !isStaff) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Permission denied." } });
    }
    await db.update(communityComments).set({ deletedAt: /* @__PURE__ */ new Date() }).where(eq18(communityComments.id, commentId));
    await db.update(communityPosts).set({
      commentsCount: sql5`GREATEST(0, ${communityPosts.commentsCount} - 1)`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq18(communityPosts.id, comment.postId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete comment" } });
  }
});
router16.post("/posts/:id/reactions", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const userId = req.user.userId;
    const postId = req.params.id;
    const { reactionType = "LIKE" } = req.body;
    const post = await db.query.communityPosts.findFirst({
      where: and15(
        eq18(communityPosts.id, postId),
        eq18(communityPosts.gymId, gymId),
        sql5`${communityPosts.deletedAt} IS NULL`
      )
    });
    if (!post) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Post not found" } });
    }
    const existingReaction = await db.query.communityReactions.findFirst({
      where: and15(
        eq18(communityReactions.postId, postId),
        eq18(communityReactions.userId, userId)
      )
    });
    if (existingReaction) {
      if (existingReaction.reactionType === reactionType) {
        await db.delete(communityReactions).where(eq18(communityReactions.id, existingReaction.id));
        await db.update(communityPosts).set({
          likesCount: sql5`GREATEST(0, ${communityPosts.likesCount} - 1)`,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq18(communityPosts.id, postId));
        return res.json({ hasLiked: false, reactionType: null });
      } else {
        await db.update(communityReactions).set({ reactionType }).where(eq18(communityReactions.id, existingReaction.id));
        return res.json({ hasLiked: true, reactionType });
      }
    } else {
      await db.insert(communityReactions).values({
        postId,
        gymId,
        userId,
        reactionType
      });
      await db.update(communityPosts).set({
        likesCount: sql5`${communityPosts.likesCount} + 1`,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq18(communityPosts.id, postId));
      return res.json({ hasLiked: true, reactionType });
    }
  } catch (error) {
    console.error("Error toggling reaction:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to process reaction" } });
  }
});
router16.post("/posts/:id/report", requireAuth, async (req, res) => {
  try {
    const gymId = req.user.gymId;
    const userId = req.user.userId;
    const postId = req.params.id;
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Please provide a reason for reporting" } });
    }
    const [report] = await db.insert(communityReports).values({
      gymId,
      postId,
      reportedByUserId: userId,
      reason: String(reason).trim(),
      status: "PENDING"
    }).returning();
    res.json({ success: true, message: "Report submitted for gym moderation review." });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to submit report" } });
  }
});
var community_default = router16;

// src/app.ts
function createApp() {
  const app2 = express();
  app2.use(cors({
    origin: true,
    credentials: true
  }));
  app2.use(express.json());
  app2.use(health_default);
  app2.use("/api/auth", auth_default);
  app2.use("/api/gym", gym_default);
  app2.use("/api/members", members_default);
  app2.use("/api/plans", plans_default);
  app2.use("/api/memberships", memberships_default);
  app2.use("/api/payments", payments_default);
  app2.use("/api/expenses", expenses_default);
  app2.use("/api/notifications", notifications_default);
  app2.use("/api/dashboard", dashboard_default);
  app2.use("/api/reports", reports_default);
  app2.use("/api/search", search_default);
  app2.use("/api/backup", backup_default);
  app2.use("/api/audit", audit_default);
  app2.use("/api/member", member_default);
  app2.use("/api/community", community_default);
  app2.all("/api/*", (req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "API endpoint not found" } });
  });
  app2.use("/api", (err, req, res, next) => {
    console.error("Unhandled API Error:", err);
    res.status(err.status || 500).json({
      error: {
        code: err.code || "INTERNAL_ERROR",
        message: err.message || "An unexpected server error occurred"
      }
    });
  });
  return app2;
}
var app = createApp();
var app_default = app;

// src/api-entry.ts
function handler(req, res) {
  return app_default(req, res);
}
export {
  handler as default
};
