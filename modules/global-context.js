const RTL_LANGUAGES = new Set(['ar','ckb','dv','fa','he','ps','sd','ug','ur','yi']);

function canonicalLanguageTag(value) {
  const raw = String(value || '').trim().replaceAll('_','-');
  if (!raw || raw.length > 48 || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,4}$/.test(raw)) return null;
  try {
    return Intl.getCanonicalLocales(raw)[0] || null;
  } catch {
    return null;
  }
}

function canonicalCountry(value) {
  const country = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : null;
}

function acceptedLanguage(request) {
  const header = request.headers.get('accept-language') || '';
  for (const item of header.split(',')) {
    const tag = canonicalLanguageTag(item.split(';')[0]);
    if (tag) return tag;
  }
  return null;
}

function localeParts(tag) {
  try {
    const locale = new Intl.Locale(tag);
    return { language: locale.language, script: locale.script || null, region: locale.region || null };
  } catch {
    return { language: 'en', script: null, region: null };
  }
}

function composeLocale(languageTag, country) {
  const parts = localeParts(languageTag);
  const pieces = [parts.language];
  if (parts.script) pieces.push(parts.script);
  if (country) pieces.push(country);
  try {
    return new Intl.Locale(pieces.join('-')).toString();
  } catch {
    return parts.language;
  }
}

export function resolveGlobalContext(request, url = new URL(request.url)) {
  const queryLanguage = canonicalLanguageTag(url.searchParams.get('hl') || url.searchParams.get('lang'));
  const browserLanguage = acceptedLanguage(request);
  const selectedLanguage = queryLanguage || browserLanguage || 'en';
  const languageParts = localeParts(selectedLanguage);

  const queryCountry = canonicalCountry(url.searchParams.get('gl') || url.searchParams.get('country'));
  const edgeCountry = canonicalCountry(request.cf?.country || request.headers.get('cf-ipcountry'));
  const country = queryCountry || edgeCountry || canonicalCountry(languageParts.region);
  const locale = composeLocale(selectedLanguage, country);
  const finalParts = localeParts(locale);
  const timezone = typeof request.cf?.timezone === 'string' && request.cf.timezone.length <= 64 ? request.cf.timezone : null;

  return {
    ok: true,
    scope: 'global',
    language: finalParts.language,
    languageTag: selectedLanguage,
    country,
    locale,
    timezone,
    direction: RTL_LANGUAGES.has(finalParts.language) ? 'rtl' : 'ltr',
    source: {
      language: queryLanguage ? 'query' : browserLanguage ? 'accept-language' : 'default',
      country: queryCountry ? 'query' : edgeCountry ? 'edge' : languageParts.region ? 'language-region' : 'unspecified'
    },
    override: {
      languageParameter: 'hl',
      countryParameter: 'gl'
    }
  };
}

export async function globalContextRoutes(request, _env, url) {
  if (!['/api/context','/api/global/context'].includes(url.pathname)) return null;
  if (request.method !== 'GET') {
    return Response.json({ok:false,error:'method_not_allowed'},{status:405,headers:{allow:'GET','cache-control':'no-store'}});
  }
  const context = resolveGlobalContext(request, url);
  const headers = {'cache-control':'no-store','vary':'accept-language'};
  if (context.locale) headers['content-language'] = context.locale;
  return Response.json(context,{headers});
}
