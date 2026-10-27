/* ============ STATE MANAGEMENT ============ */
const STORAGE_KEY = 'slate_bank_state_v3';
const defaultState = {
  user: { name: 'Mario Rossi', email: 'mario@example.com', avatar: null },
  balances: { EUR: 18450.75, USD: 1250.00, GBP: 500.00 },
  card: { revealed: false, frozen: false, flipped: false },
  settings: { faceId: false, twoFactor: true, push: true },
  password: 'password123',
  transactions: [
    { id: 'TXN-9821A', name: 'Apple Store', category: 'Tecnologia', type: 'out', amount: 1299.00, date: Date.now() - 3600000 * 2, icon: 'apple' },
    { id: 'TXN-7712B', name: 'Bonifico in entrata', category: 'Stipendio', type: 'in', amount: 4500.00, date: Date.now() - 86400000, icon: 'briefcase' },
    { id: 'TXN-3341C', name: 'Spotify Premium', category: 'Abbonamenti', type: 'out', amount: 10.99, date: Date.now() - 86400000 * 2, icon: 'music' },
    { id: 'TXN-1109D', name: 'Amazon.it', category: 'Shopping', type: 'out', amount: 45.50, date: Date.now() - 86400000 * 3, icon: 'shopping' }
  ]
};

let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || JSON.parse(JSON.stringify(defaultState));
let chartInstance = null, pieChartInstance = null;

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function fmt(n) { return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n); }
function getInitials(name) { return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase(); }

const icons = {
  apple: '<svg viewBox="0 0 24 24"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06z"/><path d="M10 2c1 .5 2 2 2 5s-2 4-2 4-2-1-2-4 1-4.5 2-5z"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  music: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  shopping: '<svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
};

/* ============ AUTH ============ */
function checkAuth() {
  const isAuth = localStorage.getItem('slate_session');
  if(isAuth) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    updateUI();
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }
}
function toggleAuth() {
  const login = document.getElementById('login-form');
  const reg = document.getElementById('register-form');
  login.style.display = login.style.display === 'none' ? 'block' : 'none';
  reg.style.display = reg.style.display === 'none' ? 'block' : 'none';
}
function doLogin() {
  const email = document.getElementById('loginEmail').value;
  if(!email) return showToast('Inserisci una email valida', 'error');
  localStorage.setItem('slate_session', email);
  showToast('Accesso autorizzato');
  setTimeout(checkAuth, 600);
}
function doRegister() {
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  if(!name || !email) return showToast('Compila tutti i campi', 'error');
  state.user = { name, email, avatar: null };
  save();
  localStorage.setItem('slate_session', email);
  showToast('Account Premium creato');
  setTimeout(checkAuth, 600);
}
function doLogout() { localStorage.removeItem('slate_session'); location.reload(); }

/* ============ NAVIGATION ============ */
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if(target) target.classList.add('active');
  document.querySelectorAll('.nav-item, .bn-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  
  if(page === 'analytics') {
    setTimeout(() => {
      if(!chartInstance) initCharts();
      else { chartInstance.resize(); pieChartInstance.resize(); }
    }, 50);
  }
  if(page === 'exchange') updateExchangeUI();
}
document.querySelectorAll('.nav-item, .bn-item').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.page)));

