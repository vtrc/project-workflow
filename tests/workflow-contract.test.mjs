import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

async function load(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8')
}

function definition(schema, name) {
  const marker = `  ${name}:\n`
  const start = schema.indexOf(marker)
  assert.notEqual(start, -1, `Expected definition: ${name}`)

  const nextDefinition = schema.slice(start + marker.length).search(/\n  [^\s]/)
  return schema.slice(
    start,
    nextDefinition === -1 ? undefined : start + marker.length + nextDefinition,
  )
}

test('defines a step-owned artifact schema', async () => {
  const schema = await load('workflow.schema.yaml')
  const step = definition(schema, 'step')
  const binding = definition(schema, 'binding')
  const role = definition(schema, 'role')

  assert.doesNotMatch(schema, /^  artifact_root:/m)
  assert.doesNotMatch(schema, /^  - artifact_root$/m)

  assert.match(step, /      prompt:\n        type: string\n        minLength: 1/)
  assert.match(step, /context for composed Skills/i)
  assert.doesNotMatch(step, /^      outputs:/m)

  assert.doesNotMatch(binding, /^      (artifact|output_file|on_exists):/m)
  assert.doesNotMatch(binding, /^    allOf:/m)

  assert.match(role, /      - primary\n      - supporting\n      - review/)
  assert.doesNotMatch(role, /fallback/)
})

test('canonical schema examples omit retired artifact configuration', async () => {
  const schema = await load('workflow.schema.yaml')

  assert.doesNotMatch(schema, /^\s+(artifact_root|outputs|artifact|output_file|on_exists):/m)
})
