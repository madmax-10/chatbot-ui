import { useState, useEffect } from 'react'
import './App.css'
import ChatBox from './components/ChatBox'
import WorkflowSteps from './components/WorkflowSteps'

function App() {
  const [csvHeaders, setCsvHeaders] = useState([])
  const [completedRequirements, setCompletedRequirements] = useState([])
  const [status, setStatus] = useState('1')
  const [localPath, setLocalPath] = useState('')

  // Automatically update completed requirements based on app state
  useEffect(() => {
    // console.log('csvHeaders updated:', csvHeaders)
    const completed = []
    
    // Mark datafile as completed if CSV headers are loaded
    if (csvHeaders.length > 0) {
      completed.push('datafile')
    }
    
    // You can add more logic here to mark other requirements as completed
    // based on user actions in the chat or other components
    
    setCompletedRequirements(completed)
  }, [csvHeaders])

  


  return (
    <div className="chat-root">
      <header className="chat-header">
        <div className="chat-header-title">Data Analysis Assistant</div>
        <div className="chat-header-sub">Upload your data and start analyzing</div>
      </header>
      <div className="main-layout">
        <div className="left-panel">
          <WorkflowSteps
            localPath={localPath}
            setLocalPath={setLocalPath}
            setCsvHeaders={setCsvHeaders} 
            status={status}
            completedRequirements={completedRequirements}
            setStatus={setStatus}
          />
        </div>
        <div className="right-panel">
          <ChatBox localPath={localPath} csvHeaders={csvHeaders} status={status} setStatus={setStatus} setCsvHeaders={setCsvHeaders}/>
        </div>
      </div>
    </div>
  )
}

export default App