/* ============ UI UPDATES ============ */
function updateUI() {
  const initials = getInitials(state.user.name);
  const firstName = state.user.name.split(' ')[0];
  
  const updateAvatar = (id) => {
    const el = document.getElementById(id);
    if(!el) return;
    if(state.user.avatar) {
      el.style.backgroundImage = `url(${state.user.avatar})`;
      el.textContent = '';
    } else {
      el.style.backgroundImage = 'none';
      el.textContent = initials;
    }
  };

  updateAvatar('sideAvatar');
  updateAvatar('profAvatar');
  
  document.getElementById('sideName').textContent = state.user.name;
  document.getElementById('profName').textContent = state.user.name;
  document.getElementById('profEmail').textContent = state.user.email;
  document.getElementById('greetName').textContent = firstName;
  document.getElementById('mainBalance').textContent = fmt(state.balances.EUR);
  
  const list = document.getElementById('recentTxList');
  list.innerHTML = state.transactions.slice(0, 5).map(t => `
    <div class="tx-item" onclick="openReceipt('${t.id}')">
      <div class="tx-icon">${icons[t.icon] || icons.shopping}</div>
      <div class="tx-info">
        <div class="tx-name">${t.name}</div>
        <div class="tx-cat">${t.category}</div>
      </div>
      <div class="tx-amount ${t.type === 'in' ? 'pos' : ''}">
        ${t.type === 'in' ? '+' : '-'}${fmt(t.amount)}
      </div>
    </div>
  `).join('');
  
  const card = document.getElementById('virtualCard');
  if(state.card.frozen) card.classList.add('frozen');
  else card.classList.remove('frozen');
  if(state.card.flipped) card.classList.add('is-flipped');
  else card.classList.remove('is-flipped');

  document.getElementById('toggle-faceid').classList.toggle('active', state.settings.faceId);
  document.getElementById('toggle-2fa').classList.toggle('active', state.settings.twoFactor);
  document.getElementById('toggle-push').classList.toggle('active', state.settings.push);
}

/* ============ UPLOAD FOTO PROFILO ============ */
function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    return showToast('L\'immagine è troppo grande (Max 2MB)', 'error');
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    state.user.avatar = e.target.result;
    save();
    updateUI();
    showToast('Foto profilo aggiornata');
  };
  reader.readAsDataURL(file);
}

/* ============ ACTIONS & MODALS ============ */
function openModal(id) { 
  const modal = document.getElementById('modal-' + id);
  if(modal) {
    modal.classList.add('open');
    if(id === 'editProfile') {
      document.getElementById('editName').value = state.user.name;
      document.getElementById('editEmail').value = state.user.email;
    }
  }
}
function closeModal(id) { 
  const modal = document.getElementById('modal-' + id);
  if(modal) modal.classList.remove('open'); 
}

function executeSend() {
  const name = document.getElementById('sendName').value;
  const amount = parseFloat(document.getElementById('sendAmount').value);
  if(!name || !amount || amount <= 0) return showToast('Dati non validi', 'error');
  if(amount > state.balances.EUR) return showToast('Saldo insufficiente', 'error');
  
  state.balances.EUR -= amount;
  state.transactions.unshift({ id: 'TXN-' + Math.floor(Math.random()*10000) + 'X', name: name, category: 'Trasferimenti', type: 'out', amount: amount, date: Date.now(), icon: 'briefcase' });
  save(); updateUI(); closeModal('send');
  document.getElementById('sendName').value = ''; document.getElementById('sendAmount').value = '';
  showToast(`Trasferimento di ${fmt(amount)} completato`);
}

function executeTopup() {
  const amount = parseFloat(document.getElementById('topupAmount').value);
  if(!amount || amount <= 0) return showToast('Importo non valido', 'error');
  state.balances.EUR += amount;
  state.transactions.unshift({ id: 'TXN-' + Math.floor(Math.random()*10000) + 'X', name: 'Ricarica Conto', category: 'Entrate', type: 'in', amount: amount, date: Date.now(), icon: 'briefcase' });
  save(); updateUI(); closeModal('topup');
  document.getElementById('topupAmount').value = '';
  showToast(`Conto ricaricato di ${fmt(amount)}`);
}

