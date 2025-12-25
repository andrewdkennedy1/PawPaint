
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Viewer from './components/Viewer';
import './index.css';

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const isViewerRoute = window.location.pathname.startsWith('/view');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isViewerRoute ? <Viewer /> : <App />}
  </React.StrictMode>
);
