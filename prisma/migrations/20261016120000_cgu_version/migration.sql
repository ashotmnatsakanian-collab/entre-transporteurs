-- Version des CGU acceptée par chaque compte (preuve du consentement et redemande à chaque nouvelle version).
ALTER TABLE "User" ADD COLUMN "cguVersion" TEXT;

-- Comptes existants (avant ouverture au public) : ils ont accepté les CGU à l'inscription,
-- on les rattache à la version en vigueur au moment de cette migration.
UPDATE "User" SET "cguVersion" = '2026-10-16' WHERE "cguAccepteesLe" IS NOT NULL;
