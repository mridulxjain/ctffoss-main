-- CreateTable
SET search_path TO "ctf";

CREATE TABLE IF NOT EXISTS "TeamLoventiaFlag" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamLoventiaFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeamLoventiaFlag_teamId_key" ON "TeamLoventiaFlag"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeamLoventiaFlag_flag_key" ON "TeamLoventiaFlag"("flag");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TeamLoventiaFlag_teamId_fkey'
    ) THEN
        ALTER TABLE "TeamLoventiaFlag" ADD CONSTRAINT "TeamLoventiaFlag_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
