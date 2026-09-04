# Project Workflow Instructions

## Purpose and scope

This repository is an instruction-only framework for composing Agent Skills
through a project-local YAML recipe. It targets clients that implement the
Agent Skills standard, not arbitrary non-compatible clients. It is not an
application runtime and it must not grow a hidden process, script, or platform
hook that duplicates the workflow contract.

The detailed execution rules live in the Skills under `.agents/skills/`:

- [`project-workflow`](.agents/skills/project-workflow/SKILL.md) is the only
  user-facing entry point.
- [`workflow-orchestrator`](.agents/skills/workflow-orchestrator/SKILL.md) is
  the neutral execution contract.
- The references beside `workflow-orchestrator` define recipe, artifact, and
  delegation contracts.

## Entry point

The client invokes the project entry Skill through its own native mechanism.
This repository documents the following Codex-style example:

```text
$project-workflow
<the user's request>
```

Other Agent Skills-compatible clients may expose a different entrypoint
mechanism; the `$project-workflow` spelling is not a universal command. The
user should not invoke `grilling`, `writing-plans`, or any other recipe binding
manually. `project-workflow` composes declared bindings in the active host
context and follows the recipe transitions automatically.

## Source of truth

- `workflow.yaml` is the source of truth for ordered steps, Skill bindings,
  inputs, outputs, model intent, delegation, collision policy, and transitions.
- `model`, `reasoning_effort`, `delegation`, and `execution` values are recipe
  intents interpreted by the host adapter; they are not universal runtime
  commands. Check the [workflow orchestrator's capability boundary](.agents/skills/workflow-orchestrator/SKILL.md).
- Do not invent steps, select undeclared Skills, reorder bindings, or repair an
  invalid recipe by guessing values.
- A clean clone may use `workflow.example.yaml`; replace its placeholder Skill
  names with Skills that are actually available in the target environment.

## Starting and executing work

For a new request:

1. Load and validate `workflow.yaml` and the referenced local Skill files.
2. Initialize `.workflow/work-item.yaml` and
   `.workflow/artifact-registry.yaml` when they do not exist.
3. Register the user request as the initial ready input.
4. Compose the first eligible binding exactly as declared.
5. Persist each state change and declared artifact before a later binding reads
   it, then follow `on_success` until the workflow completes, blocks, or awaits
   the user.

`compose` means applying the named local `SKILL.md` in the active host context.
It does not mean starting an independent nested host or claiming that a client
executed a hidden subtask.

## Skills and eligibility

A recipe binding is eligible only when:

- the canonical Skill source exists at `.agents/skills/<name>/SKILL.md`, or the
  host adapter maps that source to its native Skill directory;
- its frontmatter `name` exactly matches the binding name; and
- the host/client policy permits the requested composition and invocation.

If a Skill is missing or ineligible, mark the binding blocked and report the
exact failure. Do not silently substitute another Skill or methodology.

## Artifacts and durable state

- `.workflow/work-item.yaml` stores the work-item lifecycle and current binding.
- `.workflow/artifact-registry.yaml` stores artifact ownership, readiness,
  lineage, and expected versus actual paths.
- Bindings must have one clear owner per artifact.
- Inputs may consume only artifacts already marked `ready`.
- Respect each binding's `on_exists` rule (`fail`, `overwrite`, or `version`).
- Required capabilities, policy checks, and fallback behavior are defined in the
  [workflow orchestrator](.agents/skills/workflow-orchestrator/SKILL.md).
- `.workflow/` is runtime data and generated output; it is ignored by Git and
  must not be used as source context for a clean repository publication.

## User decisions and resumption

When a composed Skill needs an answer, persist:

```yaml
state: active
current:
  status: awaiting_user
```

When `.workflow/work-item.yaml` has `state: active` and
`current.status: awaiting_user`, resume the current composed binding only when
the user's ordinary message directly answers the pending question in
`awaiting.summary`. Do not ask the user to invoke an intermediate Skill.

Do not resume an active work item for an unrelated, ambiguous, or new request.
If no active work item exists, start a new one only through the project entry
Skill using the client's native mechanism; `$project-workflow` is only the
Codex-style example shown above.

## Blocking and safety boundaries

- If the recipe has no steps, ask the user to define the first ordered step.
- If the recipe is invalid, report the exact invalid field and stop.
- If a binding declares `user_explicit`, treat it as blocked in a hands-off
  recipe.
- Apply the declared `on_blocked` behavior; otherwise use the workflow default.
- Never overwrite a user's accepted artifact or state without the declared
  collision policy.
- Keep external Skills and generated trial artifacts out of this repository;
  install external Skills independently in the consuming environment.

## Repository hygiene

Keep the repository portable and methodology-neutral. Do not commit credentials,
host-specific configuration, generated `.workflow/` state, scratch output, or
vendored copies of external Skills. Update the README when the public entry
point or recipe contract changes.
