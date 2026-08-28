-- Add the new lifecycle values to the existing enum. Must be committed on
-- its own before any row can be set to one of these values (Postgres
-- disallows using a newly added enum value inside the same transaction
-- that added it).
ALTER TYPE "ItemStatus" ADD VALUE 'submitted';
ALTER TYPE "ItemStatus" ADD VALUE 'under_review';
ALTER TYPE "ItemStatus" ADD VALUE 'changes_requested';
