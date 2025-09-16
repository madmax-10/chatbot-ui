import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import ColumnSelector from './ColumnSelector'
import OptionsSelector from './OptionsSelector'
import DropColumnSelector from './DropColumnSelector'

// Move regex patterns outside component to avoid recreation - updated to handle multi-word features, "to" connector, maximize/minimize, and natural language expressions
const CONSTRAINT_PATTERN = /(?:(?<feature>[a-zA-Z_][a-zA-Z0-9_\s]*?)\s*(?:is)?\s*(?:between\s+(?<min1>\d+\.?\d*)\s+(?:and|to)\s+(?<max1>\d+\.?\d*)|(?:less than or equal to|less than|max of|under|<=)\s+(?<max2>\d+\.?\d*)|(?:greater than or equal to|greater than|min of|at least|>=)\s+(?<min2>\d+\.?\d*)|(?:maximize|minimize))|(?:(?:maximize|minimize)\s+(?<feature2>.+?)(?=\s*$)))/gi

// Additional pattern for natural language expressions like "I want to set X to Y"
const NATURAL_LANGUAGE_PATTERN = /(?:i want to set|i want to change|i want|set|change)\s+(?<feature>[a-zA-Z_][a-zA-Z0-9_\s]*?)\s*(?:to|to be)\s*(?:between\s+(?<min>\d+\.?\d*)\s+(?:and|to)\s+(?<max>\d+\.?\d*)|(?:less than or equal to|less than|max of|under|<=)\s+(?<maxOnly>\d+\.?\d*)|(?:greater than or equal to|greater than|min of|at least|>=)\s+(?<minOnly>\d+\.?\d*)|(?:maximize|minimize)|(?<singleValue>\d+\.?\d*))/gi
// Move levenshteinDistance outside component to avoid recreation
const levenshteinDistance = (s1, s2) => {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// Move parseTextAndMatchFeatures outside component to avoid recreation
const parseTextAndMatchFeatures = (text, yourFeatureList) => {
  if (!text || typeof text !== 'string') {
    console.log("No text")
    return { target: {} };
  }

  // Check if yourFeatureList is valid
  if (!yourFeatureList || !Array.isArray(yourFeatureList) || yourFeatureList.length === 0) {
    console.log("No valid feature list provided")
    return { target: {} };
  }

  const constraints = {};
  let processedText = text.toLowerCase();
  
  // Process both patterns
  const processMatch = (match, groups, patternType) => {
    const rawFeature = (groups.feature || groups.feature2 || '').trim();
    
    console.log("Regex match:", match, "Raw feature:", rawFeature, "Groups:", groups, "Pattern:", patternType);
    console.log("Full text being processed:", processedText);

    // Clean preambles/stopwords and trailing generic terms from the captured feature phrase
    let cleanedFeature = rawFeature.toLowerCase().replace(/\s+/g, ' ').trim();
    const STOPWORD_PREFIXES = [
      'i want',
      'i want to change',
      'i would like',
      'i wish',
      'please',
      'kindly',
      'set',
      'change',
      'make',
      'recommend on',
      'recommend',
      'the',
      'a',
      'an',
      'my'
    ];
    for (const prefix of STOPWORD_PREFIXES) {
      if (cleanedFeature.startsWith(prefix + ' ')) {
        cleanedFeature = cleanedFeature.slice(prefix.length).trim();
        break;
      }
    }
    // Remove trailing generic nouns like "column", "field", or "value"
    cleanedFeature = cleanedFeature.replace(/\b(column|field|value)s?\s*$/i, '').trim();

    // --- BEST MATCH LOGIC ---
    let bestMatch = null;
    let minDistance = Infinity;

    // Normalize the raw feature by removing spaces and converting to lowercase
    const normalizedRawFeature = cleanedFeature.replace(/\s+/g, '');

    for (const canonicalFeature of yourFeatureList) {
      // Try multiple normalization strategies for better matching
      const strategies = [
        // Strategy 1: Remove underscores and spaces
        canonicalFeature.toLowerCase().replace(/[_]/g, ''),
        // Strategy 2: Replace underscores with spaces, then remove spaces
        canonicalFeature.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ''),
        // Strategy 3: Keep underscores but remove spaces
        canonicalFeature.toLowerCase().replace(/\s+/g, ''),
        // Strategy 4: Original with underscores as spaces
        canonicalFeature.toLowerCase().replace(/_/g, ' ')
      ];

      for (const normalizedCanonical of strategies) {
        const distance = levenshteinDistance(normalizedRawFeature, normalizedCanonical);
        console.log("Comparing", normalizedRawFeature, normalizedCanonical, "distance:", distance);

        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = canonicalFeature;
        }
      }
    }
    
    // Set a threshold: if the best match is still too different, ignore it.
    // Use a more flexible threshold for multi-word features
    if (bestMatch && bestMatch.length > 0) {
      // For multi-word features, use a more lenient threshold
      const featureLength = Math.max(normalizedRawFeature.length, bestMatch.length);
      const threshold = Math.max(2, Math.floor(featureLength * 0.4)); // More lenient: 40% instead of 60%
      
      console.log("Threshold check:", minDistance, "<=?", threshold, "for", rawFeature, "->", bestMatch);
      if (minDistance <= threshold) {
        const key = bestMatch;
        if (!constraints[key]) {
          constraints[key] = { min: null, max: null };
        }
        
        // Check if this is a maximize/minimize operation
        const isMaximize = match.toLowerCase().includes('maximize');
        const isMinimize = match.toLowerCase().includes('minimize');
        
        if (isMaximize || isMinimize) {
          // For maximize/minimize, set both min and max to 0 as default
          constraints[key].min = 0;
          constraints[key].max = 0;
        } else {
          // Handle different pattern types
          if (patternType === 'natural') {
            // For natural language pattern
            const min = groups.min || groups.minOnly;
            const max = groups.max || groups.maxOnly;
            const value = groups.singleValue;
            
            if (value) {
              // For single value expressions, set both min and max to the same value
              constraints[key].min = parseFloat(value);
              constraints[key].max = parseFloat(value);
            } else {
              if (min) constraints[key].min = parseFloat(min);
              if (max) constraints[key].max = parseFloat(max);
            }
          } else {
            // For original pattern
            const min = groups.min1 || groups.min2;
            const max = groups.max1 || groups.max2;
            if (min) constraints[key].min = parseFloat(min);
            if (max) constraints[key].max = parseFloat(max);
          }
        }
      }
    }
  };

  // Process original constraint pattern
  processedText.replace(CONSTRAINT_PATTERN, (match, ...args) => {
    const groups = args[args.length - 1];
    processMatch(match, groups, 'original');
  });

  // Process natural language pattern
  processedText.replace(NATURAL_LANGUAGE_PATTERN, (match, ...args) => {
    const groups = args[args.length - 1];
    processMatch(match, groups, 'natural');
  });

  // Post-Processing: Apply defaults
  for (const key in constraints) {
    if (constraints[key].max !== null && constraints[key].min === null) {
      constraints[key].min = 1;
    }
    // Set default values to 0 for any features without specific constraints
    if (constraints[key].min === null && constraints[key].max === null) {
      constraints[key].min = 0;
      constraints[key].max = 0;
    }
  }

  console.log("Constraints", constraints)

  return constraints

}

