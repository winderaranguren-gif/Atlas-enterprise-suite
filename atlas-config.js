// ATLAS browser configuration.
// The Supabase URL and publishable key are designed for browser use and are
// protected by database Row Level Security. Never place a secret/service key here.
// Federated IdP client secrets belong in Supabase Auth provider configuration, never here.
window.ATLAS_CONFIG = Object.freeze({
  supabaseUrl: 'https://ggmanzcgtlrvqfoccgsh.supabase.co',
  supabasePublishableKey: 'sb_publishable_wicVjdsduxa5FAnRW9k0Lw_HxtBW72d',
  authRedirectUrl: `${window.location.origin}/cloud-auth.html`,
  privateBetaRedirectUrl: `${window.location.origin}/private-beta.html`,
  environment: 'private-beta',
  federatedIdentity: Object.freeze({
    enabled: false,
    provider: 'custom:authentik',
    label: 'Continuar con ATLAS Identity SSO',
    scopes: 'openid profile email'
  })
});
