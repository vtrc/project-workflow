# Project Workflow

**[Read this in English](README.en.md)**

## Un ejemplo antes de empezar

Imagina que pides: **«Diseña un registro para mi proyecto»**. Ya tienes dos
Skills disponibles: `grilling` hace preguntas para aclarar qué necesitas y
`writing-plans` convierte las respuestas en un plan. Project Workflow conecta
esas Skills mediante una receta `workflow.yaml`: primero guarda el resultado de
las preguntas y después se lo entrega a la Skill de planificación. Obtienes un
flujo coordinado y sus artefactos, sin tener que invocar cada Skill a mano.

No necesitas crear ni reescribir las Skills. Basta con tener Skills locales o
de terceros disponibles y declararlas en `workflow.yaml`. Este repositorio
aporta las instrucciones que conectan esas piezas; no añade un programa que
funcione por su cuenta.

## Cómo funciona

```text
Petición: «Diseña un registro»
        ↓
workflow.yaml
        ↓
Skill 1: grilling
        ↓
Resultado intermedio: clarified-brief.md
        ↓
Skill 2: writing-plans
        ↓
Resultado final: implementation-plan.md
```

Las dos Skills del diagrama son solo un ejemplo. La receta actual las nombra,
pero el framework no las incluye ni las exige: puedes sustituirlas por Skills
locales o de terceros que hagan el trabajo que necesitas.

## Tres conceptos para empezar

### 1. Skill

Una Skill es un conjunto reutilizable de instrucciones que explica a un agente
de IA cómo realizar una tarea concreta. Puede vivir en tu proyecto o provenir
de un tercero.

### 2. `workflow.yaml`

Es la receta del flujo. Indica qué Skills usar, en qué orden, qué información
recibe cada una, qué resultados produce y a qué paso se pasa después. También
indica dónde guardar los artefactos, es decir, los resultados que puedes leer o
entregar a otro paso.

### 3. Project Workflow

Es este proyecto/framework. Lee `workflow.yaml` y compone las Skills que ya
tienes disponibles a través del cliente que estés usando. El cliente carga y
aplica sus instrucciones; Project Workflow coordina la secuencia y los
artefactos.

## YAML mínimo completo

El siguiente archivo reproduce el caso del registro y contiene todas las
secciones necesarias de una receta válida. `grilling` y `writing-plans` deben
estar disponibles en tu cliente si ejecutas este ejemplo sin cambiarlos.

```yaml
# yaml-language-server: $schema=./workflow.schema.yaml
id: register-design-workflow
artifact_root: .workflow/artifacts
default_delegation: inline
default_on_blocked: ask_user
default_invocation: compose
model: host_default
reasoning_effort: host_default

steps:
  - id: clarify-request
    execution: sequential
    completion: all_required
    delegation: inline
    inputs: [user-request]
    outputs: [clarified-brief]
    on_success: make-plan
    on_blocked: ask_user
    skills:
      - name: grilling
        role: primary
        invocation: compose
        artifact: clarified-brief
        output_file: .workflow/artifacts/clarified-brief.md
        on_exists: version

  - id: make-plan
    execution: sequential
    completion: all_required
    delegation: inline
    inputs: [clarified-brief]
    outputs: [implementation-plan]
    on_success: complete
    on_blocked: ask_user
    skills:
      - name: writing-plans
        role: primary
        invocation: compose
        artifact: implementation-plan
        output_file: .workflow/artifacts/implementation-plan.md
        on_exists: version
```

### Cómo leer el ejemplo

- Los campos del principio (`id`, `artifact_root` y los valores `default_*`)
  identifican el flujo y sus valores generales.
- `steps` es la lista ordenada de etapas. `clarify-request` recibe la petición
  inicial (`user-request`) y produce `clarified-brief`.
- `on_success: make-plan` indica que, si la primera etapa termina bien, empieza
  la segunda. La segunda termina con `on_success: complete`.
- Dentro de `skills`, `name` debe coincidir exactamente con el nombre de la
  Skill disponible. `role: primary` indica que es la Skill principal de esa
  etapa y `invocation: compose` indica que la entrada la compone dentro del
  contexto activo del cliente.
