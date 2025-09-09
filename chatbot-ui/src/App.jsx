import { Outlet } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <div className="chat-root">
      <header className="chat-header">
        <div className="chat-header-title">Assistant</div>
        <div className="chat-header-sub">ChatGPT-like demo (no history)</div>
      </header>
      <Outlet />
    </div>
  )
}

export default App
