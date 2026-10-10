import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const savedTheme = localStorage.getItem('gc_theme');
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
// Global error handlers to capture runtime exceptions with more detail
window.addEventListener('error', (event) => {
  // eslint-disable-next-line no-console
  console.error('Global error captured:', event.message, event.error || event.filename || event);
});
window.addEventListener('unhandledrejection', (event) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled promise rejection:', event.reason);
});

root.render(<React.StrictMode><App /></React.StrictMode>);
