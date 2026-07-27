(() => {
  'use strict';
  const config = window.ATLAS_CONFIG || {};
  const sdk = window.supabase;
  if (!sdk?.createClient || !config.supabaseUrl || !config.supabasePublishableKey) return;

  const client = sdk.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  function close() {
    document.querySelector('#atlas-recovery-modal')?.remove();
  }

  function show() {
    if (document.querySelector('#atlas-recovery-modal')) return;
    const node = document.createElement('div');
    node.id = 'atlas-recovery-modal';
    node.className = 'modal-backdrop';
    node.innerHTML = `<form class="modal" id="atlas-recovery-form">
      <div class="modal-head"><h3>Crear nueva contraseña</h3></div>
      <div class="modal-body"><div class="form-grid">
        <label>Nueva contraseña<input name="password" type="password" minlength="8" required></label>
        <label>Confirmar contraseña<input name="confirm" type="password" minlength="8" required></label>
      </div></div>
      <div class="modal-foot"><button class="button primary" type="submit">Actualizar contraseña</button></div>
    </form>`;
    document.body.append(node);
    node.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      if (values.password !== values.confirm) {
        window.alert('Las contraseñas no coinciden.');
        return;
      }
      const { error } = await client.auth.updateUser({ password: values.password });
      if (error) {
        window.alert(error.message);
        return;
      }
      close();
      window.alert('Contraseña actualizada correctamente.');
    });
  }

  client.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') window.setTimeout(show, 0);
  });
})();
