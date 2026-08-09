(() => {
  'use strict';

  const modules = [
    'Finance Intelligence','Accounting / GL','AP & AR','Payroll','People & HR',
    'Inventory Intelligence','Fleet Intelligence','ATLAS Calendar','Health Frontiers',
    'GPS 4D','Technical Support','Knowledge'
  ];

  const drawer = document.getElementById('drawer');
  const stage = document.getElementById('stage');
  const moduleList = document.getElementById('moduleList');
  const modulesBtn = document.getElementById('modulesBtn');
  const closeDrawer = document.getElementById('closeDrawer');
  const focusBtn = document.getElementById('focusBtn');
  const cmd = document.getElementById('cmd');
  const runBtn = document.getElementById('run');
  const clock = document.getElementById('clock');

  if (!drawer || !stage || !moduleList || !cmd || !runBtn) {
    console.error('[ATLAS Spatial] Required UI node missing.');
    return;
  }

  moduleList.innerHTML = modules
    .map((name) => `<div class="module"><span>${name}</span><span class="badge">AVAILABLE</span></div>`)
    .join('');

  modulesBtn?.addEventListener('click', () => drawer.classList.add('open'));
  closeDrawer?.addEventListener('click', () => drawer.classList.remove('open'));

  focusBtn?.addEventListener('click', () => {
    stage.classList.toggle('focus');
    if (!stage.querySelector('.panel.active')) {
      stage.querySelector('.panel')?.classList.add('active');
    }
  });

  document.querySelectorAll('.panel').forEach((panel) => {
    panel.addEventListener('click', () => {
      document.querySelectorAll('.panel').forEach((item) => item.classList.remove('active'));
      panel.classList.add('active');
    });
  });

  function runCommand() {
    const query = cmd.value.trim().toLowerCase();
    if (!query) return;

    const panel = [...document.querySelectorAll('.panel')].find((candidate) => {
      const name = (candidate.dataset.name || '').toLowerCase();
      const first = name.split(' ')[0];
      return first && query.includes(first);
    });

    if (panel) {
      document.querySelectorAll('.panel').forEach((item) => item.classList.remove('active'));
      panel.classList.add('active');
      stage.classList.add('focus');
    } else {
      drawer.classList.add('open');
    }
    cmd.value = '';
  }

  runBtn.addEventListener('click', runCommand);
  cmd.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runCommand();
  });

  function updateClock() {
    if (!clock) return;
    clock.textContent = new Date().toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  updateClock();
  window.setInterval(updateClock, 1000);
})();
