(function(){
  "use strict";

  // ---------- ХРАНЕНИЕ ----------
  let users = JSON.parse(localStorage.getItem('bankUsers')) || [];
  let currentUser = JSON.parse(localStorage.getItem('bankCurrentUser')) || null;
  let tinRate = 7.82;
  const rateHistory = [7.82, 7.85, 7.79, 7.90, 7.88, 7.95, 7.92, 7.89, 7.86, 7.82];

  let accounts = [];
  let transactions = [];

  // DOM элементы
  const landingPage = document.getElementById('landingPage');
  const bankApp = document.getElementById('bankApp');
  const authModal = document.getElementById('authModal');
  const infoModal = document.getElementById('infoModal');
  const profileModal = document.getElementById('profileModal');
  const modalContent = document.getElementById('modalContent');
  const landingLoginBtn = document.getElementById('landingLoginBtn');
  const landingRegisterBtn = document.getElementById('landingRegisterBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const profileBtn = document.getElementById('profileBtn');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const totalBalanceSpan = document.getElementById('totalBalancePreview');

  const sections = {
    dashboard: document.getElementById('section-dashboard'),
    accounts: document.getElementById('section-accounts'),
    trade: document.getElementById('section-trade'),
    history: document.getElementById('section-history'),
    cards: document.getElementById('section-cards'),
    loans: document.getElementById('section-loans'),
    support: document.getElementById('section-support')
  };
  const navItems = document.querySelectorAll('.nav-item');

  // Функции форматирования
  function formatMoney(amount) { return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽'; }
  
  function saveUserData() {
    if (!currentUser) return;
    const idx = users.findIndex(u => u.username === currentUser.username);
    if (idx !== -1) { users[idx].accounts = accounts; users[idx].transactions = transactions; }
    localStorage.setItem('bankUsers', JSON.stringify(users));
    localStorage.setItem('bankCurrentUser', JSON.stringify(currentUser));
  }

  function loadUserData() {
    if (!currentUser) return;
    const user = users.find(u => u.username === currentUser.username);
    if (user) {
      accounts = user.accounts || [];
      transactions = user.transactions || [];
      if (accounts.length === 0) {
        accounts = [
          { id: 'acc1', name: 'Основной жестяной', balance: 0, currency: 'RUB', number: '40817810512345678901' },
          { id: 'tin1', name: 'Жестяной кошелёк', balance: 0, currency: 'TIN', number: 'TIN-0001' }
        ];
        transactions = [];
      }
    }
    userNameDisplay.textContent = currentUser?.name || 'Клиент';
  }

  function updateTotalBalance() {
    const total = accounts.filter(a=>a.currency==='RUB').reduce((s,a)=>s+a.balance,0);
    totalBalanceSpan.textContent = formatMoney(total);
  }

  function renderAccountsOverview() {
    const cont = document.getElementById('accountsOverview');
    if (!cont) return;
    cont.innerHTML = accounts.map(acc => `
      <div class="account-item">
        <span class="account-name"><i class="fas fa-${acc.currency==='TIN'?'jar':'wallet'}"></i> ${acc.name}</span>
        <span class="account-balance">${acc.currency==='TIN'? acc.balance+' 🥫' : formatMoney(acc.balance)}</span>
      </div>
    `).join('');
  }

  function renderRecentTransactions() {
    const cont = document.getElementById('recentTransactions');
    if (!cont) return;
    const recent = [...transactions].reverse().slice(0,4);
    cont.innerHTML = recent.map(t => {
      const acc = accounts.find(a=>a.id===t.account) || { name:'?' };
      return `<div class="operation">
        <div class="operation-icon"><i class="fas ${t.type==='in'?'fa-arrow-down income':'fa-arrow-up expense'}"></i></div>
        <div class="operation-detail"><strong>${t.desc}</strong><br><small>${acc.name} · ${t.date}</small></div>
        <div class="operation-amount ${t.type==='in'?'income':'expense'}">${t.type==='in'?'+':'-'}${formatMoney(t.amount)}</div>
      </div>`;
    }).join('');
  }

  function renderAccountsDetail() {
    const list = document.getElementById('accountsDetailList');
    if (!list) return;
    list.innerHTML = accounts.map(acc => `
      <div class="account-item">
        <div><i class="fas fa-${acc.currency==='TIN'?'jar':'wallet'}"></i> ${acc.name}<br><small style="color:#6c7a89;">${acc.number}</small></div>
        <div class="account-balance">${acc.currency==='TIN'? acc.balance+' 🥫' : formatMoney(acc.balance)}</div>
      </div>
    `).join('');
    populateSelects();
  }

  function populateSelects() {
    const deposit = document.getElementById('depositAccountSelect');
    const transfer = document.getElementById('transferFromSelect');
    const tradeSelect = document.getElementById('tradeAccountSelect');
    const rubAccs = accounts.filter(a=>a.currency==='RUB');
    if (deposit) deposit.innerHTML = rubAccs.map(a=>`<option value="${a.id}">${a.name} (${formatMoney(a.balance)})</option>`).join('');
    if (transfer) transfer.innerHTML = rubAccs.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');
    if (tradeSelect) tradeSelect.innerHTML = rubAccs.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');
  }

  function addTransaction(type, desc, amount, accountId) {
    transactions.push({ id:Date.now(), type, desc, amount, date:new Date().toISOString().slice(0,10), account:accountId });
    saveUserData();
  }

  function showInfoModal(msg, success=true) {
    modalContent.innerHTML = `<h3>${success?'✅':'⚠️'} БАНКа ЖЕСТЬяная</h3><p>${msg}</p>`;
    infoModal.style.display = 'flex';
  }

  function renderHistory() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    const filterType = document.getElementById('historyFilterType')?.value || 'all';
    const searchTerm = document.getElementById('historySearch')?.value.trim().toLowerCase() || '';
    let filtered = [...transactions].reverse();
    if (filterType !== 'all') filtered = filtered.filter(t => t.type === filterType);
    if (searchTerm) filtered = filtered.filter(t => t.desc.toLowerCase().includes(searchTerm));
    tbody.innerHTML = filtered.map(t => {
      const acc = accounts.find(a => a.id === t.account) || { name: 'Неизвестно' };
      const amountClass = t.type === 'in' ? 'history-amount-income' : 'history-amount-expense';
      const sign = t.type === 'in' ? '+' : '-';
      return `<tr><td>${t.date}</td><td>${t.desc}</td><td>${acc.name}</td><td class="${amountClass}">${sign}${formatMoney(t.amount)}</td></tr>`;
    }).join('');
  }

  // Улучшенный график ЖЕСТИ
  function drawChart() {
    const canvas = document.getElementById('tinChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = 300, h = 150;
    const padding = { left: 35, right: 15, top: 15, bottom: 25 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);
    
    // Фон
    ctx.fillStyle = '#faf9fc';
    ctx.fillRect(0, 0, w, h);
    
    // Сетка и подписи
    const max = Math.max(...rateHistory) * 1.02;
    const min = Math.min(...rateHistory) * 0.98;
    const range = max - min;
    
    ctx.beginPath();
    ctx.strokeStyle = '#e2dce8';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i/4) * chartH;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      
      // Подписи оси Y
      const val = max - (i/4) * range;
      ctx.fillStyle = '#5a4e63';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(2), padding.left - 5, y + 3);
    }
    ctx.stroke();
    
    // Ось X
    ctx.beginPath();
    ctx.strokeStyle = '#b0a6b8';
    ctx.lineWidth = 1;
    ctx.moveTo(padding.left, h - padding.bottom);
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();
    
    // Подписи оси X (последние 5 меток)
    ctx.fillStyle = '#5a4e63';
    ctx.font = '8px Inter, sans-serif';
    ctx.textAlign = 'center';
    const step = chartW / (rateHistory.length - 1);
    [0, Math.floor(rateHistory.length/2), rateHistory.length-1].forEach(idx => {
      const x = padding.left + idx * step;
      ctx.fillText(rateHistory.length - idx + 'д', x, h - 8);
    });

    // Заливка области под графиком
    ctx.beginPath();
    rateHistory.forEach((v, i) => {
      const x = padding.left + i * step;
      const y = padding.top + chartH - ((v - min) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    const lastX = padding.left + (rateHistory.length-1) * step;
    ctx.lineTo(lastX, h - padding.bottom);
    ctx.lineTo(padding.left, h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = '#A7CF3480';
    ctx.fill();
    
    // Линия графика
    ctx.beginPath();
    rateHistory.forEach((v, i) => {
      const x = padding.left + i * step;
      const y = padding.top + chartH - ((v - min) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#4D6800';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Точки
    rateHistory.forEach((v, i) => {
      const x = padding.left + i * step;
      const y = padding.top + chartH - ((v - min) / range) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, 2*Math.PI);
      ctx.fillStyle = '#5C026F';
      ctx.shadowColor = '#9F31B7';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  function updateTinRate() {
    tinRate = 7.5 + Math.random() * 1.5;
    document.querySelectorAll('#tinRateDisplay, #landingTinRate, #currentTinRate').forEach(el => { if(el) el.textContent = tinRate.toFixed(2) + ' ₽'; });
    rateHistory.push(tinRate);
    if(rateHistory.length > 15) rateHistory.shift(); // больше истории для графика
    drawChart();
    calculateTradeTotal();
  }
  setInterval(updateTinRate, 10000);

  function calculateTradeTotal() {
    const amount = parseFloat(document.getElementById('tradeAmountTin')?.value) || 0;
    const totalEl = document.getElementById('tradeTotal');
    if(totalEl) totalEl.textContent = formatMoney(amount * tinRate);
  }

  function switchSection(sectionId) {
    Object.values(sections).forEach(s => { if(s) s.style.display = 'none'; });
    if (sections[sectionId]) sections[sectionId].style.display = 'block';
    navItems.forEach(i => { i.classList.remove('active'); if(i.dataset.section===sectionId) i.classList.add('active'); });
    if (sectionId === 'accounts') renderAccountsDetail();
    if (sectionId === 'dashboard') { renderAccountsOverview(); renderRecentTransactions(); }
    if (sectionId === 'trade') {
      const tinAcc = accounts.find(a=>a.currency==='TIN');
      document.getElementById('tinBalanceDisplay').textContent = (tinAcc?.balance || 0) + ' 🥫';
      calculateTradeTotal();
      drawChart(); // перерисовка при показе
    }
    if (sectionId === 'history') renderHistory();
  }

  function updateUI() {
    updateTotalBalance();
    renderAccountsOverview();
    renderRecentTransactions();
    renderAccountsDetail();
    const tinAcc = accounts.find(a=>a.currency==='TIN');
    if(tinAcc) document.getElementById('tinBalanceDisplay').textContent = tinAcc.balance + ' 🥫';
    document.getElementById('currentTinRate').textContent = tinRate.toFixed(2) + ' ₽';
    if(accounts[0]) document.getElementById('cardBalance1').textContent = formatMoney(accounts[0].balance);
    if(accounts[1]) document.getElementById('cardBalance2').textContent = formatMoney(accounts[1]?.balance || 0);
    calculateTradeTotal();
    drawChart();
    if (sections.history.style.display === 'block') renderHistory();
  }

  function showBank() {
    landingPage.style.display = 'none';
    bankApp.style.display = 'block';
    loadUserData();
    updateUI();
    switchSection('dashboard');
  }

  function showLanding() {
    bankApp.style.display = 'none';
    landingPage.style.display = 'block';
    authModal.style.display = 'none';
    currentUser = null;
    localStorage.removeItem('bankCurrentUser');
  }

  // Инициализация событий
  function init() {
    landingLoginBtn.onclick = () => authModal.style.display = 'flex';
    landingRegisterBtn.onclick = () => { authModal.style.display = 'flex'; document.getElementById('modalTabRegister').click(); };
    logoutBtn.onclick = showLanding;
    document.getElementById('closeAuthModal').onclick = () => authModal.style.display = 'none';
    document.getElementById('closeInfoModal').onclick = () => infoModal.style.display = 'none';
    document.getElementById('closeProfileModal').onclick = () => profileModal.style.display = 'none';
    
    const tabLogin = document.getElementById('modalTabLogin');
    const tabReg = document.getElementById('modalTabRegister');
    tabLogin.onclick = () => { tabLogin.classList.add('active'); tabReg.classList.remove('active'); document.getElementById('modalLoginForm').style.display='block'; document.getElementById('modalRegisterForm').style.display='none'; };
    tabReg.onclick = () => { tabReg.classList.add('active'); tabLogin.classList.remove('active'); document.getElementById('modalRegisterForm').style.display='block'; document.getElementById('modalLoginForm').style.display='none'; };

    document.getElementById('modalLoginForm').onsubmit = (e) => {
      e.preventDefault();
      const u = document.getElementById('modalLoginUsername').value.trim();
      const p = document.getElementById('modalLoginPassword').value;
      const user = users.find(x => x.username === u && x.password === p);
      if (user) {
        currentUser = { username: user.username, name: user.name };
        localStorage.setItem('bankCurrentUser', JSON.stringify(currentUser));
        authModal.style.display = 'none';
        showBank();
      } else document.getElementById('modalLoginError').textContent = 'Неверные данные';
    };

    document.getElementById('modalRegisterForm').onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('modalRegName').value.trim();
      const u = document.getElementById('modalRegUsername').value.trim();
      const p = document.getElementById('modalRegPassword').value;
      const c = document.getElementById('modalRegConfirm').value;
      if (p !== c) return document.getElementById('modalRegError').textContent = 'Пароли не совпадают';
      if (p.length<4) return document.getElementById('modalRegError').textContent = 'Минимум 4 символа';
      if (users.find(x=>x.username===u)) return document.getElementById('modalRegError').textContent = 'Логин занят';
      const newUser = {
        name, username: u, password: p,
        accounts: [
          { id:'acc1', name:'Основной жестяной', balance:0, currency:'RUB', number:'40817810512345678901' },
          { id:'tin1', name:'Жестяной кошелёк', balance:0, currency:'TIN', number:'TIN-0001' }
        ],
        transactions: []
      };
      users.push(newUser);
      localStorage.setItem('bankUsers', JSON.stringify(users));
      currentUser = { username: u, name };
      localStorage.setItem('bankCurrentUser', JSON.stringify(currentUser));
      authModal.style.display = 'none';
      showBank();
    };

    // Профиль
    profileBtn.onclick = () => {
      if (!currentUser) return;
      const user = users.find(u => u.username === currentUser.username);
      document.getElementById('profileName').value = user?.name || '';
      document.getElementById('profileNewPassword').value = '';
      document.getElementById('profileConfirmPassword').value = '';
      document.getElementById('profileCurrentPassword').value = '';
      document.getElementById('profileError').textContent = '';
      profileModal.style.display = 'flex';
    };
    document.getElementById('profileForm').onsubmit = (e) => {
      e.preventDefault();
      const user = users.find(u => u.username === currentUser.username);
      const newName = document.getElementById('profileName').value.trim();
      const newPass = document.getElementById('profileNewPassword').value;
      const confirmPass = document.getElementById('profileConfirmPassword').value;
      const currentPass = document.getElementById('profileCurrentPassword').value;
      if (currentPass !== user.password) return document.getElementById('profileError').textContent = 'Неверный текущий пароль';
      if (newPass) {
        if (newPass.length < 4) return document.getElementById('profileError').textContent = 'Новый пароль минимум 4 символа';
        if (newPass !== confirmPass) return document.getElementById('profileError').textContent = 'Пароли не совпадают';
        user.password = newPass;
      }
      user.name = newName;
      localStorage.setItem('bankUsers', JSON.stringify(users));
      currentUser.name = newName;
      localStorage.setItem('bankCurrentUser', JSON.stringify(currentUser));
      userNameDisplay.textContent = newName;
      profileModal.style.display = 'none';
      showInfoModal('Профиль обновлён');
    };

    // Торговля
    document.getElementById('tradeAmountTin').addEventListener('input', calculateTradeTotal);
    document.getElementById('executeTradeBtn').addEventListener('click', () => {
      const type = document.getElementById('tradeType').value;
      const accId = document.getElementById('tradeAccountSelect').value;
      const amountTin = parseFloat(document.getElementById('tradeAmountTin').value);
      if (isNaN(amountTin) || amountTin<=0) return showInfoModal('Введите количество', false);
      const rubAcc = accounts.find(a=>a.id===accId);
      const tinAcc = accounts.find(a=>a.currency==='TIN');
      if (!rubAcc || !tinAcc) return;
      const cost = amountTin * tinRate;
      if (type === 'buy') {
        if (rubAcc.balance < cost) return showInfoModal('Недостаточно рублей', false);
        rubAcc.balance -= cost;
        tinAcc.balance += amountTin;
        addTransaction('out', `Покупка ${amountTin}🥫 ЖЕСТИ`, cost, accId);
      } else {
        if (tinAcc.balance < amountTin) return showInfoModal('Недостаточно ЖЕСТИ', false);
        tinAcc.balance -= amountTin;
        rubAcc.balance += cost;
        addTransaction('in', `Продажа ${amountTin}🥫 ЖЕСТИ`, cost, accId);
      }
      saveUserData(); updateUI(); showInfoModal(`Операция выполнена. Курс: ${tinRate.toFixed(2)}₽`, true);
    });

    // Навигация
    navItems.forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); switchSection(item.dataset.section); }));

    // Пополнение счёта (имитация внешнего поступления)
    document.getElementById('depositBtn')?.addEventListener('click', () => {
      const accId = document.getElementById('depositAccountSelect').value;
      const amount = parseFloat(document.getElementById('depositAmount').value);
      if (isNaN(amount) || amount <= 0) return showInfoModal('Введите сумму', false);
      const acc = accounts.find(a => a.id === accId);
      if (acc) {
        acc.balance += amount;
        addTransaction('in', 'Пополнение с карты/счета', amount, accId);
        saveUserData(); updateUI(); showInfoModal(`Счёт пополнен на ${formatMoney(amount)}`);
      }
    });

    // Перевод между счетами (внутренний или внешний)
    document.getElementById('transferBtn')?.addEventListener('click', () => {
      const fromId = document.getElementById('transferFromSelect').value;
      const target = document.getElementById('transferTarget').value.trim();
      const amount = parseFloat(document.getElementById('transferAmount').value);
      if (!target) return showInfoModal('Укажите получателя', false);
      if (isNaN(amount) || amount <= 0) return showInfoModal('Некорректная сумма', false);
      const fromAcc = accounts.find(a => a.id === fromId);
      if (!fromAcc) return;
      if (fromAcc.balance < amount) return showInfoModal('Недостаточно средств', false);
      
      // Ищем счёт получателя по номеру или названию среди ВСЕХ пользователей (имитация межбанковского перевода)
      let toAcc = null;
      let external = true;
      
      // Сначала ищем среди своих счетов
      toAcc = accounts.find(a => a.number === target || a.name === target);
      if (toAcc && toAcc.id !== fromId) external = false;
      
      if (!external) {
        // Внутренний перевод между своими счетами
        fromAcc.balance -= amount;
        toAcc.balance += amount;
        addTransaction('out', `Перевод на ${toAcc.name}`, amount, fromId);
        addTransaction('in', `Перевод с ${fromAcc.name}`, amount, toAcc.id);
        showInfoModal(`Переведено ${formatMoney(amount)} на счёт ${toAcc.name}`, true);
      } else {
        // Внешний перевод (деньги уходят из системы)
        fromAcc.balance -= amount;
        addTransaction('out', `Перевод: ${target}`, amount, fromId);
        showInfoModal(`Переведено ${formatMoney(amount)} получателю ${target}`, true);
      }
      saveUserData(); updateUI();
    });

    // Фильтры истории
    document.getElementById('historyFilterType')?.addEventListener('change', renderHistory);
    document.getElementById('historySearch')?.addEventListener('input', renderHistory);

    // Быстрые кнопки
    document.getElementById('quickTopupBtn')?.addEventListener('click', ()=> switchSection('accounts'));
    document.getElementById('quickTransferBtn')?.addEventListener('click', ()=> switchSection('accounts'));
    document.getElementById('showAllHistory')?.addEventListener('click', (e)=>{ e.preventDefault(); switchSection('history'); });

    // Табы
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.closest('.tabs')) {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById('depositTab').style.display = btn.dataset.tab === 'depositTab' ? 'block' : 'none';
          document.getElementById('transferTab').style.display = btn.dataset.tab === 'transferTab' ? 'block' : 'none';
        }
      });
    });

    // Заглушки
    document.getElementById('addAccountBtn')?.addEventListener('click', ()=> {
      const newAccNumber = '40817' + Math.floor(Math.random()*1000000000).toString().padStart(9,'0');
      const newAcc = { id:'acc'+Date.now(), name:'Новый жестяной', balance:0, currency:'RUB', number: newAccNumber };
      accounts.push(newAcc); saveUserData(); updateUI(); showInfoModal(`Счёт открыт. Номер: ${newAccNumber}`);
    });
    document.getElementById('issueVirtualCardBtn')?.addEventListener('click', ()=> showInfoModal('Виртуальная карта выпущена'));
    document.getElementById('applyLoanBtn')?.addEventListener('click', ()=> showInfoModal('Заявка отправлена. Одобрение 99%'));
    document.getElementById('sendSupportMsg')?.addEventListener('click', ()=> showInfoModal('Сообщение отправлено'));

    // Кредитный калькулятор
    const loanSlider = document.getElementById('loanSlider');
    const loanTerm = document.getElementById('loanTermSlider');
    const amountLabel = document.getElementById('loanAmountLabel');
    const termLabel = document.getElementById('loanTermLabel');
    const calcRes = document.getElementById('loanCalcResult');
    function updateLoanCalc() {
      const P = parseFloat(loanSlider.value);
      const months = parseInt(loanTerm.value);
      const rate = 0.12;
      const monthlyRate = rate / 12;
      const payment = P * monthlyRate / (1 - Math.pow(1+monthlyRate, -months));
      amountLabel.textContent = formatMoney(P);
      termLabel.textContent = months + ' мес.';
      calcRes.innerHTML = `Ежемесячный платёж: ≈ ${formatMoney(Math.round(payment))}<br>Переплата: ~${formatMoney(Math.round(payment*months - P))}`;
    }
    loanSlider?.addEventListener('input', updateLoanCalc);
    loanTerm?.addEventListener('input', updateLoanCalc);
    updateLoanCalc();

    if (currentUser) showBank(); else showLanding();
    updateTinRate();
    drawChart();
  }

  init();
})();
