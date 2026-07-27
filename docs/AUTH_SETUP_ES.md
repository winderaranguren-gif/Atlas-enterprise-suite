# ATLAS Core — Activación del login real

## Archivos preparados

- `cloud-auth.html`: superficie de prueba para acceso, registro y recuperación.
- `cloud-auth.js`: conexión con Supabase Auth, lectura de membresías y creación de empresas.
- `atlas-config.js`: espacio exclusivo para la URL y la clave publicable del proyecto.

## Valores permitidos en el navegador

Completar solamente:

```js
supabaseUrl: 'https://PROJECT.supabase.co'
supabasePublishableKey: 'sb_publishable_...'
```

La clave publicable identifica la aplicación. La seguridad de datos se aplica mediante RLS.
Nunca colocar `SUPABASE_SECRET_KEY`, `service_role`, contraseñas de base de datos o tokens administrativos en estos archivos.

## Prueba

1. Crear el proyecto Supabase.
2. Ejecutar las dos migraciones SQL.
3. Autorizar la URL de `cloud-auth.html` en Auth Redirect URLs.
4. Completar los dos valores públicos en `atlas-config.js`.
5. Abrir `/cloud-auth.html`.
6. Crear o iniciar una cuenta.
7. Crear la primera empresa mediante el RPC seguro.
8. Ejecutar el plan `SUPABASE_TEST_PLAN.md` con varios usuarios.

## Límite actual

El login real y las membresías quedan preparados de forma independiente. El dashboard principal todavía utiliza datos locales hasta completar el adaptador CRUD entre cada módulo y PostgreSQL.
