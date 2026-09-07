---
name: project-workflow
description: "Trigger: project workflow. Refresh the local Skill Catalog as a non-blocking preflight, then start one YAML-declared work item."
license: Apache-2.0
metadata:
  author: project
  version: "1.2"
---

# Project Workflow

## Activation Contract

Use as the user's only explicit entry point to start this project's declared
workflow in an Agent Skills-compatible client. The client invokes this Skill
through its own native mechanism; `$project-workflow` is a Codex-style example,
not a universal command. Continue it automatically when the project resume rule
identifies a direct answer to an active workflow question. Do not invent a
process, select an undeclared Skill, or replace a task-specific Skill.

## Hard Rules

- Load `workflow.yaml`, `.workflow/work-item.yaml`,
  `.workflow/artifact-registry.yaml`, and the base contracts before action.
- Apply [`skill-discovery`](../skill-discovery/SKILL.md) as the mandatory
  same-context preflight before recipe validation. It is not a `workflow.yaml`
  step, does not consume a transition, and never requires a second user
  invocation.
- Check the host/client capability boundary in the [workflow orchestrator](../workflow-orchestrator/SKILL.md) before execution.
- Validate the full recipe before execution. Do not repair an invalid recipe by
  guessing values or changing order.
- The user invokes only this Skill. For `compose`, locate the named eligible
  local Skill and apply its `SKILL.md` instructions in this agent context. Never
  ask the user to invoke an intermediate Skill.
- Composition applies the selected Skill in the active host context. Record the
  applied binding and outcome; do not claim an independent host invocation.
- Persist all state changes and accepted outputs before another binding consumes
  them. Continue automatically until a user decision, block, or completion.

## Studio handoff

Project Workflow Studio is the public visual editor for the local recipe. Its
canonical URL is:

`https://vtrc.github.io/project-workflow-studio/`

When the user is working with `workflow.yaml` or asks to edit the recipe,
construct the Studio handoff URL with a safe relative path hint:

`https://vtrc.github.io/project-workflow-studio/?path=<URL-encoded-relative-yaml-path>`

For example, a repository-root recipe uses
`https://vtrc.github.io/project-workflow-studio/?path=workflow.yaml`.
Only pass a normalized relative `.yaml` or `.yml` path. Never include an
absolute path, home-directory shorthand, parent traversal, credentials, or
file contents. If the path cannot be represented safely, use the canonical URL
without `?path=`. If the host has browser navigation available, open the URL;
otherwise return it as a link. Do not ask the user to clone the Studio, install
npm, use GitHub to transfer the YAML, or upload the file to a server.

The handoff must describe this exact user-controlled flow:

1. Open the Studio handoff URL. The relative hint only identifies the expected
   recipe; it does not grant the site access to a local file.
2. Press **Abrir workflow**. In browsers with the File System Access API,
   select the Project Workflow repository root. The Studio resolves
   `workflow.yaml` (or the hinted relative file) beneath that root and creates
   or reuses `.workflow/studio-history/` there. A file handle alone cannot
   expose its parent directory, so this folder selection is required for
   persistent history.
3. Edit the recipe visually.
4. Press **Guardar cambios** to write to that same file when the browser grants
   File System Access API write permission.

The selected path is private browser state. Never infer a local path or claim
that a file was opened or saved without the user's picker selection and the
browser's explicit permission. This boundary prevents a public site from
reading arbitrary local paths or receiving recipe contents without the user's
action. If the browser lacks direct write support, tell the user that the
   Studio can still import the YAML and download an edited copy. If the browser
   lacks directory access, **Abrir workflow** falls back to the file picker;
   history remains session-only.

## Mandatory Skill catalog preflight

[`skill-discovery`](../skill-discovery/SKILL.md) owns generation of the local
**Skill Catalog** for Studio. Every Project Workflow activation applies it first
as a same-host-context preflight, before recipe validation and execution. This
preflight is not a `workflow.yaml` step, does not alter recipe transitions, and
does not ask the person for a second invocation.

The preflight is deliberately non-blocking. If local access, global-root adapter
capability, or atomic publication is unavailable, record the typed warning in
the work-item state when it can be persisted (otherwise return it in the current
result) and continue the YAML workflow. Do not invent catalog data. When project
access and atomic publication are available, publish the catalog and return its
summary; unavailable global discovery is represented by the contract's
project-only form.

A recipe may still declare `skill-discovery` as an ordinary explicit binding
when catalog generation is a required business step. That binding retains the
recipe's declared failure behavior; it is separate from the automatic preflight.

## Decision Gates

| Condition | Action |
| --- | --- |
| Skill catalog preflight cannot access the project, global adapter, or atomically write | Record or return its warning; continue to recipe validation without catalog data. |
| Recipe has no steps | Ask the user to declare the first ordered step. |
| Recipe is invalid | Report the exact invalid field and stop. |
| The work item is new | Create both durable records, register the user request, then start the first binding. |
| A composed binding awaits answers | Keep it active with `current.status: awaiting_user`; direct ordinary answers resume it automatically. |
| A binding declares `user_explicit` | Mark it blocked and explain that this recipe cannot be hands-off. |
| A named Skill is missing or ineligible | Mark it blocked and report the exact eligibility failure. |
| A required binding blocks | Apply the declared or default blocked behavior. |

## Execution Steps

1. Load the recipe and references. Identify the active work item and binding, or
   initialize a new record from the user's request.
2. Apply `skill-discovery` in preflight mode in this same host context. Before
   recipe validation, publish the local catalog when possible; otherwise record
   or return its warning and continue. Do not create a workflow binding,
   transition, artifact-registry entry, hidden runtime, or second user prompt.
3. Validate order, fields, artifact readiness and ownership, transitions,
   collisions, local Skill eligibility, and resolved execution intent.
4. Compose the current eligible binding exactly as declared. If it asks the user
   questions, persist the pending state and ask them; do not produce output or
   advance until that Skill's completion condition is met. For a composed
   clarification Skill, do not advance while answers are pending; after shared
   understanding is explicitly confirmed, write and register its declared brief
   before continuing automatically.
5. On completion, produce and register the declared artifact, update both
   records, and follow each declared `compose` transition until a user decision,
   block, or terminal state.

## Output Contract

Return the work item, validation result, current binding, composition outcome,
artifact registrations, durable state, and a user question only when needed.

## References

- [Base workflow](../workflow-orchestrator/SKILL.md) — execution authority.
- [Recipe schema](../workflow-orchestrator/references/recipe-schema.md) — recipe validation.
- [Artifact contract](../workflow-orchestrator/references/artifact-contract.md) — durable handoffs.
- [Delegation contract](../workflow-orchestrator/references/delegation-contract.md) — composition boundary.
- [Skill Discovery](../skill-discovery/SKILL.md) — mandatory non-blocking preflight plus optional explicit recipe binding.
