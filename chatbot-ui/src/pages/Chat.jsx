import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

function Chat() {
  const [messages, setMessages] = useState([
    { id: 'm-0', role: 'assistant', content: 'Please enter the file.' }
  ])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [partial, setPartial] = useState('')
  const [status, setStatus] = useState('')
  const [csvHeaders, setCsvHeaders] = useState([])
  const [selectedColumnsToDrop, setSelectedColumnsToDrop] = useState([])
  const [showColumnSelector, setShowColumnSelector] = useState(false)
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

  useEffect(() => {
    if (!inputRef.current) return
    const el = inputRef.current
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  function handleFileUpload(event) {
    const file = event.target.files[0]
    if (!file) return

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.split('\n')
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''))
        setCsvHeaders(headers)
        setStatus('file_uploaded')
        setShowColumnSelector(true)
        
        // Add a message showing the headers
        const headerMessage = { 
          id: crypto.randomUUID(), 
          role: 'assistant', 
          content: `File uploaded successfully! Found ${headers.length} columns: ${headers.join(', ')}. Please select which columns you want to drop.` 
        }
        setMessages(prev => [...prev, headerMessage])
      }
    }
    reader.readAsText(file)
  }

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
  function askForFile(){
    const fileRequestMessage = { 
      id: crypto.randomUUID(), 
      role: 'assistant', 
      content: 'Please upload a CSV file first using the file uploader below.' 
    }
    setMessages((prev) => [...prev, fileRequestMessage])
    setStatus('file_uploaded')
    return
  }

  function handleColumnToggle(column) {
    setSelectedColumnsToDrop(prev => {
      if (prev.includes(column)) {
        return prev.filter(col => col !== column)
      } else {
        return [...prev, column]
      }
    })
  }

  function handleDropColumns() {
    if (selectedColumnsToDrop.length === 0) {
      const noSelectionMessage = { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: 'No columns selected to drop. You can now start chatting!' 
      }
      setMessages(prev => [...prev, noSelectionMessage])
    } else {
      const remainingHeaders = csvHeaders.filter(header => !selectedColumnsToDrop.includes(header))
      setCsvHeaders(remainingHeaders)
      
      const dropMessage = { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: `Dropped ${selectedColumnsToDrop.length} columns: ${selectedColumnsToDrop.join(', ')}. Remaining columns: ${remainingHeaders.join(', ')}. You can now start chatting!` 
      }
      setMessages(prev => [...prev, dropMessage])
    }
    
    setShowColumnSelector(false)
    setSelectedColumnsToDrop([])
    setStatus('ready')
  } 

  async function onSend(initialOverride) {
    const content = (initialOverride ?? input).trim()
    if (!content) return
    if (!initialOverride) setInput('')

    const userMessage = { id: crypto.randomUUID(), role: 'user', content }
    setMessages((prev) => [...prev, userMessage])

    // If status is empty or file_uploaded, don't call LLM, just ask for file
    if (status == '')
    {
      askForFile()
      return
    }

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

      {status === '' && (
        <div className="csv-uploader-section">
          <div className="csv-uploader-container">
            <div className="csv-uploader-header">
              <h3>Upload CSV File</h3>
              <p>Please upload a CSV file to get started</p>
            </div>
            <div className="file-input-wrapper">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                id="csv-upload"
                className="file-input"
              />
              <label htmlFor="csv-upload" className="file-input-label">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                Choose CSV File
              </label>
            </div>
          </div>
        </div>
      )}

      {setStatus==='file_uploaded' && (
        <div className="column-selector-section">
          <div className="column-selector-container">
            <div className="column-selector-header">
              <h3>Select Columns to Drop</h3>
              <p>Choose which columns you want to remove from your dataset</p>
            </div>
            <div className="column-checkboxes">
              {csvHeaders.map((column, index) => (
                <label key={index} className="column-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedColumnsToDrop.includes(column)}
                    onChange={() => handleColumnToggle(column)}
                    className="column-checkbox"
                  />
                  <span className="column-name">{column}</span>
                </label>
              ))}
            </div>
            <div className="column-selector-actions">
              <button 
                onClick={handleDropColumns}
                className="drop-columns-button"
              >
                Drop Selected Columns ({selectedColumnsToDrop.length})
              </button>
            </div>
          </div>
        </div>
      )}

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
