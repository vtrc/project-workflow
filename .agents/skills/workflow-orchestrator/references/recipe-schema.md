# Recipe Schema

`.workflow/workflow.yaml` is the single ordered recipe. It declares workflow
topology, inputs, step behavior, concrete local Skills, and optional step
context. The framework does not choose or supply Skills. This repository uses
`.agents/skills/` as its canonical local Skill source; a client adapter may map
it to the client's native Skill directory. For structural editor validation, use
the repository's [`workflow.schema.yaml`](../../../../workflow.schema.yaml).

The only new authored step field is optional `prompt`. Artifact identity and
path are derived from `step.id`; runtime history and collision handling belong
to the artifact registry, never to the recipe.

## Canonical shape

```yaml
id: <workflow-id>
default_delegation: inline | subagent | auto
default_on_blocked: ask_user | stop
default_invocation: compose | user_explicit | host_permitted
model: inherit | host_default | <host-valid-model>
reasoning_effort: inherit | host_default | <host-valid-reasoning-effort>
steps:
  - id: <step-id>
    prompt: <optional non-empty context for composed Skills>
    execution: sequential | parallel
    completion: all_required | any_success
    model: inherit | host_default | <host-valid-model> # optional
    reasoning_effort: inherit | host_default | <host-valid-reasoning-effort> # optional
    delegation: inline | subagent | auto # optional
    inputs: [user-request | <preceding-step-id>] # optional
    on_success: <later-step-id> | complete
    on_blocked: ask_user | stop # optional
    skills:
      - name: <exact-local-skill-name>
        role: primary | supporting | review
        invocation: compose | user_explicit | host_permitted # optional
        required: true # optional; defaults to true
        model: inherit | host_default | <host-valid-model> # optional
        reasoning_effort: inherit | host_default | <host-valid-reasoning-effort> # optional
```

Root fields are required. A step requires `id`, `execution`, `completion`,
`on_success`, and a non-empty ordered `skills` list. Step identifiers are unique
and `on_success` must name a later declared step or `complete`. Every step has
exactly one `primary` binding.

## Derived artifact contract

A step owns exactly one public artifact:

- Artifact ID: `step.id`.
- Artifact path: `.workflow/artifacts/<step.id>.md`.
- Derived output: `step.outputs` is derived as `[step.id]`; it is not authored.
- Inputs: `user-request` or IDs of preceding steps whose registered artifacts
  are ready.

The `primary` publishes the derived public artifact. Supporting and review
Skills contribute context only to the primary; they never publish separate public
artifacts. A recipe has no alternate producer role.

The runtime registry exclusively owns status, `run_id`, revisions, checksums,
lineage, replacement, and collision policy. These facts are execution history,
not workflow topology. An existing file is never sufficient proof that a step
succeeded: the orchestrator requires the primary's structured step result and
records the validated outcome in the registry.

## Field reference

### Root fields

| Field | Level | Required | Type | Default | Meaning |
| --- | --- | --- | --- | --- | --- |
| `id` | root | yes | non-empty string | — | Stable workflow identity. |
| `default_delegation` | root | yes | string enum | `inline` (schema metadata) | Delegation inherited by steps without `delegation`. |
| `default_on_blocked` | root | yes | string enum | `ask_user` (schema metadata) | Action inherited by steps without `on_blocked`. |
| `default_invocation` | root | yes | string enum | `compose` (schema metadata) | Invocation inherited by bindings without `invocation`. |
| `model` | root | yes | non-empty string | `host_default` (schema metadata) | Workflow-level host model intent. |
| `reasoning_effort` | root | yes | non-empty string | `host_default` (schema metadata) | Workflow-level host reasoning intent. |
| `steps` | root | yes | array, `minItems: 0` | — | Ordered workflow stages; an initialized recipe may leave this empty until its first step is declared. |

### Step fields

