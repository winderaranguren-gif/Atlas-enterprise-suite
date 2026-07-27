# ATLAS Core 0.2.1 — Notas de entrega

## Base de datos preparada

ATLAS Core ahora incluye una base para Supabase/PostgreSQL orientada a Private Beta, además del MVP local que funciona en el navegador.

### Incorporado

- Modelo PostgreSQL multiempresa.
- Integración de perfiles con Supabase Auth.
- Miembros, roles y permisos por empresa.
- Row Level Security en todas las tablas de la aplicación.
- Clientes, proveedores, productos, facturas, pagos, gastos, contabilidad, empleados, documentos, módulos y auditoría.
- Políticas de almacenamiento privado separadas por empresa.
- Recálculo automático de totales y balances de facturas.
- Validación obligatoria de asientos contables balanceados.
- Función para crear una empresa con módulos, plan de cuentas y categorías iniciales.
- Documentación completa en español e inglés.
- Validación automatizada de la estructura de la base de datos.

## Límite importante

La interfaz todavía utiliza `localStorage`. La base de datos está preparada, pero aún no está conectada a la interfaz y esta entrega no incluye un proyecto Supabase activo ni un despliegue público.


## Actualización 0.2.1

- Superficie independiente para login, registro y recuperación mediante Supabase Auth.
- Lectura de empresas autorizadas mediante membresías protegidas por RLS.
- Creación de la primera empresa mediante RPC seguro.
- Configuración para claves publicables modernas de Supabase.
- Archivo `vercel.json` con encabezados de seguridad y política de conexiones.
- Guías de autenticación y publicación en español e inglés.
- La interfaz principal continúa separada hasta completar la persistencia CRUD.
