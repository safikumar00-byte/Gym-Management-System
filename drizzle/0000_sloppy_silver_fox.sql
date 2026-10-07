CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"gym_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"author_member_id" uuid,
	"author_name" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"author_member_id" uuid,
	"author_name" text NOT NULL,
	"author_role" text NOT NULL,
	"content" text NOT NULL,
	"media_url" text,
	"post_type" text DEFAULT 'MEMBER_POST' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "community_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"gym_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reaction_type" text DEFAULT 'LIKE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"reported_by_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"expense_date" date NOT NULL,
	"payment_method" text DEFAULT 'Cash' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gym_counters" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_sequence" integer DEFAULT 0 NOT NULL,
	"receipt_sequence" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gym_counters_gym_id_unique" UNIQUE("gym_id")
);
--> statement-breakpoint
CREATE TABLE "gyms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"upi_id" text,
	"gst_number" text,
	"currency" text DEFAULT 'INR' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"receipt_prefix" text DEFAULT 'GM-' NOT NULL,
	"receipt_footer" text DEFAULT 'Thank you for training with us! Fees once paid are non-refundable.',
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"check_in_time" timestamp with time zone DEFAULT now() NOT NULL,
	"check_out_time" timestamp with time zone,
	"check_in_method" text DEFAULT 'SELF' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scheduled_date" date NOT NULL,
	"status" text DEFAULT 'ASSIGNED' NOT NULL,
	"exercises" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"user_id" uuid,
	"member_code" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"date_of_birth" date,
	"gender" text DEFAULT 'Prefer not to say',
	"address" text,
	"join_date" date NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"account_status" text DEFAULT 'PENDING' NOT NULL,
	"invitation_token" text,
	"invitation_expires_at" timestamp with time zone,
	"photo_url" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"name" text NOT NULL,
	"duration_months" integer DEFAULT 1 NOT NULL,
	"duration_days" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"plan_name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_fee" numeric(12, 2) NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"member_id" uuid,
	"member_name" text,
	"amount" numeric(12, 2),
	"date" date,
	"read" boolean DEFAULT false NOT NULL,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"member_name" text NOT NULL,
	"membership_id" uuid,
	"receipt_number" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" text DEFAULT 'Cash' NOT NULL,
	"status" text DEFAULT 'Paid' NOT NULL,
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" text NOT NULL,
	"gym_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"role" text DEFAULT 'OWNER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_author_user_id_user_profiles_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_author_member_id_members_id_fk" FOREIGN KEY ("author_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_user_id_user_profiles_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_member_id_members_id_fk" FOREIGN KEY ("author_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reactions" ADD CONSTRAINT "community_reactions_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reactions" ADD CONSTRAINT "community_reactions_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reactions" ADD CONSTRAINT "community_reactions_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reported_by_user_id_user_profiles_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_counters" ADD CONSTRAINT "gym_counters_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_attendance" ADD CONSTRAINT "member_attendance_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_attendance" ADD CONSTRAINT "member_attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_workouts" ADD CONSTRAINT "member_workouts_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_workouts" ADD CONSTRAINT "member_workouts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_plan_id_membership_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_gym_id_idx" ON "audit_logs" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "audit_logs_gym_created_idx" ON "audit_logs" USING btree ("gym_id","created_at");--> statement-breakpoint
CREATE INDEX "community_comments_post_id_idx" ON "community_comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "community_comments_gym_id_idx" ON "community_comments" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "community_posts_gym_id_idx" ON "community_posts" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "community_posts_created_idx" ON "community_posts" USING btree ("gym_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "community_reaction_user_post_unique" ON "community_reactions" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "community_reactions_post_id_idx" ON "community_reactions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "community_reactions_gym_id_idx" ON "community_reactions" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "community_reports_gym_id_idx" ON "community_reports" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "expenses_gym_id_idx" ON "expenses" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("gym_id","expense_date");--> statement-breakpoint
CREATE INDEX "member_attendance_gym_id_idx" ON "member_attendance" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "member_attendance_member_id_idx" ON "member_attendance" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_attendance_check_in_idx" ON "member_attendance" USING btree ("gym_id","check_in_time");--> statement-breakpoint
CREATE INDEX "member_workouts_gym_id_idx" ON "member_workouts" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "member_workouts_member_id_idx" ON "member_workouts" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_workouts_date_idx" ON "member_workouts" USING btree ("gym_id","scheduled_date");--> statement-breakpoint
CREATE UNIQUE INDEX "gym_member_code_unique" ON "members" USING btree ("gym_id","member_code");--> statement-breakpoint
CREATE INDEX "members_gym_id_idx" ON "members" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "members_gym_phone_idx" ON "members" USING btree ("gym_id","phone");--> statement-breakpoint
CREATE INDEX "members_gym_code_idx" ON "members" USING btree ("gym_id","member_code");--> statement-breakpoint
CREATE INDEX "members_user_id_idx" ON "members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "members_invitation_token_idx" ON "members" USING btree ("invitation_token");--> statement-breakpoint
CREATE INDEX "membership_plans_gym_id_idx" ON "membership_plans" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "memberships_gym_id_idx" ON "memberships" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "memberships_member_id_idx" ON "memberships" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "memberships_end_date_idx" ON "memberships" USING btree ("gym_id","end_date");--> statement-breakpoint
CREATE INDEX "notifications_gym_id_idx" ON "notifications" USING btree ("gym_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gym_receipt_unique" ON "payments" USING btree ("gym_id","receipt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "gym_payment_idempotency_unique" ON "payments" USING btree ("gym_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "payments_gym_id_idx" ON "payments" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "payments_member_id_idx" ON "payments" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "payments_date_idx" ON "payments" USING btree ("gym_id","payment_date");--> statement-breakpoint
CREATE INDEX "user_profiles_gym_id_idx" ON "user_profiles" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "user_profiles_firebase_uid_idx" ON "user_profiles" USING btree ("firebase_uid");