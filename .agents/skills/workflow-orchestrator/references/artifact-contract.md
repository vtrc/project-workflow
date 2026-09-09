# Artifact Contract

## Authority

The Work Item Record stores the request and resumable state. The runtime Artifact
Registry is the durable handoff surface. `workflow.yaml` declares graph topology
and Step policy; it does not own execution history.

## Step-owned public artifacts

Each successful Step registers exactly one public artifact under its Step ID:

| Value | Rule |
| --- | --- |
| `artifact_id` | `step.id` |
| `artifact_path` | `.workflow/artifacts/<step.id>.md` |
| producer | the Step's exactly one `primary` Skill |

The primary is the only public artifact producer. Supporting and review Skills only enrich
the Step runner's context and never publish separate public artifacts.

## Input handoff

The Step runner receives all declared input artifacts after the registry marks
them `ready`, together with their input lineage. A root receives no authored
artifact input and declares `inputs: []`. A join waits for every listed input;
fan-out is created when multiple Steps consume one ready artifact.

## Registry ownership

The runtime registry exclusively owns status, `run_id`, revisions, checksums, lineage, replacement, and collision policy. It also owns attempts, and producers cannot author or override those
values. A file at the derived path without a validated primary result is not a
registered ready artifact.

## Structured result and registration

A primary returns `step_id`, `primary`, `outcome`, derived `artifact_id` and
`artifact_path`, consumed inputs with lineage, and a durable summary. The
orchestrator validates the result, then the registry assigns runtime metadata and
exposes the artifact only after successful registration.

A blocked Step persists resumable state and asks the user. The registry keeps the
state needed to continue without an authored blocked-action policy.
