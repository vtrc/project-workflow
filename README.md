# Project Workflow

**[Read this in English](README.en.md)**

Cuando una tarea requiere varias instrucciones, es fácil perder el orden,
pasar mal los resultados o repetir pasos. Project Workflow resuelve ese
problema convirtiendo Skills ya existentes en un flujo definido. Una Skill es
un conjunto reutilizable de instrucciones que indica a un agente de IA cómo
realizar una tarea. Tú aportas Skills locales o de terceros que ya existan; no
necesitas crearlas ni reescribirlas: basta con tenerlas disponibles y
declararlas en `workflow.yaml`. Ese archivo define en qué orden aplicarlas,
qué entradas reciben y qué salidas o artefactos producen. Este repositorio
aporta las instrucciones para componerlas y el resultado es un flujo
coordinado con sus artefactos.

El cliente compatible carga y aplica las instrucciones; este repositorio no
añade un runtime que ejecute procesos por su cuenta.

## 1. Qué es

El proyecto ofrece un punto de entrada (`project-workflow`) y un orquestador
(`workflow-orchestrator`) para seguir una receta YAML. La receta es la fuente
de verdad: no elige Skills automáticamente ni inventa etapas. Puedes usar las
Skills de este repositorio, Skills propias o Skills publicadas por terceros,
siempre que el cliente pueda descubrirlas.

## 2. Cómo funciona

```text
Skills existentes (locales o de terceros)
        ↓
workflow.yaml define orden, entradas y salidas
        ↓
project-workflow compone las Skills en el cliente
        ↓
Flujo completado + artefactos en .workflow/
```

El usuario activa solo la Skill de entrada mediante el mecanismo nativo de su
cliente. `$project-workflow` es únicamente un ejemplo de invocación estilo
Codex; no es un comando universal. No hay que invocar manualmente las Skills
intermedias: la Skill de entrada las compone en el contexto activo del cliente.

## 3. Ejemplo mínimo completo

Este es un `workflow.yaml` completo y válido según el schema incluido. Sustituye
`my-clarification-skill` y `my-planning-skill` por Skills instaladas en tu
proyecto; sus nombres deben coincidir exactamente con el campo `name` de su
`SKILL.md`.

```yaml
# yaml-language-server: $schema=./workflow.schema.yaml
id: my-personal-workflow
artifact_root: .workflow/artifacts
default_delegation: inline
default_on_blocked: ask_user
default_invocation: compose
model: host_default
reasoning_effort: host_default

steps:
  - id: first-step
    execution: sequential
    completion: all_required
    delegation: inline
    inputs: [user-request]
    outputs: [first-output]
    on_success: second-step
    on_blocked: ask_user
    skills:
      - name: my-clarification-skill
        role: primary
        invocation: compose
        artifact: first-output
        output_file: .workflow/artifacts/first-output.md
        on_exists: version

  - id: second-step
    execution: sequential
    completion: all_required
    delegation: inline
    inputs: [first-output]
    outputs: [final-output]
    on_success: complete
    on_blocked: ask_user
    skills:
      - name: my-planning-skill
        role: primary
        invocation: compose
        artifact: final-output
        output_file: .workflow/artifacts/final-output.md
        on_exists: version
```

`user-request` representa la solicitud inicial registrada por el cliente; los
artefactos producidos por un paso pueden ser entradas de otro paso. Los campos
`model`, `reasoning_effort`, `delegation` y `execution` son intenciones que el
adaptador del cliente interpreta, no comandos universales.

## 4. Instalación y primer uso

1. Clona este repositorio o copia sus Skills y referencias al proyecto que
   quieras automatizar.
2. Copia [`workflow.example.yaml`](workflow.example.yaml) como `workflow.yaml`
   y adapta sus pasos, Skills y artefactos.
3. Instala las Skills que hayas nombrado en la receta (consulta la sección
   siguiente).
4. Activa `project-workflow` con el mecanismo nativo de tu cliente y escribe la
   solicitud. El flujo continuará hasta completarse, bloquearse o necesitar una
   decisión.
5. Consulta los artefactos generados bajo `.workflow/`.

## 5. Instalar las Skills de este framework

Desde el proyecto consumidor, ejecuta:

```text
npx skills add https://github.com/vtrc/project-workflow \
  --skill project-workflow \
  --skill workflow-orchestrator
```

El comando **no** instala la receta raíz ni las Skills externas que esta
referencie. Para usar una receta, copia o adapta
[`workflow.example.yaml`](workflow.example.yaml) a `workflow.yaml` y sigue las
dependencias declaradas en ella.

## 6. Skills externas y dependencias

Las Skills nombradas en `workflow.yaml` deben instalarse por separado. La
receta actual de este repositorio usa `grilling` y `writing-plans` como ejemplos
de Skills externas: **no son obligatorias**, no vienen incluidas y puedes
reemplazarlas por Skills locales o de terceros adecuadas a tu trabajo.
Si ejecutas el `workflow.yaml` incluido sin modificarlo, debes instalarlas o
sustituirlas en la receta.

Para cada nombre, el cliente debe poder encontrar un `SKILL.md` cuyo frontmatter
`name` coincida exactamente. `.agents/skills/` es la fuente canónica de Skills
locales en este repositorio; un adaptador puede mapearla a la ruta nativa de su
cliente.

## 7. Qué incluye, qué no incluye y límites

Incluye:

- [`project-workflow`](.agents/skills/project-workflow/SKILL.md), la Skill de
  entrada.
- [`workflow-orchestrator`](.agents/skills/workflow-orchestrator/SKILL.md), el
  contrato de coordinación.
- El ejemplo [`workflow.example.yaml`](workflow.example.yaml), el schema y los
  contratos técnicos.

No incluye:

- un runtime de aplicación, servidor, MCP, base de datos o gestor de paquetes;
- Skills externas ni las dependencias de una receta concreta;
- el estado generado de `.workflow/`.

Es compatible con clientes que implementan el estándar Agent Skills, no con
clientes arbitrarios. El framework depende de que el cliente descubra y cargue
las Skills, persista el estado del proyecto y aplique las instrucciones. No
promete enforcement runtime ni puede obligar a un cliente a ejecutar una Skill
independiente; `compose` aplica sus instrucciones dentro del contexto activo.

## 8. Referencias técnicas

- [`workflow.schema.yaml`](workflow.schema.yaml): JSON Schema Draft 2020-12 para
  estructura, tipos y enums básicos.
- [Referencia del schema de receta](.agents/skills/workflow-orchestrator/references/recipe-schema.md):
  campos, defaults y límites de la validación estructural y semántica.
- [Contrato de artefactos](.agents/skills/workflow-orchestrator/references/artifact-contract.md):
  estado, ownership, colisiones y trazabilidad de artefactos.
- [Contrato de delegación](.agents/skills/workflow-orchestrator/references/delegation-contract.md):
  composición y límites de las entregas entre pasos.
- [Skill de entrada](.agents/skills/project-workflow/SKILL.md) y
  [orquestador](.agents/skills/workflow-orchestrator/SKILL.md): contratos
  ejecutables para clientes Agent Skills.

En estas referencias aparecen términos internos como **binding** (la
declaración de una Skill dentro de un paso), **readiness** (artefacto listo para
ser consumido) y **lineage** (origen y relación con su productor). No necesitas
conocerlos para empezar.
