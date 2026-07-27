# ATLAS Core — Real Login Activation

## Prepared files

- `cloud-auth.html`: test surface for sign-in, signup, and recovery.
- `cloud-auth.js`: Supabase Auth, membership reading, and organization creation.
- `atlas-config.js`: dedicated location for the project URL and publishable key.

## Browser-safe values

Complete only:

```js
supabaseUrl: 'https://PROJECT.supabase.co'
supabasePublishableKey: 'sb_publishable_...'
```

The publishable key identifies the application. Database security is enforced through RLS.
Never place `SUPABASE_SECRET_KEY`, a `service_role` key, database passwords, or administrative tokens in these browser files.

## Test sequence

1. Create the Supabase project.
2. Apply both SQL migrations.
3. Allow the `cloud-auth.html` URL in Auth Redirect URLs.
4. Fill the two public values in `atlas-config.js`.
5. Open `/cloud-auth.html`.
6. Create or sign into an account.
7. Create the first organization through the protected RPC.
8. Run `SUPABASE_TEST_PLAN.md` with multiple users.

## Current limitation

Real authentication and memberships are prepared as an isolated test surface. The main dashboard still uses local data until each module is connected to PostgreSQL through the CRUD adapter.