function openReceipt(txId) {
  const tx = state.transactions.find(t => t.id === txId);
  if(!tx) return;
  document.getElementById('receiptIcon').innerHTML = icons[tx.icon] || icons.shopping;
  document.getElementById('receiptAmount').innerHTML = `<span style="color:${tx.type === 'in' ? 'var(--success)' : 'var(--text-primary)'}">${tx.type === 'in' ? '+' : '-'}${fmt(tx.amount)}</span>`;
  document.getElementById('receiptName').textContent = tx.name;
  document.getElementById('receiptDate').textContent = new Date(tx.date).toLocaleString('it-IT', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  document.getElementById('receiptId').textContent = tx.id;
  openModal('receipt');
}

/* ============ SETTINGS LOGIC ============ */
function toggleSetting(key, el) {
  state.settings[key] = !state.settings[key];
  el.classList.toggle('active', state.settings[key]);
  save();
}

function copyIBAN() {
  navigator.clipboard.writeText('IT60X0542811101000000123456');
  showToast('IBAN copiato negli appunti');
}

function saveProfile() {
  const name = document.getElementById('editName').value;
  const email = document.getElementById('editEmail').value;
  if(!name || !email) return showToast('Compila tutti i campi', 'error');
  state.user.name = name;
  state.user.email = email;
  save();
  updateUI();
  closeModal('editProfile');
  showToast('Dati personali aggiornati');
}

function savePassword() {
  const oldPass = document.getElementById('oldPass').value;
  const newPass = document.getElementById('newPass').value;
  if(oldPass !== state.password) return showToast('Vecchia password errata', 'error');
  if(!newPass || newPass.length < 6) return showToast('La nuova password deve avere almeno 6 caratteri', 'error');
  state.password = newPass;
  save();
  closeModal('password');
  document.getElementById('oldPass').value = '';
  document.getElementById('newPass').value = '';
  showToast('Password aggiornata con successo');
}

/* ============ 3D CARD ============ */
const cardEl = document.getElementById('virtualCard');
const cardScene = document.querySelector('.card-scene');
cardScene.addEventListener('mousemove', (e) => {
  if(state.card.flipped) return;
  const rect = cardScene.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * -15;
  const rotateY = ((x - centerX) / centerX) * 15;
  cardEl.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});
cardScene.addEventListener('mouseleave', () => {
  if(state.card.flipped) return;
  cardEl.style.transform = `rotateX(0) rotateY(0)`;
});
function toggleCardFlip(e) {
  state.card.flipped = !state.card.flipped;
  cardEl.style.transform = state.card.flipped ? `rotateY(180deg)` : `rotateX(0) rotateY(0)`;
  save();
}
function toggleFreeze() {
  state.card.frozen = !state.card.frozen;
  save(); updateUI();
  document.getElementById('btnFreeze').innerHTML = state.card.frozen 
    ? '<svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20"/></svg> Sblocca Carta'
    : '<svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg> Congela Carta';
  showToast(state.card.frozen ? 'Carta congelata' : 'Carta attivata', state.card.frozen ? 'error' : 'success');
}
function toggleReveal() {
  state.card.revealed = !state.card.revealed;
  document.getElementById('ccNumber').textContent = state.card.revealed ? '4821 0000 4821 0000' : '•••• •••• •••• 4821';
  document.getElementById('ccCvv').textContent = state.card.revealed ? '482' : '•••';
  document.getElementById('btnReveal').innerHTML = state.card.revealed 
    ? '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Nascondi Dati'
    : '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Mostra Dati';
}

/* ============ EXCHANGE ============ */
function updateExchangeUI() {
  document.getElementById('eurBal').textContent = fmt(state.balances.EUR);
  document.getElementById('usdBal').textContent = '$' + state.balances.USD.toFixed(2);
}
function doExchange() {
  const amount = parseFloat(document.getElementById('exAmount').value);
  if(!amount || amount <= 0) return showToast('Importo non valido', 'error');
  if(amount > state.balances.EUR) return showToast('Saldo EUR insufficiente', 'error');
  const rate = 1.085;
  const usdAmount = amount * rate;
  state.balances.EUR -= amount; state.balances.USD += usdAmount;
  state.transactions.unshift({ id: 'TXN-' + Math.floor(Math.random()*10000) + 'X', name: 'Cambio EUR/USD', category: 'Sistema', type: 'out', amount: amount, date: Date.now(), icon: 'briefcase' });
  save(); updateExchangeUI(); updateUI(); document.getElementById('exAmount').value = '';
  showToast(`Convertiti ${fmt(amount)} in $${usdAmount.toFixed(2)}`);
}

/* ============ CHARTS & PLUGINS ============ */
const chartDataSets = {
  '7D': [120, 190, 80, 210, 150, 320, 90],
  '1M': [1500, 1800, 1200, 2200, 1700, 2800, 1900, 2100, 1600, 2400, 2000, 2600],
  '1Y': [12000, 15000, 11000, 18000, 14000, 22000, 16000]
};

// Plugin per centrare il testo matematicamente nel buco della ciambella
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw: function(chart) {
    if (chart.config.type !== 'doughnut') return;
    const { ctx, chartArea: { width, height, top, left } } = chart;
    
    ctx.save();
    
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    // Testo Superiore (Label)
    ctx.font = "600 12px Inter";
    ctx.fillStyle = "#a1a1aa";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPESE TOTALI", centerX, centerY - 14);
    
    // Testo Inferiore (Importo)
    ctx.font = "700 24px 'JetBrains Mono'";
    ctx.fillStyle = "#f4f4f5";
    ctx.fillText("€1.355,49", centerX, centerY + 14);
    
    ctx.restore();
  }
};

