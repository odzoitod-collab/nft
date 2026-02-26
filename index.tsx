import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Инициализация Telegram Web App
declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Получаем данные пользователя из Telegram
let telegramUser = null;
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.ready();
  telegramUser = tg.initDataUnsafe?.user;
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App telegramUser={telegramUser} />
  </React.StrictMode>
);