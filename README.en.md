# Project Workflow

**[Leer en español](README.md)**

## An example before you start

Imagine asking: **“Design a registration flow for my project.”** Project Workflow
connects local Skills through `.workflow/workflow.yaml`. The orchestrator prepares
a ready Step, delegates one Step runner, and the primary Skill publishes one
artifact derived from that Step ID. You do not invoke intermediate Skills by hand.

## How it works

```text
User conversation
        ↓
.workflow/workflow.yaml (inputs dependency graph)
        ↓
Delegated Step runner
        ├─ supporting/review Skills provide context
        └─ primary Skill publishes one derived artifact
        ↓
.workflow/artifacts/<step.id>.md
        ↓
Steps whose inputs are now ready
```

The runtime registry, not the recipe, owns status, attempts, run IDs, revisions,
checksums, lineage, replacements, and collision policy.

## Canonical recipe

```yaml
# yaml-language-server: $schema=../workflow.schema.yaml
id: register-design-workflow
default_delegation: subagent
model: host_default
reasoning_effort: host_default
steps:
  - id: clarify-request
    inputs: []
    skills:
      - name: grilling
        role: primary
  - id: make-plan
    inputs: [clarify-request]
    prompt: Turn the clarification into an actionable plan.
    skills:
      - name: writing-plans
        role: primary
```

A root uses `inputs: []`. Every later Step lists only preceding Step IDs. Multiple
children can consume one parent (fan-out), and a Step with multiple inputs is a
join that waits for every referenced ready artifact. Graph readiness is derived
from `inputs`; there are no authored transitions, output declarations, or
per-Skill invocation controls.

`model`, `reasoning_effort`, and `delegation` are workflow/Step policy intents.
Bindings contain only a Skill `name` and `role`: exactly one `primary`, plus
optional `supporting` and `review` Skills. The delegated Step runner loads all of
them, while only the primary produces `.workflow/artifacts/<step.id>.md`.

If a Step is blocked or needs a decision, the runtime persists resumable state and
asks the user. There is no authored blocked-policy field.

## Legacy imports

The reader may accept retired artifact declarations only when they redundantly
match the derived Step ID/path. Canonical authored output omits them. Retired
transition, execution, completion, invocation, binding override, or blocked-policy
fields are not silently discarded: incompatible values produce a field-specific
migration diagnostic.

## Installation and first use

```text
git clone https://github.com/vtrc/project-workflow.git
cd project-workflow
mkdir -p .workflow && cp workflow.example.yaml .workflow/workflow.yaml
```

Replace the placeholder Skills with Skills available in your client, then activate
only the `project-workflow` entry Skill through the client's native mechanism.

## Technical references

- [`workflow.schema.yaml`](workflow.schema.yaml): JSON Schema Draft 2020-12.
- [Recipe schema](.agents/skills/workflow-orchestrator/references/recipe-schema.md).
- [Artifact contract](.agents/skills/workflow-orchestrator/references/artifact-contract.md).
- [Delegation contract](.agents/skills/workflow-orchestrator/references/delegation-contract.md).
- [Workflow orchestrator](.agents/skills/workflow-orchestrator/SKILL.md).
