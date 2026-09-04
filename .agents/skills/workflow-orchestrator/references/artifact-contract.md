# Artifact Contract

## Authority

Each work item has one orchestrator-owned Work Item Record at
`.workflow/work-item.yaml` and one Artifact Registry at
`.workflow/artifact-registry.yaml`. The registry is the durable handoff surface:
it records artifacts before a later step consumes them and never treats a
conversational summary as a substitute for durable input.

## Work Item Record

The record contains at least:

- `version`, `id`, `recipe_id`, `request`, and `state`;
- `current.step_id`, `current.binding_index`, `current.binding_name`, and
  `current.status`;
- `awaiting.kind` and `awaiting.summary` when the user must answer;
- resolved model, reasoning effort, and delegation intent; and
- append-only `history` for completed, blocked, and transitioned bindings.

`state` is `idle`, `active`, `completed`, `blocked`, or `cancelled`.
`current.status` is `idle`, `pending`, `running`, `awaiting_user`, `completed`,
or `blocked`. Retain `state: active` while awaiting a direct user answer so the
project resume rule can continue the same binding. Move to `completed` only at
`on_success: complete`; apply blocked handling before `state: blocked`.

## Artifact Registry

The registry contains `version`, `work_item_id`, and an `artifacts` list. A new
work item first registers its user request as ready source context. It may have
no file path because its canonical text is retained in the Work Item Record.

For every declared or produced artifact, record:

- `id` — the logical artifact identifier declared by the recipe;
- `owner` — the single binding or assigned agent allowed to write it;
- `state` — `planned`, `draft`, `ready`, `blocked`, `superseded`, or `archived`;
- `expected_output_path` — configured `output_file`, if any;
- `actual_path` — the actual produced path, separate from the expected path;
- `inputs` — source artifact identifiers; and
- `authoritative` and `replaces` — source-of-truth and supersession details.

An input must be `ready` before use unless the Work Item Record records a
narrower exception. An artifact without a locatable actual path, when one is
required, is not ready.

## Ownership and output paths

Each artifact has exactly one owner at a time. Other bindings and subagents may
read it or request a change, but may not write it. Record ownership transfer or
replacement before the next write.

`output_file` declares an expected project-relative path; it does not prove that
the file exists. After production, register `actual_path` separately. A binding
with `output_file` must declare `artifact`.

| Rule | Required behavior |
| --- | --- |
| `fail` | Stop before writing and report the collision. This is the default. |
| `overwrite` | Write only when the binding owns the artifact and has stated authority. Register the replacement. |
| `version` | Produce a distinct path and register it as `actual_path` without changing the expected path. |

Two bindings may not claim the same artifact identifier. Bindings in one step
may not declare the same expected output path. Do not copy a source-generated
file to normalize it: register its authoritative original location instead.

## Registration flow

1. A producer reports the artifact identifier, owner, state, expected and actual
   locations, and input lineage. After a composed binding completes, the parent
   writes or registers only that binding's declared output.
2. The orchestrator verifies the report against the active recipe binding.
3. The registry exposes an artifact only after its state becomes `ready`.
