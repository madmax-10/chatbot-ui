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



  


  return (
    <div className="chat-root">
      <header className="chat-header">
        <div className="chat-header-title">Data Analysis Assistant</div>
        <div className="chat-header-sub">Upload your data and start analyzing</div>
      </header>
      <div className="main-layout">
        <div className="left-panel">
          <DataFileInput
            localPath={localPath}
            setLocalPath={setLocalPath}
            setStatus={setStatus}
            setCsvHeaders={setCsvHeaders}
            setDatasetData={setDatasetData}
            isSubsetSamplingEnabled={isSubsetSamplingEnabled}
            setIsSubsetSamplingEnabled={setIsSubsetSamplingEnabled}
          />
        </div>
        <div className="right-panel">
          {csvHeaders.length > 0 ? (
            <div className="right-panel-split">
              <div className="right-panel-top">
                <DatasetPreview datasetData={datasetData} />
              </div>
              <div className="right-panel-bottom">
                <ChatBox localPath={localPath} csvHeaders={csvHeaders} status={status} setStatus={setStatus} setCsvHeaders={setCsvHeaders} datasetData={datasetData} setDatasetData={setDatasetData} isSubsetSamplingEnabled={isSubsetSamplingEnabled} />
              </div>
            </div>
          ) : (
            <ChatBox localPath={localPath} csvHeaders={csvHeaders} status={status} setStatus={setStatus} setCsvHeaders={setCsvHeaders} datasetData={datasetData} setDatasetData={setDatasetData} isSubsetSamplingEnabled={isSubsetSamplingEnabled} />
          )}
        </div>
      </div>
    </div>
  )
}

export default App
