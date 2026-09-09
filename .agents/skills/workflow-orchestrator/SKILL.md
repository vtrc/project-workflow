---
name: workflow-orchestrator
description: "Trigger: ordered dependency-graph workflows. Prepare ready Step inputs, delegate one Step runner, and register its Step-owned artifact."
license: Apache-2.0
metadata:
  author: project
  version: "2.0"
---

# Workflow Orchestrator

## Activation Contract

Use when a project work item is governed by `.workflow/workflow.yaml`. The
orchestrator resolves the declared recipe and local Skills; it does not choose a
workflow or independently invoke a Skill.

## Hard Rules

- `inputs` is the authored dependency graph. A Step is ready only when every
  declared input ID has a ready artifact in the runtime registry.
- Every Step has exactly one `primary` binding. Supporting and review bindings
  provide context; only the primary publishes the Step's public artifact.
- The derived artifact ID is `step.id` and the derived path is
  `.workflow/artifacts/<step.id>.md`. Artifact output paths are never authored.
- Workflow and Step `model`, `reasoning_effort`, and `delegation` are host policy
  intents. Skill bindings contain only `name` and `role`.
- The runtime registry owns status, run IDs, revisions, checksums, lineage,
  replacement, and collision handling.
- The orchestrator never independently invokes Skills. It delegates one Step
  execution unit according to the resolved Step-level delegation policy.

## Step-runner handoff

The delegated Step runner receives:

1. the user conversation for the work item;
2. every declared ready input artifact, in recipe order;
3. the optional `step.prompt`; and
4. the workflow and Step model, reasoning, and delegation policies.

The Step runner loads the Step's supporting and review Skills for context, then
loads the primary Skill to perform the public work. A successful primary returns
a structured result and writes only `.workflow/artifacts/<step.id>.md`.

## Execution Steps

1. Load the recipe, Work Item Record, and runtime Artifact Registry.
2. Validate ordered unique Step IDs, preceding input IDs, an acyclic graph, and
   exactly one primary binding per Step.
3. Find Steps whose `inputs` are all ready. Roots use `inputs: []`; multiple
   consumers create fan-out and multiple input IDs create joins.
4. Resolve the Step's delegation, model, and reasoning policy and delegate one
   Step runner with the complete handoff above.
5. Validate the structured primary result against the active Step, derived
   artifact identity, and input lineage. File existence alone is not success.
6. Ask the runtime registry to register the one derived artifact and its runtime
   metadata. Only a ready registration unlocks downstream Steps.
7. When a Step blocks or needs information, persist resumable state and always
   ask the user. There is no authored blocked-policy field.

## Structured Step Result

A primary result contains at least `step_id`, `primary`, `outcome`,
`artifact_id`, `artifact_path`, consumed `inputs` with lineage, and a durable
`summary`. On success, `artifact_id` and `artifact_path` must equal the derived
Step ID and path. Primary success plus registry registration defines Step completion.

## References

- [Recipe schema](references/recipe-schema.md)
- [Artifact contract](references/artifact-contract.md)
- [Delegation contract](references/delegation-contract.md)
