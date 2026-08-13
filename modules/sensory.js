export async function sensoryRoutes(request, env, url) {
  if (url.pathname === '/api/sensory/status') {
    return Response.json({
      ok: true,
      module: 'atlas-sensory',
      version: '0.1.0',
      capabilities: {
        cameraPreview: 'user-consent-required',
        microphoneInput: 'user-consent-required',
        speechOutput: true,
        speechRecognition: 'browser-capability',
        visualUnderstanding: 'multimodal-provider-pending',
        translation: 'provider-pending'
      },
      privacy: {
        explicitPermissionRequired: true,
        serverMediaStorage: false,
        identityRecognition: false
      },
      providerConfigured: Boolean(env.ATLAS_MULTIMODAL_PROVIDER)
    }, { headers: { 'cache-control': 'no-store' } });
  }
  return null;
}
