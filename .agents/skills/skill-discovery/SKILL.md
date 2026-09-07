---
name: skill-discovery
description: "Trigger: skill discovery. Generate the local Skill Catalog manifest for Project Workflow Studio from an explicitly authorized project root."
license: Apache-2.0
metadata:
  author: project
  version: "1.0"
---

# Skill Discovery

## Activation Contract

Use this Skill in either of two modes to discover available Skills and publish
the local **Skill Catalog** at `.workflow/skill-catalog.json`:

- **Explicit mode:** a person asks for discovery directly. A Codex-style
  invocation is:

```text
$skill-discovery
Genera o actualiza el catálogo local de Skills para este proyecto.
```

- **Preflight mode:** `project-workflow` applies this Skill automatically at the
  beginning of every activation in the same host context, before recipe
  validation. It requires no second user invocation and is not a
  `.workflow/workflow.yaml` step or a hidden runtime.

The spelling above is only an example. An Agent Skills-compatible host invokes
this Skill through its own native mechanism. Project Workflow is the only
implicit caller permitted for preflight mode. A workflow recipe may also compose
`skill-discovery` as a declared ordinary binding when the host permits it.

## Required inputs and capability boundary

Before discovery, confirm that the active host has:

- explicit local filesystem access to the selected project root;
- permission to create `.workflow/workflow.yaml` in the project root when it does not exist;
- permission to create or update `.workflow/skill-catalog.json`; and
- an adapter capability for reporting supported global Skill roots, if global
  discovery is available.

Do not substitute missing capabilities with a hidden process, runtime, CLI,
service, browser upload, second folder permission, or guessed filesystem path.
In explicit mode, if access to the project root is unavailable, stop and report
the exact missing capability. In preflight mode, return a typed warning to
Project Workflow instead; it records or shows the warning and continues the YAML
workflow. If the adapter cannot report global roots, generate the project
collection with `globalSkills: []`, omit `globalRoots`, and return the global
capability warning as specified by the contract.

## Recipe bootstrap

When `.workflow/workflow.yaml` does not exist, create it from the reference
[`workflow.yaml`](references/workflow.yaml). Do so only when it
does not exist, with an atomic create operation that never overwrites an
existing file. Do not select a discovered Skill, add a placeholder binding, or
infer workflow stages; the empty `steps` list is intentional and Project
Workflow asks the user to define the first stage later.

If the host cannot create the file, report the exact recipe-bootstrap failure.
In preflight mode this is a typed warning; Project Workflow may later stop only
because no valid recipe is available. In explicit mode, report the failure and
do not claim that a recipe was created.

## Internal Project Workflow Skill exclusions

The following canonical direct child directories are internal Project Workflow
coordination Skills, not discoverable project Skills:

- `.agents/skills/project-workflow`
- `.agents/skills/skill-discovery`
- `.agents/skills/workflow-orchestrator`

Exclude those exact directories before parsing frontmatter and before sorting.
Never include them in the manifest, even if a `SKILL.md` is invalid or missing.
The exclusion is based on the canonical direct-child directory, not a
frontmatter `name`; every other eligible direct child directory remains
discoverable, including third-party Skills installed in the project.

## Execution steps

1. Treat `.agents/skills/` beneath the authorized project root as the canonical
   project-local Skill root. If `.workflow/workflow.yaml` is absent, bootstrap it exactly
   as described above before discovery continues.
2. Discover its direct child directories, exclude the internal directories
   listed above, then parse each remaining direct child's `SKILL.md`
   frontmatter. Do not recursively treat arbitrary nested folders as Skills.
3. Ask only the active host adapter which global roots it actually supports.
   Use adapter-provided logical root identifiers; never inspect, infer, or
   expose absolute paths such as `~/.codex/skills` or `~/.agents/skills`.
4. Build, validate, deterministically serialize, and atomically publish the
   versioned manifest exactly as defined in the [Skill Catalog contract](references/skill-catalog-contract.md).
5. Return a concise result with the output path, project/global entry counts,
   invalid entries, conflicts, unavailable logical roots, and any write failure.
   In preflight mode, failures are typed warnings rather than blockers. Never
   return Skill file contents or absolute filesystem paths.

## Safety rules

- The manifest is metadata only. Do not upload it or any `SKILL.md` content.
- Never include an absolute path, home-directory shorthand, parent traversal,
  credential, or source content in the manifest or response.
- Preserve a prior valid manifest when atomic publication fails. In preflight
  mode, return an atomic-publication warning and allow Project Workflow to
  continue; in explicit mode, report the publication failure.
- Do not change Git ignore policy. The canonical `.workflow/workflow.yaml` may be
  tracked while generated catalog and history files remain ignored.

## References

- [Skill Catalog contract](references/skill-catalog-contract.md) — authoritative
  schema, frontmatter parsing, statuses, ordering, conflicts, path safety, and
  atomic-write requirements.
