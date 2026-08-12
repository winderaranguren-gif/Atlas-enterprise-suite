import { ATLAS_MODULE_REGISTRY, orderedAtlasModules } from '../module-registry.js';

export function publicRuntimeMeta(env){
  const supported=String(env.ATLAS_SUPPORTED_LANGUAGES||'en,es')
    .split(',').map(v=>v.trim()).filter(Boolean);
  return {
    service:'ATLAS',
    product:'Enterprise Suite',
    defaultLanguage:env.ATLAS_DEFAULT_LANGUAGE||'en',
    supportedLanguages:supported.length?supported:['en'],
    deployedSha:env.ATLAS_DEPLOYED_SHA||null,
    modules:orderedAtlasModules().map(module=>({
      id:module.id,
      name:module.name,
      layer:module.layer,
      domain:module.domain||null,
      parent:module.parent||null,
      order:module.order
    })),
    moduleCount:ATLAS_MODULE_REGISTRY.length
  };
}
