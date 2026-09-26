import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const runtimeId = typeof chrome !== 'undefined' && chrome.runtime?.id ? chrome.runtime.id : 'unknown';
const currentOrigin = window.location.origin;
const popupUrl = typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('popup.html') : `${window.location.origin}/popup.html`;
console.info('[RiseDefend] Popup initialized', { runtimeId, currentOrigin, popupUrl });

window.onerror = function (msg, url, line, col, error) {
  const el = document.getElementById('root');
  if (el) el.innerHTML = `<div style="padding: 20px; color: red;">Error: ${msg}<br/>Line: ${line}<br/>${error?.stack}</div>`;
};

window.addEventListener("unhandledrejection", function (event) {
  const el = document.getElementById('root');
  if (el) el.innerHTML = `<div style="padding: 20px; color: red;">Promise Error: ${event.reason?.message || event.reason}<br/>${event.reason?.stack}</div>`;
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red", backgroundColor: "#fee", height: "100vh" }}>
          <h2>React Crash</h2>
          <pre>{this.state.error?.toString()}</pre>
          <pre style={{ fontSize: "10px", whiteSpace: 'pre-wrap' }}>{this.state.info?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
