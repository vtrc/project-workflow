---
name: project-workflow
description: "Trigger: project workflow. Start one YAML-declared work item and compose local Skills without intermediate user invocations."
license: Apache-2.0
metadata:
  author: project
  version: "1.1"
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

## Decision Gates

| Condition | Action |
| --- | --- |
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
2. Validate order, fields, artifact readiness and ownership, transitions,
   collisions, local Skill eligibility, and resolved execution intent.
3. Compose the current eligible binding exactly as declared. If it asks the user
   questions, persist the pending state and ask them; do not produce output or
   advance until that Skill's completion condition is met. For a composed
   clarification Skill, do not advance while answers are pending; after shared
   understanding is explicitly confirmed, write and register its declared brief
   before continuing automatically.
4. On completion, produce and register the declared artifact, update both
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
