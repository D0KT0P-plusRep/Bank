# БАНКа ЖЕСТЬяная - Улучшенная версия с синхронизацией

## Что добавлено

### 🔥 Синхронизация данных через Firebase

Теперь ваш банк поддерживает **облачную синхронизацию** данных! Это означает:

- ✅ Данные сохраняются в облаке Firebase
- ✅ Синхронизация между устройствами в реальном времени
- ✅ Если вы зайдёте с другого браузера/устройства - все данные будут на месте
- ✅ Работает даже если localStorage очищен

### 📋 Как настроить Firebase

1. **Создайте проект в Firebase Console:**
   - Перейдите на https://console.firebase.google.com/
   - Создайте новый проект
   - Включите Firestore Database (в режиме test для начала)

2. **Получите конфигурацию:**
   - В настройках проекта найдите "Firebase SDK snippet"
   - Скопируйте значения конфигурации

3. **Обновите script.js:**
   ```javascript
   const firebaseConfig = {
     apiKey: "ВАШ_API_KEY",
     authDomain: "ваш-проект.firebaseapp.com",
     projectId: "ваш-проект",
     storageBucket: "ваш-проект.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

4. **Настройте правила безопасности Firestore:**
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if true; // Для тестирования
         // В продакшене: allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

### 🔄 Как работает синхронизация

- **При входе**: Данные загружаются из Firebase (если есть) или из localStorage
- **При каждом изменении**: Данные автоматически отправляются в Firebase
- **Real-time обновления**: Если открыть банк в двух вкладках - изменения видны мгновенно
- **При выходе**: Подписка на обновления отключается

### 💾 Резервное копирование

Если Firebase не настроен (стоит `YOUR_API_KEY`), приложение автоматически работает через localStorage как раньше.

### 🛠️ Технические улучшения

1. **Асинхронная загрузка данных** - быстрый старт приложения
2. **Real-time подписка** - мгновенные обновления между устройствами
3. **Автоматическая синхронизация** - при любом изменении баланса
4. **Очистка ресурсов** - правильное отключение подписок при выходе

## Структура данных в Firebase

```
users (collection)
  └─ {username} (document)
      ├─ name: string
      ├─ username: string
      ├─ accounts: array
      ├─ transactions: array
      ├─ createdAt: timestamp
      └─ lastUpdated: timestamp
```

## Запуск

Просто откройте `index.html` в браузере. Для работы синхронизации нужен интернет и настроенный Firebase.