- `artifact` identifica el resultado y `output_file` indica dónde guardarlo.
  `inputs` de la segunda etapa consume el artefacto producido por la primera.
- `model`, `reasoning_effort`, `delegation` y `execution` son intenciones que el
  adaptador del cliente interpreta; no son comandos universales.

Puedes empezar adaptando [`workflow.example.yaml`](workflow.example.yaml), que
usa nombres de Skills de marcador de posición.

## Instalación y primer uso

### Opción A: clonar el repositorio completo

```text
git clone https://github.com/vtrc/project-workflow.git
cd project-workflow
cp workflow.example.yaml workflow.yaml
```

Después sustituye las Skills de marcador de posición por Skills disponibles en
tu proyecto y activa `project-workflow` mediante el mecanismo nativo de tu
cliente.

### Opción B: instalar solo las Skills del framework

Desde el proyecto donde quieres usar el flujo, ejecuta:

```text
npx skills add https://github.com/vtrc/project-workflow --skill project-workflow workflow-orchestrator
```

El comando no instala `workflow.yaml`, la receta raíz ni las Skills externas
que esta referencie. Para crear la receta, copia o adapta
[`workflow.example.yaml`](workflow.example.yaml) y sigue las dependencias que
hayas declarado.

### Activar el flujo

El usuario activa solo la Skill de entrada `project-workflow` mediante el
mecanismo nativo de su cliente. `$project-workflow` es únicamente un ejemplo de
invocación estilo Codex; no es un comando universal. No invoques manualmente
`grilling`, `writing-plans` ni otras Skills intermedias: la entrada las compone
en el orden indicado por `workflow.yaml`.

Los artefactos generados se guardan normalmente bajo `.workflow/`. Esa carpeta
es estado de trabajo, no código fuente que este repositorio publique.

## Qué incluye, qué no incluye y límites

### Incluye

- [`project-workflow`](.agents/skills/project-workflow/SKILL.md), la Skill de
  entrada.
- [`workflow-orchestrator`](.agents/skills/workflow-orchestrator/SKILL.md), las
  instrucciones de coordinación.
- [`workflow.example.yaml`](workflow.example.yaml), el schema y los contratos
  técnicos.

### No incluye

- Skills externas como `grilling` o `writing-plans`;
- un runtime de aplicación, servidor, MCP, base de datos o gestor de paquetes;
- el archivo `workflow.yaml` de tu proyecto ni el estado generado de
  `.workflow/`.

Este framework está pensado para clientes que implementan el estándar **Agent
Skills**: un formato y unas reglas para que un cliente descubra y cargue Skills.
`.agents/skills/` es la fuente canónica de Skills de este repositorio, aunque un
adaptador puede mapearla a la ruta nativa de su cliente. No se promete
compatibilidad con clientes arbitrarios.

El proyecto es **instruction-only**. El cliente es quien carga y aplica las
instrucciones, persiste el estado y decide qué capacidades admite. Por eso no
hay enforcement runtime ni una garantía de que cualquier cliente ejecute en
paralelo, delegue trabajo o acepte un modelo concreto.

## Referencias técnicas

- [`workflow.schema.yaml`](workflow.schema.yaml): JSON Schema Draft 2020-12
  para estructura, tipos y enums básicos.
- [Referencia del schema de receta](.agents/skills/workflow-orchestrator/references/recipe-schema.md):
  campos, valores heredados y límites de la validación.
- [Contrato de artefactos](.agents/skills/workflow-orchestrator/references/artifact-contract.md):
  estados, ownership, colisiones y trazabilidad de resultados.
- [Contrato de delegación](.agents/skills/workflow-orchestrator/references/delegation-contract.md):
  composición y límites de las entregas entre etapas.
- [Skill de entrada](.agents/skills/project-workflow/SKILL.md) y
  [orquestador](.agents/skills/workflow-orchestrator/SKILL.md): instrucciones
  completas que aplica el cliente compatible.

Si necesitas el vocabulario interno, una **binding** es la declaración de una
Skill dentro de una etapa; **readiness** significa que un artefacto está listo
para consumirse; y **lineage** describe su origen y relación con quien lo
produjo. Estos términos no son necesarios para el primer uso.
