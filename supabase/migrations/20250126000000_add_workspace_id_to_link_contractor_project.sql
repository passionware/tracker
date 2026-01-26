-- Add workspace_id to link_contractor_project table
-- This makes explicit which workspace a contractor works through for a project

-- 1. Add workspace_id column (nullable initially for migration)
ALTER TABLE "link_contractor_project"
ADD COLUMN "workspace_id" bigint;

-- 2. Add foreign key constraint
ALTER TABLE "link_contractor_project"
ADD CONSTRAINT "link_contractor_project_workspace_id_fkey" 
FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id");

-- 3. Populate workspace_id for existing records
-- Priority 1: Use workspace_id from most recent report for this contractor+client
UPDATE "link_contractor_project" "lcp"
SET "workspace_id" = (
  SELECT "r"."workspace_id"
  FROM "report" "r"
  WHERE "r"."contractor_id" = "lcp"."contractor_id"
    AND "r"."client_id" = (
      SELECT "p"."client_id"
      FROM "project" "p"
      WHERE "p"."id" = "lcp"."project_id"
    )
  ORDER BY "r"."created_at" DESC
  LIMIT 1
)
WHERE "workspace_id" IS NULL;

-- Priority 2: Use first workspace from project's workspaces
UPDATE "link_contractor_project" "lcp"
SET "workspace_id" = (
  SELECT "lpw"."workspace_id"
  FROM "link_project_workspace" "lpw"
  WHERE "lpw"."project_id" = "lcp"."project_id"
  ORDER BY "lpw"."is_primary" DESC, "lpw"."id" ASC
  LIMIT 1
)
WHERE "workspace_id" IS NULL;

-- 4. Make workspace_id NOT NULL (all records should now have a value)
ALTER TABLE "link_contractor_project"
ALTER COLUMN "workspace_id" SET NOT NULL;

-- 5. Validation: workspace_id must be one of the project's workspaces
-- This is enforced at the application level (cannot use CHECK constraint with subquery)

-- 6. Update unique constraint to include workspace_id
-- This allows the same contractor to work through different workspaces for the same project
-- (though currently we assume one workspace per contractor-project)
-- Note: We keep the existing unique constraint on (contractor_id, project_id) for now
-- If we need to allow multiple workspaces per contractor-project, we'd need to change this

-- 7. Add index for better query performance
CREATE INDEX IF NOT EXISTS "link_contractor_project_workspace_id_idx" 
ON "link_contractor_project"("workspace_id");

CREATE INDEX IF NOT EXISTS "link_contractor_project_contractor_workspace_idx" 
ON "link_contractor_project"("contractor_id", "workspace_id");
