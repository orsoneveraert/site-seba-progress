/*
  Shared feedback configuration.
  Set enabled=true and fill the Supabase values to share notes across users/pages.
  Notes remain scoped per page path (for example: /index.html, /services.html).
*/
window.FEEDBACK_COLLAB = {
  enabled: false,
  supabaseUrl: '',
  supabaseAnonKey: '',
  table: 'feedback_notes',
  pollMs: 2400
};
