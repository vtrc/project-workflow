# Recipe Schema

`workflow.yaml` is the single ordered recipe. It names concrete Skills only in
that file; the framework does not choose or supply them. For structural editor
validation, use the repository's [`workflow.schema.yaml`](../../../../workflow.schema.yaml).

## Canonical shape

```yaml
id: <workflow-id>
artifact_root: <project-relative-directory>
default_delegation: inline | subagent | auto
default_on_blocked: ask_user | stop
default_invocation: compose | user_explicit | host_permitted
model: inherit | host_default | <host-valid-model>
reasoning_effort: inherit | host_default | <host-valid-reasoning-effort>
steps:
  - id: <step-id>
    execution: sequential | parallel
    completion: all_required | any_success
    model: inherit | host_default | <host-valid-model> # optional
    reasoning_effort: inherit | host_default | <host-valid-reasoning-effort> # optional
    delegation: inline | subagent | auto # optional
    inputs: [<artifact-id>] # optional
    outputs: [<artifact-id>] # optional
    on_success: <later-step-id> | complete
    on_blocked: ask_user | stop # optional
    skills:
      - name: <exact-local-skill-name>
        role: primary | supporting | review | fallback
        invocation: compose | user_explicit | host_permitted # optional
        required: true # optional; defaults to true
        model: inherit | host_default | <host-valid-model> # optional
        reasoning_effort: inherit | host_default | <host-valid-reasoning-effort> # optional
        output_file: <project-relative-path> # optional
        artifact: <artifact-id> # required with output_file
        on_exists: fail | overwrite | version # optional; defaults to fail
```

Root fields are required. A step requires `id`, `execution`, `completion`,
`on_success`, and a non-empty ordered `skills` list. Step identifiers are unique
and `on_success` must name a later declared step or `complete`. `inputs` and
`outputs` are registry artifact identifiers.

## Field reference

The tables below describe the structural contract. “Required” means the key
must be present in the YAML object; defaults are the values used when an
optional key is omitted.

### Root fields

| Field | Level | Required | Type | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | root | yes | non-empty string | — | workflow identifier | Stable identity for the recipe. |
| `artifact_root` | root | yes | non-empty project-relative path string | — | path relative to project root | Directory under which workflow artifacts are expected. |
| `default_delegation` | root | yes | string enum | `inline` (schema metadata) | `inline`, `subagent`, `auto` | Delegation inherited by steps without `delegation`: run in the current agent, use a subagent, or let host policy decide. |
| `default_on_blocked` | root | yes | string enum | `ask_user` (schema metadata) | `ask_user`, `stop` | Action inherited by steps without `on_blocked` when required work blocks. |
| `default_invocation` | root | yes | string enum | `compose` (schema metadata) | `compose`, `user_explicit`, `host_permitted` | Invocation inherited by bindings without `invocation`. |
| `model` | root | yes | non-empty string | `host_default` (schema metadata) | `inherit`, `host_default`, or a model string valid for the host | Workflow-level model intent. The schema deliberately does not invent a host model enum. |
| `reasoning_effort` | root | yes | non-empty string | `host_default` (schema metadata) | `inherit`, `host_default`, or a reasoning value valid for the host | Workflow-level reasoning intent. The schema deliberately does not invent a host enum. |
| `steps` | root | yes | array, `minItems: 1` | — | step objects | Ordered workflow stages. |

The defaults shown as “schema metadata” document the repository's conventional
defaults; because all root fields are required, a recipe should write them
explicitly rather than rely on YAML default insertion.

### Step fields

| Field | Level | Required | Type | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | step | yes | non-empty string | — | unique step identifier | Names this stage and is the target of transitions. |
| `execution` | step | yes | string enum | — | `sequential`, `parallel` | Run bindings in list order, or start eligible bindings together when the host supports it. |
| `completion` | step | yes | string enum | — | `all_required`, `any_success` | `all_required` waits for every required binding; `any_success` completes after one required binding succeeds. |
| `model` | step | no | non-empty string | inherited from root | `inherit`, `host_default`, or host-valid model string | Step-level model intent, overriding the workflow value when resolved. |
| `reasoning_effort` | step | no | non-empty string | inherited from root | `inherit`, `host_default`, or host-valid reasoning value | Step-level reasoning intent, overriding the workflow value when resolved. |
| `delegation` | step | no | string enum | inherited from `default_delegation` | `inline`, `subagent`, `auto` | Step-level delegation override. |
| `inputs` | step | no | array of non-empty artifact IDs | `[]` | registry artifact identifiers; unique within the array | Artifacts consumed by the step. They must already be `ready` when the orchestrator runs it. |
| `outputs` | step | no | array of non-empty artifact IDs | `[]` | registry artifact identifiers; unique within the array | Artifacts the step declares as produced. |
| `on_success` | step | yes | non-empty string | — | `complete` or a later declared step ID | Next transition after success. Later-step ordering is checked by the orchestrator. |
| `on_blocked` | step | no | string enum | inherited from `default_on_blocked` | `ask_user`, `stop` | Step-level blocked-action override. |
| `skills` | step | yes | array of binding objects, `minItems: 1` | — | ordered binding objects | Local Skill composition bindings. At least one binding must be required. |

`sequential` and `parallel` describe binding scheduling, not a promise that a
host can execute parallel work. `primary`, `supporting`, and `review` communicate
responsibility; `fallback` is eligible only in a sequential step after an earlier
required non-fallback binding cannot complete.

