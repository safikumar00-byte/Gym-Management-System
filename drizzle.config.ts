import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const sqlHost = process.env.SQL_HOST || "127.0.0.1";
const sqlPort = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;
const sqlDbName = process.env.SQL_DB_NAME || "postgres";
const user = process.env.SQL_USER || process.env.SQL_ADMIN_USER || "postgres";
const password = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || "";

const caPath = process.env.DATABASE_CA_CERT_PATH || path.join(process.cwd(), "certs", "supabase-ca.crt");
const caCert = process.env.DATABASE_CA_CERT || (fs.existsSync(caPath) ? fs.readFileSync(caPath, "utf8") : undefined);

const sslConfig = caCert
  ? { rejectUnauthorized: true, ca: caCert }
  : (process.env.SQL_SSL === "true" || (process.env.DATABASE_URL?.includes("sslmode=") ?? false)
      ? { rejectUnauthorized: false }
      : false);

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const cleanUrl = directUrl ? directUrl.replace(/[\?&]sslmode=[^&]+/, "") : undefined;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: cleanUrl
    ? {
        url: cleanUrl,
        ssl: sslConfig,
      }
    : {
        host: sqlHost,
        port: sqlPort,
        user: user,
        password: password,
        database: sqlDbName,
        ssl: sslConfig,
      },
  verbose: true,
  strict: true,
});

