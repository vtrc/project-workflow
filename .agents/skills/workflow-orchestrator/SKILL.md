---
name: workflow-orchestrator
description: "Trigger: ordered recipe workflows. Compose declared local Skills, persist artifacts, and advance only through workflow.yaml."
license: Apache-2.0
metadata:
  author: project
  version: "1.1"
---

# Workflow Orchestrator

## Activation Contract

Use when a project work item is governed by `workflow.yaml` in an Agent
Skills-compatible client. Resolve only the recipe's declared local Skills; do
not choose a workflow, Skill, or stage. The client invokes the project entry
Skill through its own native mechanism; `$project-workflow` is only a Codex-style
example.

## Hard Rules

- Treat the recipe as the sole authority for steps, bindings, models,
  delegation, and transitions. Validate it and the durable work-item state.
- Check the host/client capability boundary and policy before execution.
- The parent workflow is the only manual entry point. A `compose` binding reads
  the named local Skill's `SKILL.md` and applies its instructions in the active
  host context. This is not an independent host invocation or black-box claim.
- Resolve composition generically from the recipe name. Do not copy a referenced
  Skill's instructions into this core or special-case a methodology.
- Compose only an eligible local Skill: its `SKILL.md` exists, its frontmatter
  name matches the binding, and its policy does not prohibit implicit, model, or
  composition invocation.
- Give a composed Skill only declared ready inputs, its output contract, and the
  user conversation needed for this work item. The orchestrator alone updates
  the Work Item Record, Artifact Registry, and transitions.

## Host/client capability boundary

The host must be an Agent Skills-compatible client able to discover and load the
canonical `.agents/skills/<name>/SKILL.md` source (or map it to a native Skill
directory), persist project-relative `.workflow/` state and artifacts, and ask
questions whose later ordinary answers can resume the active work item. The
recipe's `model`, `reasoning_effort`, `delegation`, and `execution: parallel`
values are intents interpreted by the host; they are not universal runtime
commands. Unsupported explicit model or reasoning values block. Parallel work
may fall back to sequential only when completion semantics remain equivalent;
`delegation: auto` may fall back inline only when host policy permits. If a
required capability or policy is unavailable, record the exact failure and
follow `on_blocked`; never emulate it with a hidden runtime or silently
substitute a client, Skill, or methodology.

## Decision Gates

| Condition | Action |
| --- | --- |
| `steps` is empty | Ask the user to declare the first ordered step. |
| Current binding is `compose` | Resolve it, apply its instructions, and retain it until it completes, blocks, or awaits the user. |
| Current binding is `user_explicit` | Mark it blocked: this opt-out is incompatible with a hands-off recipe. |
| Current binding is `host_permitted` | Use only a host capability explicitly proven by the capability boundary above; otherwise mark it blocked. |
| A composed Skill awaits a user answer | Persist `state: active` and `current.status: awaiting_user`; do not advance. |
| A required binding blocks | Follow the step's `on_blocked`, or the workflow default. |

## Execution Steps

1. Load `workflow.yaml`, `.workflow/work-item.yaml`,
   `.workflow/artifact-registry.yaml`, and the references below.
2. For a new request, create the durable work-item state, register the user
   request as ready source context, and select the first declared binding.
3. Validate root settings, order and transitions, local binding resolution,
   composition eligibility, input readiness, ownership, output collisions, and
   model-resolution hierarchy.
4. For `compose`, read the selected local `SKILL.md` and apply its instructions
   in this context. Persist `awaiting_user`, `completed`, or `blocked`. For a
   composed clarification Skill, remain on the binding while it awaits answers;
   only after shared understanding is explicitly confirmed may its declared brief
   be written and registered.
5. On completion, write or register only the binding's declared artifact, apply
   its collision rule, then transition. Continue through later `compose`
   bindings until the workflow awaits the user, blocks, or completes.

## Output Contract

Return the work-item identifier, current step and binding, composition outcome,
registered artifacts, durable state, and next declared action.

## References

- [Recipe schema](references/recipe-schema.md) — validate and interpret the recipe.
- [Artifact contract](references/artifact-contract.md) — persist state and artifact handoffs.
- [Delegation contract](references/delegation-contract.md) — composition and bounded handoffs.
