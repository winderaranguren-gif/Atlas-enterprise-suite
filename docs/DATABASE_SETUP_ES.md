# ATLAS Core — Base de datos Supabase/PostgreSQL

## Qué queda preparado

La carpeta `supabase/` contiene la base multiempresa y la capa transaccional para ATLAS Core Private Beta Cloud. Incluye usuarios, empresas, miembros, clientes, proveedores, inventario, facturas, pagos, gastos, contabilidad, empleados, documentos, módulos y auditoría.

La separación de datos se aplica mediante Row Level Security (RLS). Un usuario solo puede consultar registros de una empresa si figura como miembro activo de esa empresa. Los permisos de escritura dependen de su rol: owner, admin, accountant, manager, staff o viewer.

## Archivos

- `migrations/202607270001_atlas_core_schema.sql`: tablas, funciones, controles y RLS.
- `migrations/202607270002_atlas_storage.sql`: almacenamiento privado de documentos.
- `migrations/202607270003_atlas_cloud_operations.sql`: pagos transaccionales, balances de facturas, asientos balanceados, perfiles, auditoría automática, endurecimiento de roles y controles entre empresas.
- `migrations/202607270004_atlas_security_patch.sql`: correcciones de seguridad en triggers y permisos finales para categorías de gastos.
- `seed.sql`: instrucciones para crear la primera empresa sin datos financieros falsos.

## Instalación en Supabase

1. Crear un proyecto Supabase bajo una cuenta controlada por Winder.
2. Copiar la URL del proyecto y la clave publicable del navegador en `atlas-config.js`.
3. Ejecutar las migraciones `001`, `002`, `003` y `004` en ese orden desde Supabase SQL Editor o CLI.
4. Agregar la URL publicada de `/private-beta.html` a Auth Redirect URLs de Supabase.
5. Abrir `/private-beta.html` y crear o iniciar un usuario real.
6. Crear la primera empresa desde la pantalla inicial.
7. Confirmar con un segundo usuario y una segunda empresa que RLS bloquee accesos no autorizados.

## Seguridad

- Nunca colocar `SUPABASE_SECRET_KEY`, service role, contraseña de base de datos o token administrativo en el navegador.
- Nunca guardar contraseñas, claves secretas o tokens de proveedores en GitHub.
- El bucket `atlas-documents` es privado.
- La ruta de cada archivo comienza con el UUID de la empresa.
- Contabilidad y pagos requieren roles de owner, admin o accountant.
- Los asientos contabilizados deben tener débitos y créditos balanceados.
- Cada cambio importante genera una entrada de auditoría inmutable.
- La base rechaza relaciones entre registros pertenecientes a empresas distintas.

## Estado

El código y las migraciones están preparados. Todavía debe activarse el proyecto Supabase propiedad del fundador, ejecutar las cuatro migraciones, configurar los dos valores públicos del navegador y completar las pruebas de aceptación antes de ingresar datos reales.