function initCharts() {
  Chart.defaults.color = '#a1a1aa';
  Chart.defaults.font.family = "'Inter', sans-serif";

  const ctxLine = document.getElementById('spendingChart').getContext('2d');
  const gradient = ctxLine.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

  chartInstance = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
      datasets: [{ label: 'Entrate/Uscite', data: chartDataSets['7D'], borderColor: '#6366f1', backgroundColor: gradient, fill: true, tension: 0.4, borderWidth: 2, pointBackgroundColor: '#000', pointBorderColor: '#6366f1', pointBorderWidth: 2, pointRadius: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#18181b', titleColor: '#fff', bodyColor: '#a1a1aa', borderColor: '#27272a', borderWidth: 1 } },
      scales: { y: { grid: { color: '#27272a', drawBorder: false }, beginAtZero: true }, x: { grid: { display: false } } }
    }
  });

  const ctxPie = document.getElementById('categoryChart').getContext('2d');
  pieChartInstance = new Chart(ctxPie, {
    type: 'doughnut',
    data: {
      labels: ['Tecnologia', 'Shopping', 'Abbonamenti', 'Trasferimenti'],
      datasets: [{ data: [45, 25, 15, 15], backgroundColor: ['#6366f1', '#00d2ff', '#10b981', '#f59e0b'], borderWidth: 0, hoverOffset: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '75%',
      plugins: { 
        legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } }, 
        tooltip: { backgroundColor: '#18181b', titleColor: '#fff', bodyColor: '#a1a1aa', borderColor: '#27272a', borderWidth: 1 } 
      }
    },
    plugins: [centerTextPlugin] // <--- QUI ATTIVIAMO IL PLUGIN
  });
}

function updateChartPeriod(period, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  let labels = [];
  if(period === '7D') labels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  else if(period === '1M') labels = ['1', '5', '10', '15', '20', '25', '30', '31'];
  else labels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug'];
  
  chartInstance.data.labels = labels;
  chartInstance.data.datasets[0].data = chartDataSets[period];
  chartInstance.update();
}

/* ============ TOAST ============ */
function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <svg viewBox="0 0 24 24" style="color:${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'}; width:18px; height:18px;">
      ${type === 'success' ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' : 
        type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' : 
        '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'}
    </svg>
    <span>${msg}</span>
  `;
  document.getElementById('toastWrap').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; el.style.transition = 'all 0.3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

/* START */
checkAuth();
document.getElementById('btnFreeze').innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg> Congela Carta';