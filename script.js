// Добавьте глобальную переменную для отслеживания получения стартового капитала
let starterCapitalReceived = false;

// В функции loadUserData() после загрузки транзакций проверьте, был ли уже получен капитал
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
    // Проверяем, был ли уже выдан стартовый капитал
    starterCapitalReceived = transactions.some(t => t.desc === '🎁 Стартовый капитал (демо)');
  }
  userNameDisplay.textContent = currentUser?.name || 'Клиент';
}

// В init() замените обработчик depositBtn на заглушку или удалите его
// и добавьте обработчик для кнопки стартового капитала:

document.getElementById('starterCapitalBtn')?.addEventListener('click', () => {
  if (starterCapitalReceived) {
    return showInfoModal('Стартовый капитал уже был получен ранее', false);
  }
  const primaryAcc = accounts.find(a => a.currency === 'RUB');
  if (!primaryAcc) return;
  
  primaryAcc.balance += 5000;
  addTransaction('in', '🎁 Стартовый капитал (демо)', 5000, primaryAcc.id);
  starterCapitalReceived = true;
  saveUserData();
  updateUI();
  showInfoModal('На ваш основной счёт зачислено 5000 ₽. Теперь вы можете переводить их другим клиентам.', true);
});
