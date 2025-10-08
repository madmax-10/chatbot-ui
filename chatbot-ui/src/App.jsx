import { useState, useEffect } from 'react'
import './App.css'
import ChatBox from './components/ChatBox'
import DatasetPreview from './components/DatasetPreview'
import DataFileInput from './components/DataFileInput'

function App() {
  const [csvHeaders, setCsvHeaders] = useState([])
  const [status, setStatus] = useState('1')
  const [localPath, setLocalPath] = useState('')
  const [datasetData, setDatasetData] = useState(null)
  const [isSubsetSamplingEnabled, setIsSubsetSamplingEnabled] = useState(false)
  const [queryType, setQueryType] = useState('recommend')

  // Calculate progress based on status (1-9, where 9 = 100%)
  const progressPercentage = Math.min((parseInt(status) / 9) * 100, 100)
  const progressText = `${Math.round(progressPercentage)}%`
  
  // Dynamic status text based on progress
  const getStatusText = (status) => {
    const statusMap = {
      '1': 'Getting Started',
      '2': 'Uploading Data',
      '3': 'Getting Samples',
      '4': 'Dropping Columns',
      '5': 'Selecting Target',
      '6': 'Choosing Features',
      '7': 'Setting Constraints',
      '8': 'Set Task Type',
      '9': ' Setting Final Json',
      '10': 'Complete'
    }
    return statusMap[status] || 'Ready'
  }
  
  const statusText = getStatusText(status)

  return (
    <div className="chat-root">
      <header className="chat-header">
        <div className="chat-header-content">
          <div className="chat-header-title">Data Analysis Assistant</div>
          <div className="chat-header-sub">Upload your data and start analyzing</div>
        </div>
        <div className="chat-header-actions">
          <div className="chat-header-status">
            <div className="status-dot"></div>
            <span className="status-text">{statusText}</span>
          </div>
          <div className="chat-header-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{width: `${progressPercentage}%`}}></div>
            </div>
            <span style={{fontSize: '11px', color: '#9ca3af'}}>{progressText}</span>
          </div>
          <button className="header-action-btn">⚙️</button>
          <button className="header-action-btn">Help</button>
        </div>
      </header>
      <div className="main-layout">
        {/* DataFileInput only appears when status == 2 */}
        {status === '2' && (
          <div className="left-panel">
            <DataFileInput
              queryType={queryType}
              localPath={localPath}
              setLocalPath={setLocalPath}
              setStatus={setStatus}
              setCsvHeaders={setCsvHeaders}
              setDatasetData={setDatasetData}
              isSubsetSamplingEnabled={isSubsetSamplingEnabled}
              setIsSubsetSamplingEnabled={setIsSubsetSamplingEnabled}
            />
          </div>
        )}
        <div className="right-panel">
          {csvHeaders.length > 0 ? (
            <div className="right-panel-split">
              <div className="right-panel-top">
                <DatasetPreview datasetData={datasetData} />
              </div>
              <div className="right-panel-bottom">
                <ChatBox queryType={queryType} setQueryType={setQueryType} localPath={localPath} csvHeaders={csvHeaders} status={status} setStatus={setStatus} setCsvHeaders={setCsvHeaders} datasetData={datasetData} setDatasetData={setDatasetData} isSubsetSamplingEnabled={isSubsetSamplingEnabled} />
              </div>
            </div>
          ) : (
            <ChatBox queryType={queryType} setQueryType={setQueryType} localPath={localPath} csvHeaders={csvHeaders} status={status} setStatus={setStatus} setCsvHeaders={setCsvHeaders} datasetData={datasetData} setDatasetData={setDatasetData} isSubsetSamplingEnabled={isSubsetSamplingEnabled} />
          )}
        </div>
      </div>
    </div>
  )
}

export default App