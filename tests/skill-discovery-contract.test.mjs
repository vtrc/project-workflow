import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const internalDirectories = [
  '.agents/skills/project-workflow',
  '.agents/skills/skill-discovery',
  '.agents/skills/workflow-orchestrator',
]

function section(document, heading) {
  const start = document.indexOf(heading)
  assert.notEqual(start, -1, `Expected section: ${heading}`)

  const nextHeading = document.indexOf('\n## ', start + heading.length)
  return document.slice(start, nextHeading === -1 ? undefined : nextHeading)
}

async function load(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8')
}

test('documents deterministic exclusion of Project Workflow internal Skill directories', async () => {
  const [skill, contract] = await Promise.all([
    load('.agents/skills/skill-discovery/SKILL.md'),
    load('.agents/skills/skill-discovery/references/skill-catalog-contract.md'),
  ])

  for (const document of [skill, contract]) {
    const exclusionRules = section(document, '## Internal Project Workflow Skill exclusions')

    for (const directory of internalDirectories) {
      assert.match(exclusionRules, new RegExp('`' + directory + '`'))
    }

    assert.match(exclusionRules, /before parsing frontmatter/i)
    assert.match(exclusionRules, /before sorting/i)
    assert.match(exclusionRules, /never include[\s\S]*manifest/i)
  }
})

test('catalog example contains only discoverable project Skills', async () => {
  const contract = await load('.agents/skills/skill-discovery/references/skill-catalog-contract.md')
  const exampleMatch = contract.match(/```json\n([\s\S]*?)\n```/)
  assert.ok(exampleMatch, 'Expected a JSON manifest example')

  const manifest = JSON.parse(exampleMatch[1])
  const discoveredNames = manifest.projectSkills.map((skill) => skill.name)

  assert.deepEqual(
    discoveredNames.filter((name) => ['project-workflow', 'skill-discovery', 'workflow-orchestrator'].includes(name)),
    [],
  )
})

test('bootstraps a valid blank recipe before Project Workflow loads it', async () => {
  const [schema, discovery, projectWorkflow, template] = await Promise.all([
    load('workflow.schema.yaml'),
    load('.agents/skills/skill-discovery/SKILL.md'),
    load('.agents/skills/project-workflow/SKILL.md'),
    load('.agents/skills/skill-discovery/references/workflow.yaml'),
  ])

  assert.match(schema, /steps:\n\s+type: array\n\s+minItems: 0/)
  assert.match(discovery, /create it from the reference[\s\S]*references\/workflow\.yaml/i)
  assert.match(discovery, /only when it\s+does not exist/i)
  assert.match(discovery, /never overwrite/i)
  assert.match(discovery, /atomically/i)

  const preflightIndex = projectWorkflow.indexOf('Apply [`skill-discovery`](../skill-discovery/SKILL.md)')
  const workflowLoadIndex = projectWorkflow.indexOf('After preflight, load `.workflow/workflow.yaml`')
  assert.ok(preflightIndex !== -1 && workflowLoadIndex !== -1 && preflightIndex < workflowLoadIndex)

  assert.match(template, /^id: new-workflow$/m)
  assert.match(template, /^artifact_root: \.workflow\/artifacts$/m)
  assert.match(template, /^steps: \[\]$/m)
})
