import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Landing() {
  const [prompt, setPrompt] = useState('')
  const navigate = useNavigate()

  const canStart = useMemo(() => prompt.trim().length > 0, [prompt])

  function startChat(text) {
    const initial = (text ?? prompt).trim()
    if (!initial) return
    navigate('/chat', { state: { initialPrompt: initial } })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      if (canStart) startChat()
    }
  }

  return (
    <main className="chat-main">
      <div className="chat-container" style={{ padding: '24px 16px 40px 16px' }}>
        <section style={{ textAlign: 'center', margin: '40px 0 24px 0' }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Welcome</h1>
          <p style={{ color: '#9ca3af', marginTop: 8 }}>Start with a prompt or pick a suggestion</p>
        </section>

        <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 12 }}>
          <textarea
            className="chat-input"
            style={{ minHeight: 100, padding: '14px 14px', fontSize: 16 }}
            placeholder="Ask anything..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="send-button"
              onClick={() => startChat()}
              disabled={!canStart}
              aria-label="Start Chat"
            >Start</button>
          </div>
        </div>

        {/* <section style={{ maxWidth: 900, margin: '28px auto 0 auto' }}>
          <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 8 }}>Try one of these:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="suggestion-card"
                onClick={() => startChat(s)}
              >{s}</button>
            ))}
          </div>
        </section> */}
      </div>
    </main>
  )
}

// const SUGGESTIONS = [
//   'Explain recursion in simple terms',
//   'Summarize the benefits of React hooks',
//   'Write a haiku about the ocean',
//   'Add 12, 45, and 7',
// ]

export default Landing
