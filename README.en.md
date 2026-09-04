# YAML-driven personal workflow

**[Leer en español](README.md)**

This repository is an instruction-only workflow framework for clients that implement the Agent Skills standard. It provides one logical entry point and lets a project-local `workflow.yaml` declare which Skills are composed, in what order, and which durable handoffs they produce. `$project-workflow` is a Codex-style invocation example; other compatible clients use their own native entrypoint mechanism. It is not an application and does not include third-party Skills.

## Quick path

1. Clone this repository into a project using a client that supports the Agent Skills standard and local Skills.
2. Copy [`workflow.example.yaml`](workflow.example.yaml) to `workflow.yaml`, or adapt the existing recipe.
3. Install the Skills named by the recipe separately. The example recipe requires `grilling` and `writing-plans`; they are not included here.
4. Invoke the entry Skill through your client's native mechanism. In Codex-style clients:

   ```text
   $project-workflow
   Design a small onboarding workflow for my project.
   ```

5. Inspect generated state and artifacts under `.workflow/`.

## Architecture

```text
Codex example: $project-workflow → workflow.yaml → workflow-orchestrator → .workflow/
       input            recipe              composition            state and handoffs
```

| Component | Responsibility |
| --- | --- |
| [`workflow.yaml`](workflow.yaml) | Source of truth for steps, bindings, transitions, and artifacts. |
| [`workflow.schema.yaml`](workflow.schema.yaml) | JSON Schema Draft 2020-12 for structural validation and optional editor completion. |
| [`project-workflow`](.agents/skills/project-workflow/SKILL.md) | Entry point: validates the recipe, persists state, and follows transitions. |
| [`workflow-orchestrator`](.agents/skills/workflow-orchestrator/SKILL.md) | Neutral contract for composing Skills and managing handoffs. |
| `.agents/skills/<name>/SKILL.md` | Canonical local Skill source; the adapter may map it to the client's native path. |
| `.workflow/` | Runtime state and generated artifacts; not source code. |

`compose` applies a local Skill in the active host context; it does not start an independent host invocation. Each binding persists its result before the next binding consumes it.

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

- The canonical Skill source must exist at `.agents/skills/<name>/SKILL.md`, with matching `name` frontmatter; the client adapter may discover it from its native path through mapping or configuration.
- `inputs` should consume only earlier artifacts in `ready` state.
- `on_success` points to a later step or `complete`; it does not infer extra work.
- Define each artifact once and preserve its lineage.

See the [recipe schema](.agents/skills/workflow-orchestrator/references/recipe-schema.md), [artifact contract](.agents/skills/workflow-orchestrator/references/artifact-contract.md), and [delegation contract](.agents/skills/workflow-orchestrator/references/delegation-contract.md) for full details.

The [workflow orchestrator](.agents/skills/workflow-orchestrator/SKILL.md) defines host capability boundaries, fallback behavior, and how recipe intents such as `model`, `reasoning_effort`, `delegation`, and `execution: parallel` are interpreted.

[`workflow.schema.yaml`](workflow.schema.yaml) checks structure, types, and
basic enums. Semantic validation—transitions, artifact readiness and lineage,
Skill eligibility, and host capabilities—remains the orchestrator's
responsibility.

## Execution and boundaries

When the entry Skill runs, the workflow loads and validates the recipe, composes each eligible binding, and persists handoffs under `.workflow/`. Resolve any user decision or blocked binding before expecting terminal `completed` state.

`.workflow/` and external Skills are not included in the published repository. Install the Skills named by your recipe on the host separately. There is no application runtime, package manager, database, or service to install: you only need a client that implements the Agent Skills standard, can map or configure this repository's canonical `.agents/skills/` source to its native path, and honors the capability and composition contracts. Compatibility with clients that do not implement that standard is not promised.
