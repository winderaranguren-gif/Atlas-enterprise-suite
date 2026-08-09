// ATLAS browser production configuration.
// The Supabase URL and publishable key are intentionally browser-visible and protected by RLS.
// Never place service-role keys, OAuth client secrets, payment secrets or connector credentials here.
window.ATLAS_CONFIG = Object.freeze({
  supabaseUrl: 'https://ggmanzcgtlrvqfoccgsh.supabase.co',
  supabasePublishableKey: 'sb_publishable_wicVjdsduxa5FAnRW9k0Lw_HxtBW72d',
  authRedirectUrl: `${window.location.origin}/cloud-auth.html`,
  privateBetaRedirectUrl: `${window.location.origin}/`,
  environment: 'private-production',
  dataMode: 'production',
  allowDemoData: false
});
