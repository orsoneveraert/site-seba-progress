/*
  Shared feedback configuration.
  Set enabled=true and fill the Supabase values to share notes across users/pages.
  Notes remain scoped per page path (for example: /index.html, /services.html).
*/
window.FEEDBACK_COLLAB = {
  enabled: true,
  supabaseUrl: 'https://agtktzjbhfgfqdfxyleq.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndGt0empiaGZnZnFkZnh5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NTUyNDMsImV4cCI6MjA4ODAzMTI0M30.489eSSickkP1obLIDTRwDpsbcAnMzCqEzgxrWGaTk30',
  table: 'feedback_notes',
  pollMs: 2400
};
