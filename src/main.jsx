import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// THIS IS WHERE YOU PASTE YOUR FIREBASE CONFIG
// REPLACE THE ENTIRE object below with the one you saved in your notebook!
window.__firebase_config = JSON.stringify({
  apiKey: "AIzaSyAqcSneqSSD0Dy6KTDYDIwvgV4nX_rCdNA",
  authDomain: "blister-sisters.firebaseapp.com",
  projectId: "blister-sisters",
  storageBucket: "blister-sisters.firebasestorage.app",
  messagingSenderId: "823849072123",
  appId: "1:823849072123:web:04023c282e38cb5e4cc75e"
});

window.__app_id = "blister-sisters-prod";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
