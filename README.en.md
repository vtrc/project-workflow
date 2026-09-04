# Project Workflow

**[Leer en español](README.md)**

## An example before you start

Imagine asking: **“Design a registration flow for my project.”** You already
have two Skills available: `grilling` asks questions to clarify what you need,
and `writing-plans` turns the answers into a plan. Project Workflow connects
those Skills through a `workflow.yaml` recipe: it first saves the answers and
then gives them to the planning Skill. You get a coordinated workflow and its
artifacts without invoking each Skill by hand.

You do not need to create or rewrite the Skills. Just make existing local or
third-party Skills available and declare them in `workflow.yaml`. This
repository provides the instructions that connect those pieces; it does not add
a program that runs on its own.

## How it works

```text
Request: “Design a registration flow”
        ↓
workflow.yaml
        ↓
Skill 1: grilling
        ↓
Intermediate result: clarified-brief.md
        ↓
Skill 2: writing-plans
        ↓
Final result: implementation-plan.md
```

The two Skills in the diagram are only an example. The current recipe names
them, but the framework does not include or require them: you can replace them
with local or third-party Skills that do the work you need.

## Three concepts to start

### 1. Skill

A Skill is a reusable set of instructions that tells an AI agent how to perform
a specific task. It can live in your project or come from a third party.

### 2. `workflow.yaml`

This is the workflow recipe. It says which Skills to use, in what order, what
information each one receives, what results it produces, and which step comes
next. It also says where to save artifacts—the results that you can read or
pass to another step.

### 3. Project Workflow

This is the project/framework in this repository. It reads `workflow.yaml` and
composes the Skills you already have through the client you are using. The
client loads and applies their instructions; Project Workflow coordinates the
sequence and artifacts.

## Minimal complete YAML

The following file implements the registration example and contains every
section required for a valid recipe. `grilling` and `writing-plans` must be
available in your client if you run this example unchanged.

```yaml
# yaml-language-server: $schema=./workflow.schema.yaml
id: register-design-workflow
artifact_root: .workflow/artifacts
default_delegation: inline
default_on_blocked: ask_user
default_invocation: compose
model: host_default
reasoning_effort: host_default

steps:
  - id: clarify-request
    execution: sequential
    completion: all_required
    delegation: inline
    inputs: [user-request]
    outputs: [clarified-brief]
    on_success: make-plan
    on_blocked: ask_user
    skills:
      - name: grilling
        role: primary
        invocation: compose
        artifact: clarified-brief
        output_file: .workflow/artifacts/clarified-brief.md
        on_exists: version

  - id: make-plan
    execution: sequential
    completion: all_required
    delegation: inline
    inputs: [clarified-brief]
    outputs: [implementation-plan]
    on_success: complete
    on_blocked: ask_user
    skills:
      - name: writing-plans
        role: primary
        invocation: compose
        artifact: implementation-plan
        output_file: .workflow/artifacts/implementation-plan.md
        on_exists: version
```

### How to read the example

- The opening fields (`id`, `artifact_root`, and the `default_*` values) identify
  the workflow and its general defaults.
- `steps` is the ordered list of stages. `clarify-request` receives the initial
  request (`user-request`) and produces `clarified-brief`.
- `on_success: make-plan` says that the second stage starts when the first one
  succeeds. The second stage ends with `on_success: complete`.
- Inside `skills`, `name` must exactly match the name of an available Skill.
  `role: primary` says it is the main Skill for that stage, and
  `invocation: compose` says the entry Skill composes it in the client's active
  context.
- `artifact` identifies the result and `output_file` says where to save it. The
  second stage's `inputs` consumes the artifact produced by the first.
- `model`, `reasoning_effort`, `delegation`, and `execution` are intents
  interpreted by the client adapter; they are not universal commands.

You can start by adapting [`workflow.example.yaml`](workflow.example.yaml),
which uses placeholder Skill names.

## Installation and first use

### Option A: clone the complete repository

```text
git clone https://github.com/vtrc/project-workflow.git
cd project-workflow
cp workflow.example.yaml workflow.yaml
```

Then replace the placeholder Skills with Skills available in your project and
activate `project-workflow` through your client's native mechanism.

### Option B: install only the framework Skills

From the project where you want to use the workflow, run:

```text
npx skills add https://github.com/vtrc/project-workflow --skill project-workflow workflow-orchestrator
```

The command does not install `workflow.yaml`, the root recipe, or any external
Skills it references. To create the recipe, copy or adapt
[`workflow.example.yaml`](workflow.example.yaml) and follow the dependencies
you declare.

### Activate the workflow

The user activates only the `project-workflow` entry Skill through the client's
native mechanism. `$project-workflow` is only a Codex-style invocation example;
it is not a universal command. Do not manually invoke `grilling`,
`writing-plans`, or other intermediate Skills: the entry Skill composes them in
the order declared by `workflow.yaml`.

Generated artifacts are normally saved under `.workflow/`. That directory is
working state, not source code published by this repository.

## What it includes, excludes, and its limits

### Includes

- [`project-workflow`](.agents/skills/project-workflow/SKILL.md), the entry
  Skill.
- [`workflow-orchestrator`](.agents/skills/workflow-orchestrator/SKILL.md), the
  coordination instructions.
- [`workflow.example.yaml`](workflow.example.yaml), the schema, and the
  technical contracts.

### Does not include

- external Skills such as `grilling` or `writing-plans`;
- an application runtime, server, MCP, database, or package manager;
- your project's `workflow.yaml` or generated `.workflow/` state.

This framework targets clients that implement the **Agent Skills** standard: a
format and set of rules for a client to discover and load Skills. `.agents/skills/`
is this repository's canonical Skill source, although an adapter may map it to
the client's native path. Compatibility with arbitrary clients is not promised.

The project is **instruction-only**. The client loads and applies the
instructions, persists state, and decides which capabilities it supports.
There is therefore no runtime enforcement and no guarantee that every client
will execute in parallel, delegate work, or accept a particular model.

## Technical references

- [`workflow.schema.yaml`](workflow.schema.yaml): JSON Schema Draft 2020-12
  for structure, types, and basic enums.
- [Recipe schema reference](.agents/skills/workflow-orchestrator/references/recipe-schema.md):
  fields, inherited values, and validation limits.
- [Artifact contract](.agents/skills/workflow-orchestrator/references/artifact-contract.md):
  artifact state, ownership, collisions, and result lineage.
- [Delegation contract](.agents/skills/workflow-orchestrator/references/delegation-contract.md):
  composition and handoff boundaries between stages.
- [Entry Skill](.agents/skills/project-workflow/SKILL.md) and
  [orchestrator](.agents/skills/workflow-orchestrator/SKILL.md): the full
  instructions applied by a compatible client.

If you need the internal vocabulary, a **binding** is a Skill declaration inside
a stage; **readiness** means an artifact is ready to consume; and **lineage**
describes its origin and relationship to its producer. You do not need these
terms for first use.
