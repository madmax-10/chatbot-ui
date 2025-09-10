import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ColumnSelector from '../components/ColumnSelector'

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
  const [userConstraints, setUserConstraints] = useState({})
  const [target, setTarget] = useState({})
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

  function getUserConstraints() {
    const headerMessage = { 
      id: crypto.randomUUID(), 
      role: 'assistant', 
      content: `Now let's set constraints for your data. Select a column and specify minimum and maximum values.`
    }
    setMessages(prev => [...prev, headerMessage])
  }

  function handleAddConstraint(newConstraint, column, min, max) {
    setUserConstraints(prev => ({
      ...prev,
      ...newConstraint
    }))

    // Show confirmation
    const confirmMessage1 = { 
      id: crypto.randomUUID(), 
      role: 'user', 
      content: `Added constraint for ${column}: min=${min}, max=${max}.`
     } 
    const confirmMessage2 = { 
        id: crypto.randomUUID(), 
        role: 'user', 
        content: `You can add more constraints or click "Finish" to proceed.` 
      }
    setMessages(prev => [...prev, confirmMessage1, confirmMessage2])
  }

  function handleFinishConstraints() {
    const finishMessage = { 
      id: crypto.randomUUID(), 
      role: 'assistant', 
      content: `Great! You've set ${Object.keys(userConstraints).length} constraints.` 
    }
    setMessages(prev => [...prev, finishMessage])
    setStatus('constraints_added')
  }

  function getTarget() {
    const headerMessage = { 
      id: crypto.randomUUID(), 
      role: 'assistant', 
      content: `Now select the target variable and specify its minimum and maximum values.` 
    }
    setMessages(prev => [...prev, headerMessage])
  }

  function handleSetTarget(newTarget, column, min, max) {
    setTarget(prev => ({
      ...prev,
      ...newTarget
    }))

    // Show confirmation
    const confirmMessage1 = { 
      id: crypto.randomUUID(), 
      role: 'user', 
      content: `Added target variable: ${column} with min=${min}, max=${max}.`
    }
      const confirmMessage2 = { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: `You can add more targets or click "Finish" to proceed.`
      }
     
    setMessages(prev => [...prev, confirmMessage1, confirmMessage2])
  }

  function handleFinishTargets() {
    const finishMessage = { 
      id: crypto.randomUUID(), 
      role: 'assistant', 
      content: `Perfect! You've set ${Object.keys(target).length} target variables.` 
    }
    setMessages(prev => [...prev, finishMessage])
    setStatus('target_added')
  }

  useEffect(() => {
    if (!inputRef.current) return
    const el = inputRef.current
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  useEffect(() => {
    if (status === '') {
      askForFile()
      return
    }
  }, [status])

  useEffect(() => {
    if (status === 'columns_dropped') {
      getTarget()
    }
  }, [status])

  useEffect(() => {
    if (status === 'target_added') {
      getUserConstraints()
    }
  }, [status])

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
        
        // Add a message showing the headers
        const headerMessage1 = { 
          id: crypto.randomUUID(), 
          role: 'user', 
          content: `File uploaded successfully! Found ${headers.length} columns: ${headers.join(', ')}.` 
        }
        const headerMessage2 = { 
            id: crypto.randomUUID(), 
            role: 'assistant', 
            content: `Please select which columns you want to drop.` 
          }
        setMessages(prev => [...prev, headerMessage1,headerMessage2])
      }
    }
    reader.readAsText(file)
    setStatus('file_uploaded')
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
        role: 'user', 
        content: 'No columns selected to drop.' 
      }
      setMessages(prev => [...prev, noSelectionMessage])
    } else {
      const remainingHeaders = csvHeaders.filter(header => !selectedColumnsToDrop.includes(header))
      setCsvHeaders(remainingHeaders)
      
      const dropMessage = { 
        id: crypto.randomUUID(), 
        role: 'user', 
        content: `Dropped ${selectedColumnsToDrop.length} columns: ${selectedColumnsToDrop.join(', ')}. Remaining columns: ${remainingHeaders.join(', ')}.` 
      }
      setMessages(prev => [...prev, dropMessage])
    }
    
    setSelectedColumnsToDrop([])
    setStatus('columns_dropped')
    // After dropping columns, ask for constraints
  } 

  async function onSend(initialOverride) {
    const content = (initialOverride ?? input).trim()
    if (!content) return
    if (!initialOverride) setInput('')

    const userMessage = { id: crypto.randomUUID(), role: 'user', content }
    setMessages((prev) => [...prev, userMessage])

    // If status is empty, don't call LLM, just ask for file
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

      {status==='file_uploaded' && (
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

      {status === 'target_added' && (
        <ColumnSelector
          title="Set Constraints"
          description="Select columns and specify minimum and maximum values"
          columns={csvHeaders}
          onAdd={handleAddConstraint}
          onFinish={handleFinishConstraints}
          existingItems={userConstraints}
          buttonText="Add Constraint"
          finishButtonText="Finish"
          showFinishButton={true}
          allowMultiple={true}
        />
      )}

      {status === 'columns_dropped' && (
        <ColumnSelector
          title="Set Target Variables"
          description="Select target columns and specify their minimum and maximum values"
          columns={csvHeaders}
          onAdd={handleSetTarget}
          onFinish={handleFinishTargets}
          existingItems={target}
          buttonText="Add Target Variable"
          finishButtonText="Finish"
          showFinishButton={true}
          allowMultiple={true}
        />
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
