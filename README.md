# YAML-driven personal workflow

This repository is a small, instruction-only workflow framework for Codex-compatible Agent Skills. It gives you one explicit entry point, `$workflow-personal`, and lets a project-local `workflow.yaml` declare which Skills are composed, in what order, and which durable handoffs they produce.

It is **not** an application implementation and it does not vendor third-party Skills. Runtime state and the previous registration trial are intentionally kept out of a published clone.

## Quick path

1. Clone this repository into a project that supports project-local Agent Skills.
2. Keep or create `workflow.yaml` from [`workflow.example.yaml`](workflow.example.yaml).
3. Install or provide the Skills named by your recipe separately; they are not included here.
4. Invoke the only manual entry point with your request:

   ```text
   $workflow-personal
   Design a small onboarding workflow for my project.
   ```

5. Inspect the generated state and artifacts under `.workflow/` locally. That directory is ignored and is never part of the package.

## How it works

```text
$workflow-personal
        │
        ▼
workflow.yaml ── validates order, bindings, inputs, outputs, and policy
        │
        ▼
workflow-orchestrator ── composes each eligible local Skill in the active context
        │
        ▼
.workflow/ ── work-item state, artifact registry, and generated handoffs
```

The framework separates **orchestration** from **methodology**:

| Part | Responsibility |
| --- | --- |
| [`workflow.yaml`](workflow.yaml) | The ordered recipe and its execution intent. It is the source of truth for steps, bindings, transitions, and artifacts. |
| [`workflow-personal`](.agents/skills/workflow-personal/SKILL.md) | The only user-facing entry point. It loads and validates the recipe, persists state, composes bindings, and follows transitions. |
| [`workflow-orchestrator`](.agents/skills/workflow-orchestrator/SKILL.md) | The neutral execution contract and recipe/artifact rules. It does not select a methodology. |
| `.agents/skills/<name>/SKILL.md` | A project-local Skill selected by the recipe. Its frontmatter name must match the binding. |
| `.workflow/` | Generated work-item state, artifact registry, and outputs. It is runtime data, not source code. |

`compose` means that the parent workflow reads and applies a named local Skill in the current agent context. It is not an independent nested host invocation. The orchestrator records the binding and outcome before the next binding consumes its output.

## Configure `workflow.yaml`

Start with [`workflow.example.yaml`](workflow.example.yaml), then replace the placeholder Skill names and artifact identifiers. The current [`workflow.yaml`](workflow.yaml) is a concrete trial recipe and references Skills that are deliberately excluded from this repository.

### Root settings

| Field | Meaning |
| --- | --- |
| `id` | Stable recipe identifier. |
| `artifact_root` | Project-relative directory for generated handoffs. |
| `default_delegation` | `inline`, `subagent`, or `auto`; used when a step does not override it. |
| `default_on_blocked` | `ask_user` or `stop`. |
| `default_invocation` | Usually `compose` for a hands-off workflow. |
| `model`, `reasoning_effort` | `inherit`, `host_default`, or a value supported by the host. |
| `steps` | A non-empty ordered list of workflow steps. |

### Step and binding rules

Each step declares `id`, `execution`, `completion`, `on_success`, and at least one Skill binding. A binding normally contains:

```yaml
skills:
  - name: my-local-skill       # exact local SKILL.md frontmatter name
    role: primary              # primary, supporting, review, or fallback
    invocation: compose
    artifact: result-note      # logical ID in the runtime registry
    output_file: .workflow/artifacts/result-note.md
    on_exists: version         # fail, overwrite, or version
```

Before composition, the local Skill must:

- exist at `.agents/skills/<name>/SKILL.md`;
- expose matching frontmatter `name`; and
- not opt out of implicit, model, or composition invocation in `agents/openai.yaml`.

Inputs must identify ready artifacts from earlier bindings. `on_success` may name only a later step or `complete`; transitions do not infer extra work. Keep one owner per artifact and persist the handoff before a later binding reads it.

## Adapting the recipe

1. Copy [`workflow.example.yaml`](workflow.example.yaml) to `workflow.yaml` for a new workflow, or edit the existing recipe.
2. Give every step a unique ID and keep the steps in execution order.
3. Replace `my-*-skill` with the exact names of Skills available in your clone or host.
4. Define each handoff once with an `artifact` ID and, when it is file-backed, an `output_file` under `.workflow/`.
5. Set `inputs` to artifacts that are already `ready`; do not use conversational summaries as a substitute.
6. Choose `on_exists: fail` for strict collision detection, `overwrite` only for an owner-controlled replacement, or `version` when each run should preserve a distinct artifact.
7. Run `$workflow-personal` and resolve any user decision or blocked binding before expecting a terminal `completed` state.

The recipe schema and lifecycle details are documented in the local references:

- [`recipe-schema.md`](.agents/skills/workflow-orchestrator/references/recipe-schema.md)
- [`artifact-contract.md`](.agents/skills/workflow-orchestrator/references/artifact-contract.md)
- [`delegation-contract.md`](.agents/skills/workflow-orchestrator/references/delegation-contract.md)

## External Skills and dependencies

The repository contains only the workflow framework and its contracts. These Skills are intentionally **not** packaged:

- `grill-me`
- `grilling`
- `writing-plans`

The concrete trial recipe names `grilling` and `writing-plans`; install equivalent Skills separately or change the recipe to names available in your environment. `grill-me` is also excluded because it is an external entry-point adapter, not a framework dependency.

There is no application runtime, package manager lockfile, database, or service to install. The practical prerequisite is an Agent Skills-capable host that can read `.agents/skills/` and honor the composition contract.

## What is intentionally ignored

`.gitignore` excludes:

- all `.workflow/` state and generated artifacts, including the registration-trial result;
- local `outputs/` and `work/` scratch directories;
- the excluded external Skills listed above; and
- editor, OS, log, and temporary files.

Do not commit credentials, host-specific configuration, or generated work-item data. Keep portable configuration in `workflow.yaml` or the example template.

## Repository checklist

- [ ] `workflow.yaml` names only Skills available to the target clone.
- [ ] Every binding has a clear role, input lineage, and output owner.
- [ ] Generated `.workflow/` state is absent from the published package.
- [ ] External Skills are installed independently and are not copied into this repository.

