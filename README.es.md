# Flujo personal basado en YAML

Este repositorio es un pequeño framework de flujo de trabajo, basado únicamente en instrucciones, para Agent Skills compatibles con Codex. Proporciona un único punto de entrada, `$workflow-personal`, y permite declarar en un `workflow.yaml` del proyecto qué Skills se componen, en qué orden y qué entregables persistentes producen.

No es una aplicación y no incluye Skills de terceros. El estado de ejecución y la prueba anterior del flujo de registro se mantienen fuera del repositorio publicado.

## Ruta rápida

1. Clona este repositorio en un proyecto compatible con Agent Skills locales.
2. Conserva o crea `workflow.yaml` a partir de [`workflow.example.yaml`](workflow.example.yaml).
3. Instala o proporciona por separado las Skills que nombre tu receta; no están incluidas aquí.
4. Invoca el único punto de entrada manual con tu petición:

   ```text
   $workflow-personal
   Diseña un flujo sencillo de onboarding para mi proyecto.
   ```

5. Consulta localmente el estado y los artefactos generados en `.workflow/`. Ese directorio está ignorado y nunca forma parte del paquete.

## Cómo funciona

```text
$workflow-personal
        │
        ▼
workflow.yaml ── valida orden, bindings, entradas, salidas y políticas
        │
        ▼
workflow-orchestrator ── compone cada Skill local elegible en el contexto activo
        │
        ▼
.workflow/ ── estado del trabajo, registro de artefactos y entregables generados
```

El framework separa la **orquestación** de la **metodología**:

| Parte | Responsabilidad |
| --- | --- |
| [`workflow.yaml`](workflow.yaml) | Receta ordenada e intención de ejecución. Es la fuente de verdad para pasos, bindings, transiciones y artefactos. |
| [`workflow-personal`](.agents/skills/workflow-personal/SKILL.md) | Único punto de entrada para el usuario. Carga y valida la receta, persiste el estado, compone los bindings y sigue las transiciones. |
| [`workflow-orchestrator`](.agents/skills/workflow-orchestrator/SKILL.md) | Contrato neutral de ejecución y reglas de receta y artefactos. No selecciona ninguna metodología. |
| `.agents/skills/<name>/SKILL.md` | Skill local seleccionada por la receta. Su nombre del frontmatter debe coincidir con el binding. |
| `.workflow/` | Estado generado del trabajo, registro de artefactos y salidas. Es información de ejecución, no código fuente. |

`compose` significa que el workflow padre lee y aplica una Skill local nombrada en el contexto actual del agente. No es una invocación anidada independiente en otro host. El orquestador registra el binding y su resultado antes de que el siguiente binding consuma su salida.

## Configurar `workflow.yaml`

Empieza con [`workflow.example.yaml`](workflow.example.yaml) y sustituye los nombres de Skills y los identificadores de artefactos de ejemplo. El [`workflow.yaml`](workflow.yaml) actual es una receta de prueba concreta y referencia Skills que se excluyen deliberadamente de este repositorio.

### Configuración raíz

| Campo | Significado |
| --- | --- |
| `id` | Identificador estable de la receta. |
| `artifact_root` | Directorio relativo al proyecto para los entregables generados. |
| `default_delegation` | `inline`, `subagent` o `auto`; se usa cuando un paso no lo sobrescribe. |
| `default_on_blocked` | `ask_user` o `stop`. |
| `default_invocation` | Normalmente `compose` para un flujo sin invocaciones manuales intermedias. |
| `model`, `reasoning_effort` | `inherit`, `host_default` o un valor compatible con el host. |
| `steps` | Lista ordenada y no vacía de pasos del workflow. |

### Reglas de pasos y bindings

Cada paso declara `id`, `execution`, `completion`, `on_success` y al menos un binding de Skill. Un binding suele tener esta forma:

```yaml
skills:
  - name: my-local-skill       # nombre exacto del frontmatter de SKILL.md
    role: primary              # primary, supporting, review o fallback
    invocation: compose
    artifact: result-note      # ID lógico del registro de ejecución
    output_file: .workflow/artifacts/result-note.md
    on_exists: version         # fail, overwrite o version
```

Antes de la composición, la Skill local debe:

- existir en `.agents/skills/<name>/SKILL.md`;
- exponer un nombre de frontmatter coincidente; y
- no desactivar la invocación implícita, por modelo o por composición en `agents/openai.yaml`.

Las entradas deben identificar artefactos anteriores en estado `ready`. `on_success` solo puede nombrar un paso posterior o `complete`; las transiciones no infieren trabajo adicional. Mantén un único propietario por artefacto y persiste el handoff antes de que otro binding lo lea.

## Adaptar la receta

1. Copia [`workflow.example.yaml`](workflow.example.yaml) a `workflow.yaml` para crear un workflow nuevo, o edita la receta existente.
2. Asigna un ID único a cada paso y mantén los pasos en orden de ejecución.
3. Sustituye `my-*-skill` por los nombres exactos de las Skills disponibles en tu clon o en tu host.
4. Define cada handoff una sola vez mediante un ID de `artifact` y, si se guarda en un fichero, un `output_file` bajo `.workflow/`.
5. Configura `inputs` con artefactos que ya estén en estado `ready`; no sustituyas la trazabilidad por resúmenes conversacionales.
6. Usa `on_exists: fail` para detectar colisiones estrictamente, `overwrite` solo para reemplazos controlados por el propietario, o `version` para conservar una versión distinta en cada ejecución.
7. Ejecuta `$workflow-personal` y resuelve cualquier decisión del usuario o binding bloqueado antes de esperar un estado terminal `completed`.

El esquema de la receta y el ciclo de vida están documentados en las referencias locales:

- [`recipe-schema.md`](.agents/skills/workflow-orchestrator/references/recipe-schema.md)
- [`artifact-contract.md`](.agents/skills/workflow-orchestrator/references/artifact-contract.md)
- [`delegation-contract.md`](.agents/skills/workflow-orchestrator/references/delegation-contract.md)

## Skills externas y dependencias

El repositorio contiene únicamente el framework de workflow y sus contratos. Estas Skills **no se empaquetan** deliberadamente:

- `grill-me`
- `grilling`
- `writing-plans`

La receta de prueba concreta nombra `grilling` y `writing-plans`; instala Skills equivalentes por separado o cambia la receta para usar nombres disponibles en tu entorno. `grill-me` también se excluye porque es un adaptador de entrada externo, no una dependencia del framework.

No hay runtime de aplicación, lockfile de un gestor de paquetes, base de datos ni servicio que instalar. El requisito práctico es un host compatible con Agent Skills que pueda leer `.agents/skills/` y respete el contrato de composición.

## Qué se ignora deliberadamente

`.gitignore` excluye:

- todo el estado y los artefactos generados de `.workflow/`, incluido el resultado de la prueba de registro;
- los directorios locales de trabajo `outputs/` y `work/`;
- las Skills externas indicadas arriba; y
- ficheros del editor, del sistema operativo, logs y temporales.

No subas credenciales, configuración específica del host ni datos generados de ejecuciones. Mantén la configuración portable en `workflow.yaml` o en la plantilla de ejemplo.

## Lista de comprobación del repositorio

- [ ] `workflow.yaml` solo nombra Skills disponibles en el clon de destino.
- [ ] Cada binding tiene un rol, una trazabilidad de entradas y un propietario de salida claros.
- [ ] El estado generado de `.workflow/` no está en el paquete publicado.
- [ ] Las Skills externas se instalan por separado y no se copian en este repositorio.

> Versión original en inglés: [`README.md`](README.md)
