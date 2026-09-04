# Active workflow continuation

When `.workflow/work-item.yaml` has `state: active` and
`current.status: awaiting_user`, resume the active `workflow-personal` work item
only if the user's ordinary message directly answers the pending workflow
question recorded in `awaiting.summary`. Continue the current composed binding;
never ask the user to invoke an intermediate skill.

Do not route unrelated, ambiguous, or new requests into the workflow. Do not
resume when no active work item exists.
