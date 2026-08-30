<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Guidelines & Architecture Ground Truth

You are an expert full-stack developer building **LMS Bimbel Template** using Next.js (App Router), Supabase, Prisma, and Tailwind CSS.

## Mandatory Architectural & Business Rules
Before implementing or modifying any feature, you **MUST** consult and adhere to the documentation located in `/docs`:
1. **`docs/PRD.md`**: Single source of truth for Product Requirements and Scope (strictly Tier 1 MVP unless specified).
2. **`docs/SDD.md`**: Single source of truth for System Architecture, Database Schema, and Technical Decisions (Single-tenant, Server Actions, Many-to-Many `course_tutors` & `course_class_levels`, Role-based access).
3. **`docs/PLAN.md`**: Implementation roadmap, phased checklist, and structure references.
4. **`docs/tsd/*.md`**: Detailed Technical Specifications for specific modules/features.
