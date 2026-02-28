import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Preloader from './components/Preloader';

// Инициализация Telegram Web App
declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

function Root() {
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    const hidePreloader = () => {
      setTimeout(() => setShowPreloader(false), 1200);
    };
    if (document.readyState === 'complete') {
      hidePreloader();
    } else {
      window.addEventListener('load', hidePreloader);
      return () => window.removeEventListener('load', hidePreloader);
    }
  }, []);

  return (
    <>
      <Preloader visible={showPreloader} />
      <App telegramUser={telegramUser} />
    </>
  );
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
    <Root />
  </React.StrictMode>
);