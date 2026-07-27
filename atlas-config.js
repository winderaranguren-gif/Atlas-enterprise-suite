// ATLAS browser configuration.
// The Supabase URL and publishable key are designed for browser use and are
// protected by database Row Level Security. Never place a secret/service key here.
window.ATLAS_CONFIG = Object.freeze({
  supabaseUrl: '',
  supabasePublishableKey: '',
  authRedirectUrl: `${window.location.origin}/cloud-auth.html`,
  privateBetaRedirectUrl: `${window.location.origin}/private-beta.html`,
  environment: 'unconfigured'
});
