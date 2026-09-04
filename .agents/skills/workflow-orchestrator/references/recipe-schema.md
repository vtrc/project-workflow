# Recipe Schema

`workflow.yaml` is the single ordered recipe. It names concrete Skills only in
that file; the framework does not choose or supply them.

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

## Binding and completion semantics

Bindings are ordered. `sequential` runs eligible bindings in list order;
`parallel` starts eligible bindings together only when the host supports it.
`fallback` is valid only in a sequential step and becomes eligible after an
earlier required non-fallback binding cannot complete. `primary`, `supporting`,
and `review` communicate responsibility; they do not select a methodology.

`required` defaults to `true`. `all_required` completes only when every required
binding succeeds. `any_success` completes when one required binding succeeds.
Optional bindings may register output but cannot satisfy or block a step. A step
must contain at least one required binding.

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
artifact contract for lifecycle and collision rules.

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

## Composition limitation

A Skill cannot universally force another arbitrary Skill to run as an
independent host operation. `compose` instead applies the referenced local
Skill's instructions through the parent workflow. Report that composition and
its observed outcome, never a host-level nested execution that did not occur.
