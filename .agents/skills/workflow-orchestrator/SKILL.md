---
name: workflow-orchestrator
description: "Trigger: ordered recipe workflows. Compose declared local Skills, persist step-owned artifacts, and advance only through .workflow/workflow.yaml."
license: Apache-2.0
metadata:
  author: project
  version: "1.2"
---

# Workflow Orchestrator

## Activation Contract

Use when a project work item is governed by `.workflow/workflow.yaml` in an
Agent Skills-compatible client. Resolve only the recipe's declared local Skills;
do not choose a workflow, Skill, or stage. The client invokes the project entry
Skill through its own native mechanism; `$project-workflow` is only a Codex-style
example.

## Hard Rules

- Treat the recipe as the sole authority for step topology, inputs, prompts,
  bindings, models, delegation, and transitions. Validate it and durable runtime
  state before execution.
- A step owns one public artifact. Its logical artifact ID is `step.id` and its
  derived public path is `.workflow/artifacts/<step.id>.md`.
- Every step has exactly one `primary` binding. Only that primary can publish
  the step's public artifact. `supporting` and `review` bindings contribute
  context to the primary and never publish separate public artifacts.
- `step.outputs` is derived as `[step.id]`; it is not an authored recipe field.
  A step input is `user-request` or the ID of an earlier step.
- The runtime registry exclusively owns status, `run_id`, revisions, checksums,
  lineage, replacement, and collision policy. Do not record those concerns in
  `workflow.yaml` or infer them from a file path.
- The parent workflow is the only manual entry point. A `compose` binding reads
  the named local Skill's `SKILL.md` and applies its instructions in the active
  host context. This is not an independent host invocation or black-box claim.
- Resolve composition generically from the recipe name. Do not copy a referenced
  Skill's instructions into this core or special-case a methodology.
- Compose only an eligible local Skill: its `SKILL.md` exists, its frontmatter
  name matches the binding, and its policy does not prohibit implicit, model, or
  composition invocation.
- Give a composed Skill only declared ready inputs, the step prompt when present,
  its role-specific contract, and the user conversation needed for this work
  item. The orchestrator alone updates the Work Item Record, Artifact Registry,
  and transitions.

## Host/client capability boundary

The host must be an Agent Skills-compatible client able to discover and load the
canonical `.agents/skills/<name>/SKILL.md` source (or map it to a native Skill
directory), persist project-relative `.workflow/` state and artifacts, and ask
questions whose later ordinary answers can resume the active work item. The
recipe's `model`, `reasoning_effort`, `delegation`, and `execution: parallel`
values are intents interpreted by the host; they are not universal runtime
commands. Unsupported explicit model or reasoning values block. A host may run
parallel intent sequentially only when completion semantics remain equivalent.
If a required capability or policy is unavailable, record the exact failure and
follow `on_blocked`; never emulate it with a hidden runtime or silently
substitute a client, Skill, or methodology.

## Decision Gates

| Condition | Action |
| --- | --- |
| `steps` is empty | Ask the user to declare the first ordered step. |
| A step has zero or multiple `primary` bindings | Mark the step blocked before composing any binding. |
| Current binding is `compose` | Resolve it, apply its instructions, and retain it until it completes, blocks, or awaits the user. |
| Current binding is `user_explicit` | Mark it blocked: this opt-out is incompatible with a hands-off recipe. |
| Current binding is `host_permitted` | Use only a host capability explicitly proven by the capability boundary above; otherwise mark it blocked. |
| A composed Skill awaits a user answer | Persist `state: active` and `current.status: awaiting_user`; do not advance. |
| A required binding blocks | Follow the step's `on_blocked`, or the workflow default. |

## Execution Steps

1. Load `.workflow/workflow.yaml`, `.workflow/work-item.yaml`,
   `.workflow/artifact-registry.yaml`, and the references below.
2. For a new request, create durable work-item state, register `user-request` as
   ready source context, and select the first declared step.
3. Validate root settings, ordered transitions, local binding resolution,
   composition eligibility, input readiness, unique step IDs, exactly one
   primary, and model-resolution hierarchy.
4. Compose `supporting` and `review` bindings only to produce context for the
   primary. They do not receive a public-artifact publishing contract.
5. Compose the primary with the ready inputs, optional `step.prompt`, and the
   derived artifact ID and path. The primary writes
   `.workflow/artifacts/<step.id>.md` when it succeeds and returns the required
   structured step result.
6. Validate that structured result against the active step and registry. File
   existence alone is not success: the result must identify the step, primary,
   derived artifact, outcome, and input lineage. The registry records runtime
   metadata and exposes the artifact only after successful validation.
7. Persist `awaiting_user`, `completed`, or `blocked` as appropriate, then
   follow the declared transition. Continue until the workflow awaits the user,
   blocks, or completes.

## Structured Step Result

A primary result must be structured data containing at least:

- `step_id` and `primary` — identity of the completed step and its producer;
- `outcome` — `completed`, `blocked`, or `awaiting_user`;
- `artifact_id` and `artifact_path` — equal to the derived `step.id` and
  `.workflow/artifacts/<step.id>.md` on completion;
- `inputs` — consumed source IDs and their registered lineage; and
- `summary` — a durable handoff statement for the next step.

The registry, not the producer result, assigns runtime status, `run_id`,
revision, checksum, lineage record, replacement, and collision outcome.

## Output Contract

Return the work-item identifier, current step and binding, structured result
outcome, registered artifact, durable state, and next declared action.

## References

- [Recipe schema](references/recipe-schema.md) — validate and interpret the recipe.
- [Artifact contract](references/artifact-contract.md) — persist state and artifact handoffs.
- [Delegation contract](references/delegation-contract.md) — composition and bounded handoffs.
