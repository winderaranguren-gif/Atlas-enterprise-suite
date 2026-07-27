# ATLAS Core — Base de datos Supabase/PostgreSQL

## Qué queda preparado

La carpeta `supabase/` contiene una base multiempresa para la Private Beta de ATLAS Core.
Incluye usuarios, empresas, miembros, clientes, proveedores, inventario, facturas,
pagos, gastos, contabilidad, empleados, documentos, módulos y auditoría.

La separación de datos se aplica mediante Row Level Security (RLS). Un usuario solo
puede consultar registros de una empresa si figura como miembro activo de esa empresa.
Los permisos de escritura dependen de su rol: owner, admin, accountant, manager, staff o viewer.

## Archivos

- `migrations/202607270001_atlas_core_schema.sql`: tablas, funciones, controles y RLS.
- `migrations/202607270002_atlas_storage.sql`: almacenamiento privado de documentos.
- `seed.sql`: instrucciones para crear la primera empresa sin datos financieros falsos.

## Instalación en Supabase

1. Crear un proyecto Supabase bajo una cuenta controlada por Winder.
2. Copiar `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` a las variables protegidas del hosting.
3. Ejecutar primero la migración `001` y luego la `002` desde Supabase SQL Editor o CLI.
4. Crear un usuario real mediante Supabase Auth.
5. Iniciar sesión con ese usuario y ejecutar la función `create_organization` desde la aplicación.
6. Confirmar que otro usuario sin membresía no pueda leer registros de la empresa.

## Seguridad

- Nunca colocar `SUPABASE_SECRET_KEY` en el navegador.
- Nunca guardar contraseñas, claves o tokens reales en GitHub.
- El bucket `atlas-documents` es privado.
- La ruta de cada archivo comienza con el UUID de la empresa.
- Contabilidad y pagos requieren roles de owner, admin o accountant.
- Los asientos contabilizados deben tener débitos y créditos balanceados.
- Cada cambio importante genera una entrada de auditoría.

## Estado

Este paquete prepara la infraestructura. Todavía falta crear el proyecto real de Supabase,
aplicar las migraciones y conectar el frontend mediante las credenciales públicas del proyecto.
