# Local Skill Catalog Contract

## Purpose and boundary

A host invoked through `skill-discovery` MAY generate the local catalog
consumed by Project Workflow Studio. This is an executable host instruction,
not a Project Workflow runtime, CLI, background process, or service. Studio
never discovers Skill directories itself and never receives Skill content.

Write the catalog only after the host has access to the project root selected by
the user. The output path is `.workflow/skill-catalog.json`. `.workflow/` is
runtime output and remains ignored unless the target repository already has an
explicit policy to track it.

## Host discovery contract

1. Discover direct child directories of the canonical project root
   `.agents/skills/`. A direct child is eligible only when it contains a regular
   `SKILL.md` with parseable frontmatter and a non-empty `name`. Include direct
   children with a missing or invalid `SKILL.md` as `invalid`; they are never
   eligible for composition.
2. Query the active host adapter for its actually supported global Skill roots.
   The adapter MUST return a logical root identifier with each available root;
   it MUST NOT put a filesystem path into the manifest. Do not probe, infer, or
   guess `~/.codex/skills`, `~/.agents/skills`, or any other global path.
3. For each root the adapter marks unavailable, include its logical identifier
   in `globalRoots` with `status: "unavailable"` and no global entries. For an
   available root, inspect only the directories the adapter authorizes and
   label entries with that logical identifier.
4. Read `name`, `description`, and optional `version` from `SKILL.md`
   frontmatter. A parseable, eligible Skill with no non-empty `description` is
   `missing-description`; it remains discoverable. A malformed frontmatter,
   missing name, non-regular `SKILL.md`, or inaccessible child is `invalid` and
   includes a concise `reason`.
5. If the host can calculate SHA-256 without sending content elsewhere, set
   `contentHash` to the lowercase 64-character digest of `SKILL.md`; otherwise
   omit it. Hashes are change hints, not an execution authority.

## Stable manifest schema (version 1)

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-09-07T12:00:00.000Z",
  "generator": { "version": "skill-discovery/1.0" },
  "globalRoots": [{ "id": "host-global", "status": "available" }],
  "projectSkills": [
    {
      "name": "project-workflow",
      "description": "Compose local Skills through workflow.yaml.",
      "version": "1.2",
      "origin": "project",
      "relativePath": ".agents/skills/project-workflow",
      "status": "valid"
    }
  ],
  "globalSkills": [
    {
      "name": "example-global-skill",
      "description": "An adapter-discovered global Skill.",
      "origin": "global",
      "globalRoot": "host-global",
      "status": "valid"
    }
  ]
}
```

Required top-level keys are `schemaVersion`, `generatedAt`, `generator`,
`projectSkills`, and `globalSkills`. `globalRoots` is optional but recommended
whenever the adapter has global-root capability information. Entries use only
these statuses: `valid`, `missing-description`, `invalid`, and `conflict`.
`origin` is `project` or `global` according to its collection.

For project entries, `relativePath` must be a non-empty slash-separated path
relative to the project root. Reject absolute paths, `~`, drive roots, backslashes,
empty segments, `.` and `..`. For global entries, use `globalRoot`, a logical adapter
identifier (`[A-Za-z0-9][A-Za-z0-9._-]*`), never an absolute path.

Sort each collection by case-insensitive visible `name`, then by `relativePath`
or `globalRoot`. Detect duplicate visible names across both collections after
normalizing case. Keep every duplicate, set every duplicate to `conflict`, and
include a `reason` explaining the conflict. Do not silently choose a winner.

## Atomic publication

Validate the full manifest before publication. Serialize deterministic JSON
(two-space indentation and trailing newline), write it to a new temporary file
inside `.workflow/`, flush and close it, then atomically replace
`skill-catalog.json` using the host filesystem primitive. On failure, preserve
the previous catalog and report the failure; never leave a partial manifest.

Skill Discovery generates this file only in an authorized host context. It may
run from an explicit `skill-discovery` request or as Project Workflow's mandatory
same-context preflight; the latter is not a `workflow.yaml` step. A preflight
publication failure preserves the previous catalog, returns a typed warning, and
does not block the YAML workflow. The Studio action can only reload the existing
manifest and explain that regeneration occurs through Skill Discovery.