function getInitialMessage(selectedOption) {
  switch (selectedOption) {
    case 'recommend':
      return 'I\'m ready to provide recommendations based on your data. Please upload a CSV file to get started.'
    case 'modify':
      return 'I\'m here to help you modify your data parameters and constraints. Please upload a CSV file to begin.'
    case 'whatif':
      return 'I\'m ready to explore "what if" scenarios with your data. Please upload a CSV file to start analyzing different possibilities.'
    default:
      return 'Please upload a CSV file to get started.'
  }
}

function ChatBox({csvHeaders, status, setStatus, setCsvHeaders}) {

  const [selectedOption, setSelectedOption] = useState(null)
  const [messages, setMessages] = useState([
    { id: 'm-0', role: 'assistant', content: getInitialMessage(null) }
  ])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [partial, setPartial] = useState('')
  const [selectedColumnsToDrop, setSelectedColumnsToDrop] = useState([])
  const [userConstraints, setUserConstraints] = useState({})
  const [target, setTarget] = useState({})
  const [showDropColumnSelector, setShowDropColumnSelector] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, partial])

  useEffect(() => {
    // Update the initial message when selectedOption changes
    if (selectedOption) {
      setMessages([{ id: 'm-0', role: 'assistant', content: getInitialMessage(selectedOption) }])
    }
  }, [selectedOption])

  const canSend = useMemo(() => input.trim().length > 0 && !isGenerating, [input, isGenerating])

  // Memoize quick option handlers based on status
  const handleQuickOption1 = useCallback(() => {
    if (status === '3') {
      const lastTwoHeaders = csvHeaders.slice(-2)
      setInput(`Maximize ${lastTwoHeaders[0]}`)
    } else if (status === '4') {
      const thirdFourthHeaders = csvHeaders.slice(2, 4)
      setInput(`Recommend ${thirdFourthHeaders[0]} between (    ) to (    )`)
    } else {
      setInput("Can you help me analyze this data?")
    }
  }, [status, csvHeaders])

  const handleQuickOption2 = useCallback(() => {
    if (status === '3') {
      const lastTwoHeaders = csvHeaders.slice(-2)
      setInput(`Minimize ${lastTwoHeaders[1]}`)
    } else if (status === '4') {
      const thirdFourthHeaders = csvHeaders.slice(2, 4)
      setInput(`Recommend on ${thirdFourthHeaders[1]} between (    ) to (    )`)
    } else {
      setInput("What insights can you provide?")
    }
  }, [status, csvHeaders])

  const handleQuickOption3 = useCallback(() => {
    if (status === '3') {
      const lastTwoHeaders = csvHeaders.slice(-2)
      setInput(`Maximize ${lastTwoHeaders[1]}`)
    } else if (status === '4') {
      const thirdFourthHeaders = csvHeaders.slice(2, 4)
      setInput(`Recommend on ${thirdFourthHeaders[0]} between (    ) to (     and ${thirdFourthHeaders[1]} between (    ) to (    ) )`)
    } else {
      setInput("Can you suggest improvements?")
    }
  }, [status, csvHeaders])

  // Memoize option selector handler
  const handleOptionSelected = useCallback((optionId) => {
    setSelectedOption(optionId)
    setStatus('2') // Change status to show chat interface
  }, [setStatus])

  // Memoize computed values
  const userConstraintsCount = useMemo(() => Object.keys(userConstraints).length, [userConstraints])
  const targetCount = useMemo(() => Object.keys(target).length, [target])
  const selectedColumnsCount = useMemo(() => selectedColumnsToDrop.length, [selectedColumnsToDrop])

  // Define analyzePrompt before onSend to avoid circular dependency
  const analyzePrompt = useCallback((prompt) => {
     const result = parseTextAndMatchFeatures(prompt, csvHeaders)

     if (status === '3') setTarget(result)
     else if (status === '4') setUserConstraints(result)
    //  console.log("Result", result)
     
     if (Object.keys(result).length === 0) {
       if (status === '3') setStatus('show_user_constraints')
       else if (status === '4') setStatus('show_target_variables')
       return `I couldn't find any specific constraints in your message. Could you please specify which columns you'd like to set constraints for? For example: '${csvHeaders[0]} between 10 and 100' or '${csvHeaders[1]} greater than 18`
     }
     
     let response = "I found the following constraints in your message:\n\n"
     for (const [column, constraint] of Object.entries(result)) {
       response += `• ${column}: `
       if (constraint.min === 0 && constraint.max === 0) {
         // Check if this was a maximize or minimize operation
         const isMaximize = prompt.toLowerCase().includes('maximize');
         const isMinimize = prompt.toLowerCase().includes('minimize');
         if (isMaximize) {
           response += `maximize (set to 0 for processing)\n`
         } else if (isMinimize) {
           response += `minimize (set to 0 for processing)\n`
         } else {
           response += `no specific constraints (set to 0)\n`
         }
       } else if (constraint.min !== null && constraint.max !== null) {
         if (constraint.min === constraint.max) {
           response += `set to ${constraint.min}\n`
         } else {
           response += `between ${constraint.min} and ${constraint.max}\n`
         }
       } else if (constraint.min !== null) {
         response += `greater than or equal to ${constraint.min}\n`
       } else if (constraint.max !== null) {
         response += `less than or equal to ${constraint.max}\n`
       }
     }

     response += "\nPlease say done if you are done setting what you are trying to achieve."
      

      // response += "\nWould you like me to apply these constraints to your data analysis?"
      
      return response
   }, [csvHeaders, setStatus])

  // Define streamText before onSend to avoid circular dependency
  const streamText = useCallback(async (text, onChunk, chunkMs = 15) => {
    const tokens = text.split(/(\s+)/)
    for (const token of tokens) {
      await new Promise((r) => setTimeout(r, chunkMs))
      onChunk(token)
    }
  }, [])

  // Define onSend before handleKeyDown to avoid circular dependency
  const onSend = useCallback(async (initialOverride) => {
    const content = (initialOverride ?? input).trim()
    if (!content) return
    if (!initialOverride) setInput('')

    const userMessage = { id: crypto.randomUUID(), role: 'user', content }
    setMessages((prev) => [...prev, userMessage])
    if (content.includes("done")) {
      if (status !== '') {
        setStatus((parseInt(status) + 1).toString())
      }
      return
    }
    setIsGenerating(true)
    setPartial('')

    const full = analyzePrompt(content)

    // const full = await callLLM(content)
    try {
      await streamText(full, (chunk) => setPartial((p) => p + chunk))
      const assistantMessage = { id: crypto.randomUUID(), role: 'assistant', content: full }
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setPartial('')
      setIsGenerating(false)
    }
  }, [input, analyzePrompt, streamText])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      if (canSend) onSend()
    }
  }, [canSend, onSend])

  const getUserConstraints = useCallback(() => {
    const headerMessage = { 
      id: crypto.randomUUID(), 
      role: 'assistant', 
      content: `Is there any particular feature you want me to recommend? If you have multiple of them, you can separate them using commas. Please add constraints if you have any. `
    }
    setMessages(prev => [...prev, headerMessage])
  }, [])

  const handleAddConstraint = useCallback((newConstraint, column, min, max) => {
    setUserConstraints(prev => ({
      ...prev,
      ...newConstraint
    }))

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
  }, [])

  const handleFinishConstraints = useCallback(() => {
    const finishMessage = { 
      id: crypto.randomUUID(), 
      role: 'assistant', 
      content: `Great! You've set ${userConstraintsCount} constraints.` 
    }
    setMessages(prev => [...prev, finishMessage])
    setStatus('5')
  }, [userConstraintsCount, setStatus])

  const getTarget = useCallback(() => {
    const headerMessage = { 
      id: crypto.randomUUID(), 
      role: 'assistant', 
      content: `What performance outcome are you trying to achieve?` 
    }
    setMessages(prev => [...prev, headerMessage])
  }, [])

  const handleSetTarget = useCallback((newTarget, column, min, max) => {
    setTarget(prev => ({
      ...prev,
      ...newTarget
    }))

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
  }, [])

  const handleFinishTargets = useCallback(() => {
    const finishMessage = { 
      id: crypto.randomUUID(), 
      role: 'assistant', 
      content: `Perfect! You've set ${targetCount} target variables.` 
    }
    setMessages(prev => [...prev, finishMessage])
    setStatus('4')
  }, [targetCount, setStatus])

  useEffect(() => {
    if (!inputRef.current) return
    const el = inputRef.current
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  useEffect(() => {
    if (status === '') {
      return
    }
  }, [status])

  useEffect(() => {
    if (status === '3') {
      getTarget()
    }
  }, [status, getTarget])

  useEffect(() => {
    if (status === '4') {
      getUserConstraints()
    }
  }, [status, getUserConstraints])

  const callLLM = useCallback(async (userText) => {
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
      const text = userText.trim().toLowerCase()
      if (text.includes('hello') || text.includes('hi')) {
        return 'Hello! I\'m having trouble connecting to my AI service, but I can still help with basic questions.'
      }
      return 'I\'m sorry, I\'m having trouble connecting to my AI service right now. Please try again later.'
    }
  }, [])


  const handleColumnToggle = useCallback((column) => {
    setSelectedColumnsToDrop(prev => {
      if (prev.includes(column)) {
        return prev.filter(col => col !== column)
      } else {
        return [...prev, column]
      }
    })
  }, [])

  const handleDropColumns = useCallback(() => {
    if (selectedColumnsCount === 0) {
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
        content: `Dropped ${selectedColumnsCount} columns: ${selectedColumnsToDrop.join(', ')}. Remaining columns: ${remainingHeaders.join(', ')}.` 
      }
      setMessages(prev => [...prev, dropMessage])
    }
    
    setSelectedColumnsToDrop([])
    setShowDropColumnSelector(false)
    // setStatus('columns_dropped')
  }, [selectedColumnsCount, selectedColumnsToDrop, csvHeaders, setCsvHeaders, setStatus])

  const handleCancelDropColumns = useCallback(() => {
    setSelectedColumnsToDrop([])
    setShowDropColumnSelector(false)
  }, [])

  const handleShowDropColumnSelector = useCallback(() => {
    setShowDropColumnSelector(true)
  }, [])
  


  

  if (status === '1') {
    return <OptionsSelector onOptionSelected={handleOptionSelected} />
  }

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {isGenerating && partial && (
          <MessageBubble role="assistant" content={partial} isStreaming />
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-controls">
        {status === '5' && (
          <DropColumnSelector
            title="Drop Columns"
            description="Select columns to remove from your dataset"
            columns={csvHeaders}
            onDrop={handleDropColumns}
            onCancel={handleCancelDropColumns}
            selectedColumnsToDrop={selectedColumnsToDrop}
            onColumnToggle={handleColumnToggle}
          />
        )}

        {status === 'show_user_constraints' && (
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

        {status === 'show_target_variables' && (
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

        <div className="chat-input-bar">
          {/* Quick options above the textbox */}
          <div className="quick-options">
            <button 
              className="quick-option-btn"
              onClick={handleQuickOption1}
            >
              {status === '3' && csvHeaders.length >= 2 ? `Maximize ${csvHeaders.slice(-2)[0]}` :
               status === '4' && csvHeaders.length >= 4 ? `Recommend ${csvHeaders.slice(2, 4)[0]}` :
               'Analyze Data'}
            </button>
            <button 
              className="quick-option-btn"
              onClick={handleQuickOption2}
            >
              {status === '3' && csvHeaders.length >= 2 ? `Minimize ${csvHeaders.slice(-2)[1]}` :
               status === '4' && csvHeaders.length >= 4 ? `Recommend ${csvHeaders.slice(2, 4)[1]}` :
               'Get Insights'}
            </button>
            <button 
              className="quick-option-btn"
              onClick={handleQuickOption3}
            >
              {status === '3' && csvHeaders.length >= 2 ? `Maximize ${csvHeaders.slice(-2)[1]}` :
               status === '4' && csvHeaders.length >= 4 ? `Recommend Both` :
               'Suggest Improvements'}
            </button>
            {/* <button 
              className="quick-option-btn drop-columns-btn"
              onClick={handleShowDropColumnSelector}
              disabled={showDropColumnSelector}
            >
              Drop Columns
            </button> */}
          </div>
          
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
        </div>
      </div>
    </div>
  )
}

const MessageBubble = memo(({ role, content, isStreaming }) => {
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
})

const SendIcon = memo(({ disabled }) => {
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
})

export default ChatBox
