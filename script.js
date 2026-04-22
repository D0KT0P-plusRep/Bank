(function(){
  "use strict";

  const EXCHANGE_API_KEY = 'YOUR_API_KEY';
  const BASE_CURRENCY = 'RUB';
  
  let users = JSON.parse(localStorage.getItem('bankUsers')) || [];
  let currentUser = JSON.parse(localStorage.getItem('bankCurrentUser')) || null;
  let tinRate = 7.82;
  const rateHistory = [7.82, 7.85, 7.79, 7.90, 7.88, 7.95, 7.92, 7.89, 7.86, 7.82];
  
  let accounts = [];
  let transactions = [];
  let exchangeRates = {};
  let starterCapitalReceived = false;

  // DOM
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

  function formatMoney(amount) { return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽'; }
  function generateAccountNumber() {
    const prefix = '40817';
    const randomPart = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    return prefix + randomPart;
  }
  function saveAllUsers() { localStorage.setItem('bankUsers', JSON.stringify(users)); }
  function findAccountByNumber(number) {
    const cleanNumber = number.trim();
    for (let user of users) {
      const account = user.accounts.find(acc => acc.number === cleanNumber);
      if (account) return { user, account };
    }
    return null;
  }
  function saveUserData() {
    if (!currentUser) return;
    const idx = users.findIndex(u => u.username === currentUser.username);
    if (idx !== -1) { users[idx].accounts = accounts; users[idx].transactions = transactions; }
    saveAllUsers();
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
          { id: 'acc1', name: 'Основной жестяной', balance: 0, currency: 'RUB', number: generateAccountNumber() },
          { id: 'tin1', name: 'Жестяной кошелёк', balance: 0, currency: 'TIN', number: 'TIN-0001' }
        ];
        transactions = [];
        saveUserData();
      }
      starterCapitalReceived = transactions.some(t => t.desc === '🎁 Стартовый капитал (демо)');
    }
    userNameDisplay.textContent = currentUser?.name || 'Клиент';
  }
  async function fetchExchangeRates() {
    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/${BASE_CURRENCY}`);
      const data = await response.json();
      if (data.result === 'success') {
        exchangeRates = data.conversion_rates;
        renderExchangeRates();
      }
    } catch (error) {
      exchangeRates = { USD: 92.5, EUR: 100.2, CNY: 12.8, GBP: 115.3 };
      renderExchangeRates();
    }
  }
  function renderExchangeRates() {
    const landingContainer = document.getElementById('landingRatesContainer');
    const dashContainer = document.getElementById('dashboardRatesContainer');
    const rates = Object.entries(exchangeRates).filter(([code]) => code !== BASE_CURRENCY).slice(0, 5);
    const html = rates.map(([code, rate]) => `<div class="rate-item"><span class="rate-currency">${code}</span><span class="rate-value">${rate.toFixed(2)} ₽</span></div>`).join('');
    if (landingContainer) landingContainer.innerHTML = html || 'Курсы недоступны';
    if (dashContainer) dashContainer.innerHTML = html || 'Курсы недоступны';
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
        <div><i class="fas fa-${acc.currency==='TIN'?'jar':'wallet'}"></i> ${acc.name}<br><small>${acc.number}</small></div>
        <div class="account-balance">${acc.currency==='TIN'? acc.balance+' 🥫' : formatMoney(acc.balance)}</div>
      </div>
    `).join('');
    populateSelects();
    updatePrimaryAccountInfo();
  }
  function populateSelects() {
    const transferFromSelect = document.getElementById('transferFromSelect');
    const tradeSelect = document.getElementById('tradeAccountSelect');
    const rubAccs = accounts.filter(a => a.currency === 'RUB');
    if (transferFromSelect) transferFromSelect.innerHTML = rubAccs.map(acc => `<option value="${acc.id}">${acc.name} (${acc.number.slice(-4)})</option>`).join('');
    if (tradeSelect) tradeSelect.innerHTML = rubAccs.map(acc => `<option value="${acc.id}">${acc.name}</option>`).join('');
  }
  function updatePrimaryAccountInfo() {
    const primaryAcc = accounts.find(a => a.currency === 'RUB');
    const infoBlock = document.getElementById('primaryAccountInfo');
    const numberEl = document.getElementById('primaryAccountNumber');
    if (primaryAcc && infoBlock && numberEl) {
      numberEl.textContent = primaryAcc.number;
      infoBlock.style.display = 'block';
    } else if (infoBlock) infoBlock.style.display = 'none';
  }
  function addTransaction(type, desc, amount, accountId) {
    transactions.push({ id:Date.now(), type, desc, amount, date:new Date().toISOString().slice(0,10), account:accountId });
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
  function updateTinRate() {
    tinRate = 7.5 + Math.random() * 1.5;
    document.querySelectorAll('#currentTinRate').forEach(el => el.textContent = tinRate.toFixed(2) + ' ₽');
    rateHistory.push(tinRate); if(rateHistory.length>10) rateHistory.shift();
    drawChart();
    calculateTradeTotal();
  }
  setInterval(updateTinRate, 10000);
  function drawChart() {
    const canvas = document.getElementById('tinChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w=300, h=150;
    ctx.clearRect(0,0,w,h);
    ctx.beginPath();
    const step = w/(rateHistory.length-1);
    const max = Math.max(...rateHistory), min = Math.min(...rateHistory);
    rateHistory.forEach((v,i) => {
      const x = i*step;
      const y = h - ((v-min)/(max-min))*h*0.8 - 10;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = '#779F00'; ctx.lineWidth=2.5; ctx.stroke();
  }
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

  function init() {
    if (EXCHANGE_API_KEY !== 'YOUR_API_KEY') fetchExchangeRates(); else renderExchangeRates();
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
      const accountNumber = generateAccountNumber();
      const newUser = {
        name, username: u, password: p,
        accounts: [
          { id: 'acc1', name: 'Основной жестяной', balance: 0, currency: 'RUB', number: accountNumber },
          { id: 'tin1', name: 'Жестяной кошелёк', balance: 0, currency: 'TIN', number: 'TIN-' + Date.now().toString().slice(-6) }
        ],
        transactions: []
      };
      users.push(newUser);
      saveAllUsers();
      currentUser = { username: u, name };
      localStorage.setItem('bankCurrentUser', JSON.stringify(currentUser));
      authModal.style.display = 'none';
      showBank();
    };

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
      saveAllUsers();
      currentUser.name = newName;
      localStorage.setItem('bankCurrentUser', JSON.stringify(currentUser));
      userNameDisplay.textContent = newName;
      profileModal.style.display = 'none';
      showInfoModal('Профиль обновлён');
    };

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

    navItems.forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); switchSection(item.dataset.section); }));

    document.getElementById('starterCapitalBtn')?.addEventListener('click', () => {
      if (starterCapitalReceived) return showInfoModal('Стартовый капитал уже получен', false);
      const primaryAcc = accounts.find(a => a.currency === 'RUB');
      if (!primaryAcc) return;
      primaryAcc.balance += 5000;
      addTransaction('in', '🎁 Стартовый капитал (демо)', 5000, primaryAcc.id);
      starterCapitalReceived = true;
      saveUserData(); updateUI(); showInfoModal('На основной счёт зачислено 5000 ₽', true);
    });

    document.getElementById('transferBtn')?.addEventListener('click', () => {
      const fromId = document.getElementById('transferFromSelect').value;
      const targetNumber = document.getElementById('transferTarget').value.trim();
      const amount = parseFloat(document.getElementById('transferAmount').value);
      if (!targetNumber) return showInfoModal('Введите номер счёта получателя', false);
      if (isNaN(amount) || amount <= 0) return showInfoModal('Некорректная сумма', false);
      const fromAcc = accounts.find(a => a.id === fromId);
      if (!fromAcc) return showInfoModal('Счёт отправителя не найден', false);
      if (fromAcc.balance < amount) return showInfoModal('Недостаточно средств', false);
      const recipientData = findAccountByNumber(targetNumber);
      if (!recipientData) return showInfoModal('Счёт получателя не найден', false);
      const { user: recipientUser, account: recipientAcc } = recipientData;
      if (recipientUser.username === currentUser.username && recipientAcc.id === fromAcc.id) return showInfoModal('Нельзя перевести на этот же счёт', false);
      fromAcc.balance -= amount;
      recipientAcc.balance += amount;
      addTransaction('out', `Перевод клиенту ${recipientUser.name} (${targetNumber})`, amount, fromAcc.id);
      recipientUser.transactions.push({
        id: Date.now() + 1, type: 'in',
        desc: `Перевод от ${currentUser.name} (${fromAcc.number})`,
        amount, date: new Date().toISOString().slice(0,10), account: recipientAcc.id
      });
      saveAllUsers();
      const updatedCurrentUser = users.find(u => u.username === currentUser.username);
      if (updatedCurrentUser) { accounts = updatedCurrentUser.accounts; transactions = updatedCurrentUser.transactions; }
      updateUI();
      showInfoModal(`Переведено ${formatMoney(amount)} на счёт ${targetNumber}`, true);
      document.getElementById('transferTarget').value = '';
    });

    document.getElementById('copyAccountNumberBtn')?.addEventListener('click', () => {
      const number = document.getElementById('primaryAccountNumber').textContent;
      navigator.clipboard?.writeText(number).then(() => showInfoModal('Номер скопирован')).catch(() => showInfoModal('Не удалось скопировать', false));
    });

    document.getElementById('historyFilterType')?.addEventListener('change', renderHistory);
    document.getElementById('historySearch')?.addEventListener('input', renderHistory);
    document.getElementById('quickTransferBtn')?.addEventListener('click', ()=> switchSection('accounts'));
    document.getElementById('showAllHistory')?.addEventListener('click', (e)=>{ e.preventDefault(); switchSection('history'); });

    document.getElementById('addAccountBtn')?.addEventListener('click', ()=> {
      const newAcc = { id:'acc'+Date.now(), name:'Новый жестяной', balance:0, currency:'RUB', number: generateAccountNumber() };
      accounts.push(newAcc); saveUserData(); updateUI(); showInfoModal(`Счёт открыт. Номер: ${newAcc.number}`);
    });
    document.getElementById('issueVirtualCardBtn')?.addEventListener('click', ()=> showInfoModal('Виртуальная карта выпущена'));
    document.getElementById('applyLoanBtn')?.addEventListener('click', ()=> showInfoModal('Заявка отправлена'));
    document.getElementById('sendSupportMsg')?.addEventListener('click', ()=> showInfoModal('Сообщение отправлено'));

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
  }

  init();
})();
