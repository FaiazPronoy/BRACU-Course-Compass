/*! BRACU Course Compass. Copyright 2026 Faiaz Abrar Zaman Pronoy and Sinthia Khandoker. All rights reserved. See LICENSE. */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';
import { Toaster } from 'sonner';
import { LangProvider } from './i18n/LangContext';
import './index.css';
import { persistor, store } from './redux/store';
import router from './routes';
import { ThemeProvider, useTheme } from './theme/ThemeContext';

function Toasts() {
  const { dark } = useTheme();
  return <Toaster richColors closeButton position="top-center" theme={dark ? 'dark' : 'light'} toastOptions={{ style: { fontFamily: 'var(--font)' } }} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <LangProvider>
          <ThemeProvider>
            <RouterProvider router={router} />
            <Toasts />
          </ThemeProvider>
        </LangProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
