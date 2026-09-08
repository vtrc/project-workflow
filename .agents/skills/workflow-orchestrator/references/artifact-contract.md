# Artifact Contract

## Authority

Each work item has one orchestrator-owned Work Item Record at
`.workflow/work-item.yaml` and one runtime-owned Artifact Registry at
`.workflow/artifact-registry.yaml`. The registry is the durable handoff surface:
it records validated step artifacts before a later step consumes them and never
treats a conversational summary or the presence of a file as a substitute for a
structured result.

`workflow.yaml` declares topology and optional step context. The runtime registry
exclusively owns status, `run_id`, revisions, checksums, lineage, replacement,
and collision policy.

## Step-owned public artifacts

Every step owns exactly one public artifact:

| Derived value | Rule |
| --- | --- |
| logical ID | `step.id` |
| public path | `.workflow/artifacts/<step.id>.md` |
| producer | the step's exactly one `primary` binding |
| derived output | `step.outputs = [step.id]` (not authored) |

The primary is the only public artifact producer. Supporting and review
Skills contribute context only to the primary and never publish separate public
artifacts. The orchestrator must reject a step that does not declare exactly one
primary before composing it.

A change to a step ID intentionally changes its public artifact path. Inputs
reference `user-request` or preceding step IDs, not configurable artifact names
or paths.

## Work Item Record

The record contains at least:

- `version`, `id`, `recipe_id`, `request`, and `state`;
- `current.step_id`, `current.binding_index`, `current.binding_name`, and
  `current.status`;
- `awaiting.kind` and `awaiting.summary` when the user must answer;
- resolved model, reasoning effort, and delegation intent; and
- append-only history for completed, blocked, and transitioned bindings.

`state` is `idle`, `active`, `completed`, `blocked`, or `cancelled`.
`current.status` is `idle`, `pending`, `running`, `awaiting_user`, `completed`,
or `blocked`. Retain `state: active` while awaiting a direct user answer so the
project resume rule can continue the same binding. Move to `completed` only at
`on_success: complete`; apply blocked handling before `state: blocked`.

## Runtime Artifact Registry

The registry contains `version`, `work_item_id`, and an `artifacts` list. A new
work item first registers `user-request` as ready source context. It may have no
file path because its canonical text is retained in the Work Item Record.

For each produced step artifact, the registry records:

- derived `id` and `path` from the step ID;
- `owner`, the step's primary producer;
- runtime `state`: `planned`, `draft`, `ready`, `blocked`, `superseded`, or
  `archived`;
- runtime `run_id`, revision, checksum, and input lineage;
- replacement/supersession relationships; and
- the runtime collision decision and its outcome.

These fields are registry-owned execution facts. Producers do not author them in
the recipe and cannot assign their own revision, checksum, lineage record, or
collision outcome.

An input must be `ready` before use unless the Work Item Record records a narrow
exception. A completed step artifact is visible to later steps only after the
registry validates it and records it as `ready`.

## Structured primary result

The primary must return a structured step result. It contains at least:

- `step_id` and `primary`, which identify the active step and its sole producer;
- `outcome`: `completed`, `blocked`, or `awaiting_user`;
- `artifact_id` and `artifact_path`, equal to the derived ID and path on a
  completed outcome;
- consumed `inputs` with their registered lineage; and
- a durable `summary` for the next step.

The orchestrator verifies that the result is for the active step and primary,
uses only the derived ID/path, validates input readiness and lineage, and then
lets the registry assign runtime metadata. File existence alone is not success:
a file at `.workflow/artifacts/<step.id>.md` without a valid structured result
is not a registered ready artifact and cannot unlock a transition.

## Registration flow

1. The orchestrator validates the ordered recipe, ready inputs, and exactly one
   primary for the active step.
2. Supporting and review bindings provide context; the primary publishes the
   derived public artifact and returns its structured step result.
3. The orchestrator validates that result against the active step and the
   registry, including the derived ID/path and input lineage.
4. The registry applies its own collision policy, assigns run metadata and
   provenance, and exposes the artifact only after its state becomes `ready`.
5. The orchestrator follows the declared transition only after registration.

Do not copy a source-generated file to normalize it. When compatibility import
permits an existing artifact, the registry records its authoritative location
and lineage before any later step consumes it.