| Field | Level | Required | Type | Default | Meaning |
| --- | --- | --- | --- | --- | --- |
| `id` | step | yes | non-empty string | — | Unique stage identity, transition target, and derived artifact ID. |
| `prompt` | step | no | non-empty string | — | Additional context for composed Skills, when their own instructions and declared inputs are insufficient. |
| `execution` | step | yes | string enum | — | `sequential` or `parallel` scheduling intent. |
| `completion` | step | yes | string enum | — | `all_required` or `any_success` completion intent. |
| `model` | step | no | non-empty string | inherited from root | Step-level host model intent. |
| `reasoning_effort` | step | no | non-empty string | inherited from root | Step-level host reasoning intent. |
| `delegation` | step | no | string enum | inherited from `default_delegation` | Step-level delegation intent. |
| `inputs` | step | no | array of source IDs | `[]` | `user-request` or earlier step IDs; each must be ready in the registry. |
| `on_success` | step | yes | non-empty string | — | `complete` or a later declared step ID. |
| `on_blocked` | step | no | string enum | inherited from `default_on_blocked` | Step-level blocked action. |
| `skills` | step | yes | array of bindings, `minItems: 1` | — | Ordered local-Skill bindings with exactly one primary. |

### Binding fields

| Field | Level | Required | Type | Default | Meaning |
| --- | --- | --- | --- | --- | --- |
| `name` | binding | yes | non-empty string | — | Exact local Skill frontmatter name. |
| `role` | binding | yes | string enum | — | `primary`, `supporting`, or `review`. |
| `invocation` | binding | no | string enum | inherited from `default_invocation` | How the binding is invoked. |
| `required` | binding | no | boolean | `true` | Whether the binding participates in the step completion policy. |
| `model` | binding | no | non-empty string | inherited from step and root | Highest-precedence host model intent. |
| `reasoning_effort` | binding | no | non-empty string | inherited from step and root | Highest-precedence host reasoning intent. |

`sequential` and `parallel` describe scheduling intent, not a universal host
capability promise. Resolve `model` as binding, then step, then workflow, then
host configuration; resolve `reasoning_effort` the same way. `inherit` defers to
the next scope, while `host_default` selects host configuration.

## Composition and completion

`compose` is the recommended default for a hands-off recipe. The parent workflow
reads the named local Skill's `SKILL.md` and applies it in the active host context
with declared ready inputs, optional step prompt, and a role-specific contract.
It is not an independent host invocation. A binding is eligible only when its
local `SKILL.md` exists, its standard frontmatter name matches, and host/client
policy permits the requested behavior.

A step completes only after the orchestrator validates the primary's structured
result and registers its derived artifact as ready. Supporting and review context
may inform the primary result but cannot independently satisfy public artifact
production. `all_required` and `any_success` still determine required binding
completion; neither changes primary ownership.

## Multi-skill example

```yaml
- id: example-step
  prompt: Summarize the evidence for the next decision.
  execution: sequential
  completion: all_required
  inputs: [user-request]
  on_success: complete
  skills:
    - name: example-research
      role: supporting
      invocation: compose
    - name: example-primary
      role: primary
      invocation: compose
    - name: example-review
      role: review
      invocation: compose
      required: false
```

The public result of this step is always
`.workflow/artifacts/example-step.md`, produced by `example-primary` and
registered by the orchestrator.

## Compatible legacy import

A compatibility reader may accept retired redundant artifact declarations only
when they agree with the derived step ID and path. Canonical saves omit all such
redundant values. Runtime collision instructions are not portable recipe data
and are rejected rather than silently reinterpreted.

## Editor integration

Editors that support the YAML language-server convention can opt into structural
completion and diagnostics by placing this comment at the top of a recipe:

```yaml
# yaml-language-server: $schema=../workflow.schema.yaml
```

Support varies by editor and YAML extension; the comment is an opt-in hint, not
a universal compatibility guarantee.

## What JSON Schema cannot guarantee

`workflow.schema.yaml` validates the shape and basic types of one recipe. It
cannot, by itself, guarantee unique IDs, preceding-input order, reachable later
transitions, local-Skill eligibility, host capability, input readiness, exactly
one primary, or the validity of a structured step result. The workflow
orchestrator validates those runtime and cross-object rules, owns transitions,
and writes runtime metadata to the registry.

## Composition limitation

A Skill cannot universally force another arbitrary Skill to run as an
independent host operation. `compose` instead applies the referenced local
Skill's instructions through the parent workflow. Report that composition and
its observed outcome, never a host-level nested execution that did not occur.