### Binding fields

| Field | Level | Required | Type | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- | --- |
| `name` | binding | yes | non-empty string | — | exact local Skill frontmatter name | Skill to resolve under `.agents/skills/<name>/SKILL.md`. |
| `role` | binding | yes | string enum | — | `primary`, `supporting`, `review`, `fallback` | Responsibility label; it does not choose a methodology. |
| `invocation` | binding | no | string enum | inherited from `default_invocation` | `compose`, `user_explicit`, `host_permitted` | How this binding is invoked. |
| `required` | binding | no | boolean | `true` | `true`, `false` | Required bindings determine step completion and can block; optional bindings may register output but cannot satisfy or block a step. |
| `model` | binding | no | non-empty string | inherited from step, then root, then host | `inherit`, `host_default`, or host-valid model string | Highest-precedence model intent for this binding. |
| `reasoning_effort` | binding | no | non-empty string | inherited from step, then root, then host | `inherit`, `host_default`, or host-valid reasoning value | Highest-precedence reasoning intent for this binding. |
| `output_file` | binding | no | non-empty project-relative path string | — | project-relative path | Expected output location; it is not proof that output exists. |
| `artifact` | binding | conditional | non-empty artifact ID | — | registry artifact identifier | Artifact owned by this binding. It is required whenever `output_file` is present. |
| `on_exists` | binding | no | string enum | `fail` | `fail`, `overwrite`, `version` | Collision policy: fail on an existing path; overwrite only an artifact this binding owns; or create/register a distinct versioned path. |

A step must contain at least one required binding. `all_required` completes only
when every required binding succeeds. `any_success` completes when one required
binding succeeds. Optional bindings cannot satisfy or block either completion
mode.

## Binding and completion semantics

Bindings are ordered. `sequential` runs eligible bindings in list order;
`parallel` starts eligible bindings together only when the host supports it.
`fallback` is valid only in a sequential step and becomes eligible after an
earlier required non-fallback binding cannot complete. `primary`, `supporting`,
and `review` communicate responsibility; they do not select a methodology.

## Resolution and composition

Resolve `model` as binding, then step, then workflow, then host configuration.
Resolve `reasoning_effort` in the same order. `inherit` defers to the next
scope; `host_default` selects the host configuration. Other values must be valid
for the current host; the recipe does not enumerate them. Resolve `delegation`
from step to workflow and `invocation` from binding to `default_invocation`.

`compose` is the recommended default for a hands-off recipe. The parent workflow
reads the named local Skill's `SKILL.md` and applies it in the active agent
context with declared ready inputs and output contract. It is not a portable
host-level nested invocation. A binding is eligible only when its local
`SKILL.md` exists, its frontmatter name matches, and its `agents/openai.yaml`
policy does not set `allow_implicit_invocation: false`,
`allow_model_invocation: false`, or `allow_composition: false`.

`user_explicit` deliberately opts out of composition and is incompatible with a
fully hands-off recipe. `host_permitted` may be used only when a host can prove
it supports the invocation; the recipe never assumes a universal dispatcher.
Model and reasoning values record resolved intent; composition cannot switch the
active model without host support.

## Output and lifecycle

`output_file` is an expected path, not proof of output. Pair it with an
`artifact`; the registry records both `expected_output_path` and `actual_path`.
Use `on_exists`: `fail` is default, `overwrite` requires the binding to own the
artifact, and `version` creates and registers a distinct actual path. See the
[artifact contract](artifact-contract.md) for lifecycle and collision rules.

## Multi-skill example

```yaml
- id: example-step
  execution: sequential
  completion: all_required
  inputs: [source-note]
  outputs: [result-note]
  on_success: complete
  skills:
    - name: example-primary
      role: primary
      invocation: compose
      artifact: result-note
      output_file: .workflow/result-note.md
    - name: example-review
      role: review
      invocation: compose
      required: false
```

## Editor integration

Editors that support the YAML language-server convention can opt into
structural completion and diagnostics by placing this comment at the top of a
recipe:

```yaml
# yaml-language-server: $schema=./workflow.schema.yaml
```

Support for this convention varies by editor and YAML extension; the comment
is an opt-in hint, not a universal compatibility guarantee.

## What JSON Schema cannot guarantee

`workflow.schema.yaml` validates the shape and basic types of one recipe. It
cannot, by itself, guarantee:

- that `on_success` points to a *later* step, that transitions are reachable, or
  that the workflow eventually terminates;
- that referenced artifacts exist in the registry, are `ready`, have valid
  lineage, or match the producing binding's ownership;
- that a named Skill is installed, has matching frontmatter, or is eligible
  under its `agents/openai.yaml` invocation policy;
- that the host supports the requested model, reasoning effort, parallel
  execution, delegation mode, or invocation capability;
- that output paths are safe, writable, collision-free, or semantically
  compatible with an existing artifact;
- semantic rules such as fallback timing, at least one required binding's
  successful completion, or the relationship between a step's declared inputs
  and outputs.

The workflow orchestrator validates these runtime and cross-object rules before
composing a binding, persists state and artifact lineage, and owns transitions.
A schema pass is structural validation, not authorization to execute the recipe.

## Composition limitation

A Skill cannot universally force another arbitrary Skill to run as an
independent host operation. `compose` instead applies the referenced local
Skill's instructions through the parent workflow. Report that composition and
its observed outcome, never a host-level nested execution that did not occur.
