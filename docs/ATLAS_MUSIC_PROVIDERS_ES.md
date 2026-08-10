# ATLAS Music — Catálogo autorizado y video de proveedores

## Estado

ATLAS Music dispone de un gateway propio para integrar catálogos y video sin copiar, descargar ni espejar archivos comerciales en infraestructura ATLAS.

Rutas incorporadas:

- `GET /api/music/status`
- `GET /api/music/apple/search`
- `GET /api/music/youtube/search`

El navegador nunca recibe las credenciales privadas de los proveedores. La consulta sale del navegador hacia el Worker de ATLAS y el Worker llama al proveedor autorizado.

## Apple Music

Variable de entorno/secret requerida:

- `APPLE_MUSIC_DEVELOPER_TOKEN`

Variable opcional:

- `ATLAS_MUSIC_DEFAULT_STOREFRONT` (por defecto `us`)

El gateway consulta el catálogo oficial de Apple Music y normaliza canciones, álbumes, artistas, playlists y music videos. El artwork conserva su URL oficial de Apple Music.

La primera versión del gateway habilita **descubrimiento y metadata**. La reproducción completa dentro del navegador permanece marcada como pendiente hasta activar MusicKit on the Web y la autorización del usuario. No se falsifica una sesión ni se presenta un preview como reproducción completa.

## YouTube

Secret requerido:

- `YOUTUBE_API_KEY`

ATLAS usa el YouTube Data API para buscar video y solicita únicamente resultados que el proveedor marque como embebibles y sindicables. La reproducción se realiza mediante el reproductor embebido de YouTube dentro de ATLAS Music; ATLAS no descarga el video ni extrae el archivo multimedia.

## Rights Intelligence

Toda media de terceros entra con esta regla conservadora:

- reproducción: controlada por el proveedor;
- video: controlado por el proveedor cuando aplica;
- sincronización con ATLAS Video: `not-granted`;
- reutilización comercial: `not-granted`.

Por tanto, encontrar o reproducir una canción/video **no** habilita automáticamente el botón `Usar en ATLAS Video`. Ese botón permanece bloqueado hasta que exista una licencia específica de sincronización/uso comercial o el contenido sea propiedad de ATLAS.

## ATLAS Originals

Los ATLAS Originals siguen separados del catálogo comercial. Su metadata de Rights Intelligence puede autorizar producción, edición y uso comercial cuando ATLAS sea el titular correspondiente.

## Activación

1. Configurar los secrets del proveedor únicamente en el entorno de servidor/Cloudflare.
2. Desplegar el Worker.
3. Verificar `/api/music/status` sin exponer valores de secrets.
4. Buscar desde ATLAS Music y confirmar que la respuesta conserva `provider`, `providerId`, artwork/thumbnail y derechos.
5. Verificar que el contenido comercial mantiene bloqueado `Usar en ATLAS Video`.
6. Para Apple Music full playback, activar MusicKit web y validar autorización con una cuenta Apple Music compatible antes de marcar esa capacidad como activa.

## Principios de seguridad

- No guardar API keys en HTML, JavaScript de cliente o repositorio.
- No descargar música/video comercial desde YouTube u otros catálogos.
- No eliminar atribución del proveedor.
- No inferir derechos de sincronización a partir del derecho de reproducción.
- Si los derechos son desconocidos, bloquear uso en producción.
