import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

function Chat() {
  const [messages, setMessages] = useState([
    { id: 'm-0', role: 'assistant', content: 'Hi! I\'m your assistant. Ask me anything.' }
  ])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [partial, setPartial] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, partial])

  const canSend = useMemo(() => input.trim().length > 0 && !isGenerating, [input, isGenerating])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      if (canSend) onSend()
    }
  }
  async function a(){
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer ",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "deepseek/deepseek-chat-v3.1:free",
        "messages": [
          {
            "role": "user",
            "content": "What is the meaning of life?"
          }
        ]
      })
    });
    const data = await response.json();
  }

  useEffect(() => {
    if (!inputRef.current) return
    const el = inputRef.current
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  async function callLLM(userText) {
    try {
      const response = await fetch('/api/a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userText }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return data.message || 'Sorry, I could not generate a response.'
    } catch (error) {
      console.error('LLM API Error:', error)
      // Fallback to simple responses if API fails
      const text = userText.trim().toLowerCase()
      if (text.includes('hello') || text.includes('hi')) {
        return 'Hello! I\'m having trouble connecting to my AI service, but I can still help with basic questions.'
      }
      return 'I\'m sorry, I\'m having trouble connecting to my AI service right now. Please try again later.'
    }
  }

  async function streamText(text, onChunk, chunkMs = 15) {
    const tokens = text.split(/(\s+)/)
    for (const token of tokens) {
      await new Promise((r) => setTimeout(r, chunkMs))
      onChunk(token)
    }
  }

  async function onSend(initialOverride) {
    const content = (initialOverride ?? input).trim()
    if (!content) return
    if (!initialOverride) setInput('')

    const userMessage = { id: crypto.randomUUID(), role: 'user', content }
    setMessages((prev) => [...prev, userMessage])

    setIsGenerating(true)
    setPartial('')

    const full = await callLLM(content)
    try {
      await streamText(full, (chunk) => setPartial((p) => p + chunk))
      const assistantMessage = { id: crypto.randomUUID(), role: 'assistant', content: full }
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setPartial('')
      setIsGenerating(false)
    }
  }

  const initialHandledRef = useRef(false)
  useEffect(() => {
    const initialPrompt = location.state && location.state.initialPrompt
    if (initialPrompt && !initialHandledRef.current) {
      initialHandledRef.current = true
      onSend(initialPrompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <main className="chat-main">
        <div className="chat-container">
          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}
          {isGenerating && partial && (
            <MessageBubble role="assistant" content={partial} isStreaming />
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="chat-input-bar">
        <div className="chat-input-container">
          <textarea
            className="chat-input"
            placeholder="Message Assistant"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            rows={1}
          />
          <button
            className="send-button"
            onClick={() => onSend()}
            disabled={!canSend}
            aria-label="Send"
          >
            <SendIcon disabled={!canSend} />
          </button>
        </div>
        <div className="chat-disclaimer">This is a local demo. No messages are stored.</div>
      </footer>
    </>
  )
}

function MessageBubble({ role, content, isStreaming }) {
  const isUser = role === 'user'
  return (
    <div className={isUser ? 'msg-row user' : 'msg-row assistant'}>
      <div className={isUser ? 'avatar user' : 'avatar assistant'}>
        {isUser ? '🙂' : '🤖'}
      </div>
      <div className={isUser ? 'bubble user' : 'bubble assistant'}>
        <span>{content}</span>
        {isStreaming ? <span className="cursor">▍</span> : null}
      </div>
    </div>
  )
}

function SendIcon({ disabled }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={disabled ? '#6b7280' : '#e5e7eb'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  )
}

export default Chat
