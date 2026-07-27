# ATLAS Core — Publicación controlada

## Ambientes

- Local: desarrollo en la computadora.
- Preview: pruebas privadas antes de afectar la versión principal.
- Production: dominio público aprobado.

## Preparación incluida

`vercel.json` agrega URLs limpias, evita cachear la configuración de conexión y aplica encabezados básicos de seguridad. La política permite conexiones únicamente al propio sitio, al SDK alojado en jsDelivr y al proyecto Supabase.

## Secuencia de publicación

1. Subir el repositorio privado a GitHub.
2. Importar el repositorio en Vercel.
3. Publicar primero como Preview.
4. Configurar `atlas-config.js` con la URL y clave publicable de Supabase.
5. Probar login, aislamiento entre empresas, documentos, backups y recuperación.
6. Conectar el dominio solamente después de aprobar la Private Beta.

## Prohibido

- No publicar la clave secreta de Supabase.
- No utilizar el demo local para almacenar datos reales.
- No anunciar contabilidad, nómina, banca o salud como producción sin sus pruebas y revisiones correspondientes.
