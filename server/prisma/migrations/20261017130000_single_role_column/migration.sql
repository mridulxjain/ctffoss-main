-- AlterTable
SET search_path TO "ctf";
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'member';
ALTER TABLE "User" DROP COLUMN IF EXISTS "clubRole";
UPDATE "User" SET "role" = 'admin' WHERE LOWER("role") = 'admin';
UPDATE "User" SET "role" = 'member' WHERE "role" = 'USER';
