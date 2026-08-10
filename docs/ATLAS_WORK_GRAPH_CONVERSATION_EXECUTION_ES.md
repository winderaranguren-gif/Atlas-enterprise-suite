# ATLAS Work Graph + Conversation-to-Execution

## Objetivo

Estos dos módulos convierten decisiones y conversaciones en trabajo estructurado dentro del mismo núcleo multiempresa de ATLAS.

No crean una base de datos paralela. Reutilizan `organizations`, `organization_members`, `organization_modules`, Row Level Security (RLS), roles, auditoría y autenticación existentes.

## Módulo 1 — ATLAS Work Graph

Modelo persistente:

`Organización -> Proyecto -> Unidad de trabajo -> Dependencia -> Evidencia -> Resultado`

Tablas principales:

- `atlas_work_projects`: proyectos y programas de trabajo.
- `atlas_work_units`: milestones, tareas, acciones, revisiones, aprobaciones y automatizaciones.
- `atlas_work_dependencies`: relaciones entre unidades de trabajo. El motor impide dependencias directas sobre sí mismas y ciclos en el grafo activo.
- `atlas_work_evidence`: evidencia verificable como commits, pull requests, deployments, tests, documentos, aprobaciones y métricas.

Cada registro queda limitado por `org_id` y utiliza RLS para impedir acceso entre organizaciones.

## Módulo 2 — Conversation-to-Execution

Tabla principal:

- `atlas_conversation_executions`

Su responsabilidad es transformar una intención procedente de chat, email, voz, documento, API o entrada manual en un proyecto y una unidad de trabajo del Work Graph.

El RPC `capture_atlas_conversation_execution(...)` realiza esa creación de forma atómica y devuelve el identificador de la ejecución.

## Privacidad por diseño

Conversation-to-Execution no necesita guardar la conversación completa. El modelo ofrece campos para:

- referencia externa (`source_ref`),
- hash opcional (`source_hash`),
- resumen mínimo (`source_summary`),
- intención normalizada (`intent`),
- acción solicitada estructurada (`requested_action`).

La regla recomendada es guardar únicamente el contexto mínimo necesario para ejecutar y auditar el trabajo. No colocar secretos, credenciales, tokens ni datos personales innecesarios en `source_summary`, `requested_action`, `execution_context`, `metadata` o `evidence_payload`.

## Políticas de ejecución

- `manual`: ATLAS estructura el trabajo, pero una persona realiza la acción.
- `assisted`: ATLAS prepara o ejecuta pasos permitidos con supervisión.
- `auto_safe`: reservado para acciones previamente permitidas, seguras y reversibles. Requiere rol `owner`, `admin` o `manager`.

La política `auto_safe` no autoriza a saltarse controles de acceso, permisos externos, confirmaciones requeridas ni límites sobre acciones irreversibles.

## Estados

Proyecto:

`planned -> active -> blocked/completed/cancelled -> archived`

Unidad de trabajo:

`backlog -> ready -> in_progress -> review -> verified -> completed`

También existen estados `blocked`, `failed` y `cancelled`.

Conversation-to-Execution:

`captured -> planned -> approved -> executing -> completed`

También existen estados `blocked`, `failed` y `cancelled`.

## Integración con ATLAS existente

La migración registra automáticamente los módulos:

- `work_graph`
- `conversation_execution`

para organizaciones existentes y futuras mediante `organization_modules`.

Todas las tablas nuevas reutilizan las funciones existentes de ATLAS para membresía, permisos, `updated_at` y auditoría inmutable.

## Integraciones futuras

El Work Graph está preparado para recibir evidencia y estado desde:

- GitHub: commit, pull request, CI y release.
- Deployments: build, staging, production y rollback.
- ATLAS Calendar: fechas, hitos y dependencias temporales.
- Documents: especificaciones, contratos y evidencias.
- CRM / ERP / HR / Accounting: trabajo originado por procesos empresariales.
- Agentes ATLAS: diagnóstico, ejecución permitida, prueba y verificación.

La regla arquitectónica es que cada sistema externo sea una fuente o ejecutor conectado al mismo Work Graph, no un gestor de tareas paralelo.
