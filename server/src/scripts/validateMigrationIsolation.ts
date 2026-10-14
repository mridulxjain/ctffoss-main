import { URL } from 'url';
import dotenv from 'dotenv';
import path from 'path';

// Load server environment
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const EXPECTED_SCHEMA = 'ctf';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    directUrlSchema?: string | null;
    databaseUrlSchema?: string | null;
  };
}

export function validateSchemaIsolationUrls(env: Record<string, string | undefined> = process.env): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const details: ValidationResult['details'] = {};

  const directUrlRaw = env.DIRECT_URL;
  const databaseUrlRaw = env.DATABASE_URL;

  // 1. Validate DIRECT_URL (used by prisma migrate deploy)
  if (!directUrlRaw || directUrlRaw.trim() === '') {
    errors.push('DIRECT_URL is missing or empty. Prisma migrations require DIRECT_URL to connect.');
  } else {
    try {
      const parsedDirect = new URL(directUrlRaw);
      const schemaParam = parsedDirect.searchParams.get('schema');
      details.directUrlSchema = schemaParam;

      if (!schemaParam) {
        errors.push(
          `DIRECT_URL missing "?schema=${EXPECTED_SCHEMA}" parameter. Running migrations without this parameter risks targeting the public schema (colliding with Loventia).`
        );
      } else if (schemaParam.toLowerCase() !== EXPECTED_SCHEMA) {
        errors.push(
          `DIRECT_URL is configured for schema "${schemaParam}", but must strictly target "?schema=${EXPECTED_SCHEMA}" to preserve database isolation.`
        );
      }
    } catch (e: any) {
      errors.push(`DIRECT_URL could not be parsed as a valid PostgreSQL URL: ${e.message}`);
    }
  }

  // 2. Validate DATABASE_URL (used by runtime application queries via connection pooler)
  if (!databaseUrlRaw || databaseUrlRaw.trim() === '') {
    errors.push('DATABASE_URL is missing or empty.');
  } else {
    try {
      const parsedDb = new URL(databaseUrlRaw);
      const schemaParam = parsedDb.searchParams.get('schema');
      details.databaseUrlSchema = schemaParam;

      if (!schemaParam) {
        errors.push(
          `DATABASE_URL missing "?schema=${EXPECTED_SCHEMA}" parameter. Application queries must be isolated to "?schema=${EXPECTED_SCHEMA}".`
        );
      } else if (schemaParam.toLowerCase() !== EXPECTED_SCHEMA) {
        errors.push(
          `DATABASE_URL is configured for schema "${schemaParam}", but must strictly target "?schema=${EXPECTED_SCHEMA}".`
        );
      }
    } catch (e: any) {
      errors.push(`DATABASE_URL could not be parsed as a valid PostgreSQL URL: ${e.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    details,
  };
}

async function run() {
  console.log('🔍 [Pre-Flight Migration Check] Validating database schema isolation configuration...');

  const result = validateSchemaIsolationUrls(process.env);

  if (!result.valid) {
    console.error('\n❌ FATAL: Pre-migration database isolation check failed:\n');
    result.errors.forEach((err) => console.error(`  - 🛑 ${err}`));
    console.error('\nABORTING: Migration execution stopped to prevent accidental contamination of unrelated schemas.\n');
    process.exit(1);
  }

  console.log(`✅ DIRECT_URL is configured with ?schema=${result.details.directUrlSchema}`);
  console.log(`✅ DATABASE_URL is configured with ?schema=${result.details.databaseUrlSchema}`);
  console.log('🛡️  Pre-flight migration isolation parameters verified successfully.');
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Unexpected pre-flight error:', err);
    process.exit(1);
  });
}
