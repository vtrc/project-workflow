# Project Workflow

**[Leer en español](README.md)**

When a task needs several instruction sets, it is easy to lose the order, pass
results incorrectly, or repeat steps. Project Workflow solves that problem by
turning existing Skills into a defined workflow. A Skill is a reusable set of
instructions that tells an AI agent how to perform a task. You provide existing
local or third-party Skills; you do not need to create or rewrite them—just make
them available and declare them in `workflow.yaml`. That file defines the order
in which to apply them, the inputs they receive, and the outputs or artifacts
they produce. This repository provides the instructions for composing them,
resulting in a coordinated workflow and its artifacts.

The compatible client loads and applies those instructions; this repository does
not add a runtime that executes processes on its own.

## 1. What it is

The project provides an entry Skill (`project-workflow`) and an orchestrator
(`workflow-orchestrator`) for following a YAML recipe. The recipe is the source
of truth: it does not choose Skills automatically or invent stages. You can use
the Skills in this repository, your own Skills, or Skills published by third
parties, as long as the client can discover them.

## 2. How it works

```text
Existing Skills (local or third-party)
      ↓
workflow.yaml defines order, inputs, and outputs
      ↓
project-workflow composes the Skills in the client
      ↓
Completed workflow + artifacts under .workflow/
```

The user activates only the entry Skill through the client's native mechanism.
`$project-workflow` is only a Codex-style invocation example; it is not a
universal command. Do not invoke intermediate Skills manually: the entry Skill
composes them in the client's active context.

## 3. Minimal complete example

This is a complete `workflow.yaml` that is valid against the included schema.
Replace `my-clarification-skill` and `my-planning-skill` with Skills installed in
your project; their names must exactly match the `name` field in each
`SKILL.md`.

```yaml
# yaml-language-server: $schema=./workflow.schema.yaml
id: my-personal-workflow
artifact_root: .workflow/artifacts
default_delegation: inline
default_on_blocked: ask_user
default_invocation: compose
model: host_default
reasoning_effort: host_default

steps:
  - id: first-step
    execution: sequential
    completion: all_required
    delegation: inline
    inputs: [user-request]
    outputs: [first-output]
    on_success: second-step
    on_blocked: ask_user
    skills:
      - name: my-clarification-skill
        role: primary
        invocation: compose
        artifact: first-output
        output_file: .workflow/artifacts/first-output.md
        on_exists: version

  - id: second-step
    execution: sequential
    completion: all_required
    delegation: inline
    inputs: [first-output]
    outputs: [final-output]
    on_success: complete
    on_blocked: ask_user
    skills:
      - name: my-planning-skill
        role: primary
        invocation: compose
        artifact: final-output
        output_file: .workflow/artifacts/final-output.md
        on_exists: version
```

`user-request` represents the initial request registered by the client; a
step's artifacts can become inputs to a later step. The `model`,
`reasoning_effort`, `delegation`, and `execution` fields are intents interpreted
by the client adapter, not universal commands.

## 4. Installation and first use

1. Clone this repository, or copy its Skills and references into the project you
   want to automate.
2. Copy [`workflow.example.yaml`](workflow.example.yaml) to `workflow.yaml` and
   adapt its steps, Skills, and artifacts.
3. Install the Skills named by your recipe (see the next section).
4. Activate `project-workflow` through your client's native mechanism and write
   the request. The workflow continues until it completes, blocks, or needs a
   decision.
5. Inspect generated artifacts under `.workflow/`.

## 5. Install this framework's Skills

From the consuming project, run:

```text
npx skills add https://github.com/vtrc/project-workflow \
  --skill project-workflow \
  --skill workflow-orchestrator
```

The command does **not** install the root recipe or any external Skills it
references. To use a recipe, copy or adapt
[`workflow.example.yaml`](workflow.example.yaml) to `workflow.yaml` and follow
the dependencies declared there.

## 6. External Skills and dependencies

Skills named in `workflow.yaml` must be installed separately. This repository's
current recipe uses `grilling` and `writing-plans` as examples of external
Skills: they are **not required**, are not included here, and can be replaced by
local or third-party Skills suited to your work.
If you run the included `workflow.yaml` without changing it, install those
Skills or replace them in the recipe.

For each name, the client must find a `SKILL.md` whose `name` frontmatter value
matches exactly. `.agents/skills/` is this repository's canonical local Skill
source; an adapter may map it to the client's native path.

## 7. What it includes, excludes, and limits

Includes:

- [`project-workflow`](.agents/skills/project-workflow/SKILL.md), the entry
  Skill.
- [`workflow-orchestrator`](.agents/skills/workflow-orchestrator/SKILL.md), the
  coordination contract.
- The [`workflow.example.yaml`](workflow.example.yaml) template, schema, and
  technical contracts.

Does not include:

- an application runtime, server, MCP, database, or package manager;
- external Skills or dependencies for a particular recipe;
- generated `.workflow/` state.

It targets clients that implement the Agent Skills standard, not arbitrary
clients. The framework relies on the client to discover and load Skills, persist
project state, and apply instructions. It does not promise runtime enforcement
and cannot force a client to execute a Skill as an independent operation;
`compose` applies its instructions in the active context.

## 8. Technical references

- [`workflow.schema.yaml`](workflow.schema.yaml): JSON Schema Draft 2020-12 for
  structure, types, and basic enums.
- [Recipe schema reference](.agents/skills/workflow-orchestrator/references/recipe-schema.md):
  fields, defaults, and structural and semantic validation limits.
- [Artifact contract](.agents/skills/workflow-orchestrator/references/artifact-contract.md):
  artifact state, ownership, collisions, and lineage.
- [Delegation contract](.agents/skills/workflow-orchestrator/references/delegation-contract.md):
  composition and handoff boundaries between steps.
- [Entry Skill](.agents/skills/project-workflow/SKILL.md) and
  [orchestrator](.agents/skills/workflow-orchestrator/SKILL.md): executable
  contracts for Agent Skills-compatible clients.

The references use internal terms such as **binding** (a Skill declaration
inside a step), **readiness** (an artifact ready to consume), and **lineage**
(its origin and producer relationship). You do not need these terms to get
started.
