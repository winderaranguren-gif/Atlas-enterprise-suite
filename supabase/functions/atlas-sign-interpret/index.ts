const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5-mini';
const MAX_FRAMES = 5;
const MAX_FRAME_CHARS = 900_000;
const MAX_TOTAL_CHARS = 3_200_000;

function json(data: unknown, status = 200, extra: Record<string,string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra }
  });
}

function allowedOrigin(req: Request) {
  const origin = req.headers.get('origin') || '';
  const configured = (Deno.env.get('ATLAS_ALLOWED_ORIGINS') || 'https://atlasenterprisesuite.com,https://www.atlasenterprisesuite.com,http://localhost:4173,http://127.0.0.1:4173')
    .split(',').map(v => v.trim()).filter(Boolean);
  return configured.includes(origin) ? origin : configured[0];
}

function cors(req: Request) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(req),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function extractOutputText(payload: any) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const chunks: string[] = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

function validFrame(value: unknown) {
  if (typeof value !== 'string') return false;
  if (value.length < 100 || value.length > MAX_FRAME_CHARS) return false;
  return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = cors(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders);

  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json({ ok: false, error: 'authentication_required' }, 401, corsHeaders);
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return json({ ok: false, error: 'provider_not_configured', provider: 'openai' }, 503, corsHeaders);

  let payload: any;
  try { payload = await req.json(); }
  catch { return json({ ok: false, error: 'invalid_json' }, 400, corsHeaders); }

  const frames = Array.isArray(payload?.frames) ? payload.frames : [];
  if (!frames.length || frames.length > MAX_FRAMES || !frames.every(validFrame)) {
    return json({ ok: false, error: 'invalid_frames', maxFrames: MAX_FRAMES }, 400, corsHeaders);
  }
  if (frames.reduce((sum: number, frame: string) => sum + frame.length, 0) > MAX_TOTAL_CHARS) {
    return json({ ok: false, error: 'payload_too_large' }, 413, corsHeaders);
  }

  const requestedLanguage = ['LSV', 'ASL', 'AUTO'].includes(String(payload?.signed_language || '').toUpperCase())
    ? String(payload.signed_language).toUpperCase()
    : 'AUTO';
  const locale = String(payload?.locale || 'es-VE').slice(0, 12);
  const model = Deno.env.get('OPENAI_VISION_MODEL') || Deno.env.get('OPENAI_MODEL') || DEFAULT_MODEL;

  const instruction = [
    'You are ATLAS Sign, an accessibility interpreter for signed communication.',
    'Analyze the supplied camera frames in chronological order and determine whether a person is intentionally signing.',
    `Preferred signed language: ${requestedLanguage}. Output locale: ${locale}.`,
    'Interpret only what is supported by the visible signing. Dynamic signs may be ambiguous from a short frame burst.',
    'If the meaning is not sufficiently clear, do not guess: set needs_clarification=true and explain briefly how to repeat the sign.',
    'Do not identify the person, infer sensitive attributes, diagnose conditions, or describe appearance.',
    'Return concise communication content suitable for text display and optional text-to-speech.'
  ].join(' ');

  const content: any[] = [
    { type: 'input_text', text: instruction },
    ...frames.map((frame: string) => ({ type: 'input_image', image_url: frame, detail: 'low' }))
  ];

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      text: { type: 'string' },
      signed_language: { type: 'string', enum: ['LSV', 'ASL', 'UNKNOWN'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      detected_signing: { type: 'boolean' },
      needs_clarification: { type: 'boolean' },
      clarification: { type: 'string' }
    },
    required: ['text', 'signed_language', 'confidence', 'detected_signing', 'needs_clarification', 'clarification']
  };

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: [{ role: 'user', content }],
        text: {
          format: {
            type: 'json_schema',
            name: 'atlas_sign_interpretation',
            strict: true,
            schema
          }
        },
        max_output_tokens: 450,
        store: false
      })
    });

    const requestId = response.headers.get('x-request-id');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({ ok: false, error: 'provider_error', provider: 'openai', status: response.status, requestId }, 502, corsHeaders);
    }

    const raw = extractOutputText(data);
    let result: any;
    try { result = JSON.parse(raw); }
    catch { return json({ ok: false, error: 'invalid_provider_output', requestId }, 502, corsHeaders); }

    return json({
      ok: true,
      text: String(result?.text || ''),
      signed_language: result?.signed_language || 'UNKNOWN',
      confidence: Number(result?.confidence || 0),
      detected_signing: Boolean(result?.detected_signing),
      needs_clarification: Boolean(result?.needs_clarification),
      clarification: String(result?.clarification || ''),
      model,
      requestId
    }, 200, corsHeaders);
  } catch (error) {
    return json({ ok: false, error: 'provider_unreachable', message: String(error?.message || error) }, 502, corsHeaders);
  }
});
