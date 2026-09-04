# YAML-driven personal workflow

**[Leer en español](README.md)**

This repository is an instruction-only workflow framework for Codex-compatible Agent Skills. It provides one entry point, `$workflow-personal`, and lets a project-local `workflow.yaml` declare which Skills are composed, in what order, and which durable handoffs they produce. It is not an application and does not include third-party Skills.

## Quick path

1. Clone this repository into a project that supports local Agent Skills.
2. Copy [`workflow.example.yaml`](workflow.example.yaml) to `workflow.yaml`, or adapt the existing recipe.
3. Install the Skills named by the recipe separately. The example recipe requires `grilling` and `writing-plans`; they are not included here.
4. Run the entry point:

   ```text
   $workflow-personal
   Design a small onboarding workflow for my project.
   ```

5. Inspect generated state and artifacts under `.workflow/`.

## Architecture

```text
$workflow-personal → workflow.yaml → workflow-orchestrator → .workflow/
       input            recipe              composition            state and handoffs
```

| Component | Responsibility |
| --- | --- |
| [`workflow.yaml`](workflow.yaml) | Source of truth for steps, bindings, transitions, and artifacts. |
| [`workflow-personal`](.agents/skills/workflow-personal/SKILL.md) | Entry point: validates the recipe, persists state, and follows transitions. |
| [`workflow-orchestrator`](.agents/skills/workflow-orchestrator/SKILL.md) | Neutral contract for composing Skills and managing handoffs. |
| `.agents/skills/<name>/SKILL.md` | Local Skill selected by the recipe. |
| `.workflow/` | Runtime state and generated artifacts; not source code. |

`compose` applies a local Skill in the current agent context; it does not start an independent host invocation. Each binding persists its result before the next binding consumes it.

## Configuration

Start with [`workflow.example.yaml`](workflow.example.yaml). A recipe defines an ordered list of steps and bindings; each binding references a local Skill and an artifact:

```yaml
skills:
  - name: my-local-skill       # exact SKILL.md frontmatter name
    role: primary
    invocation: compose
    artifact: result-note
    output_file: .workflow/artifacts/result-note.md
    on_exists: version         # fail, overwrite, or version
```

Key rules:

- The Skill must exist at `.agents/skills/<name>/SKILL.md`, with matching `name` frontmatter.
- `inputs` should consume only earlier artifacts in `ready` state.
- `on_success` points to a later step or `complete`; it does not infer extra work.
- Define each artifact once and preserve its lineage.

See the [recipe schema](.agents/skills/workflow-orchestrator/references/recipe-schema.md), [artifact contract](.agents/skills/workflow-orchestrator/references/artifact-contract.md), and [delegation contract](.agents/skills/workflow-orchestrator/references/delegation-contract.md) for full details.

## Execution and boundaries

When `$workflow-personal` runs, the workflow loads and validates the recipe, composes each eligible binding, and persists handoffs under `.workflow/`. Resolve any user decision or blocked binding before expecting terminal `completed` state.

`.workflow/` and external Skills are not included in the published repository. Install the Skills named by your recipe on the host separately. There is no application runtime, package manager, database, or service to install: you only need an Agent Skills-capable host that honors `.agents/skills/` and the composition contract.
