import { useCallback, useMemo, useState, memo } from 'react'
import Papa from 'papaparse'

const DataFileInput = memo(({setStatus, setCsvHeaders, setDatasetData}) => {
  const [inputType, setInputType] = useState('local') // 'local' or 'url'
  const [selectedFile, setSelectedFile] = useState(null)
  const [urlPath, setUrlPath] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Memoize computed values
  const isUrlValid = useMemo(() => urlPath.trim().length > 0, [urlPath])
  const isLocalMode = useMemo(() => inputType === 'local', [inputType])
  const isUrlMode = useMemo(() => inputType === 'url', [inputType])

  const handleInputTypeChange = useCallback((type) => {
    setInputType(type)
    // Clear the other input when switching
    if (type === 'local') {
      setUrlPath('')
    } else {
      setSelectedFile(null)
    }
  }, [])

  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0]
    
    if (!file) {
      return
    }
    
    setSelectedFile(file)
    setIsLoading(true)
    
    // Use Papa Parse to read only the first line (headers)
    Papa.parse(file, {
      preview: 4, // This is the key: only parse the first row
      complete: (results) => {
        // results.data[0] will be an array of the column names
        if (results.data && results.data.length > 0) {
          const headers = results.data[0] || []
          const fileName = file.name
          const sampleData = results.data.slice(1, 4) || []
        //   console.log('headers', headers)
        //   console.log('fileName', fileName)
        if (setCsvHeaders) {
          setCsvHeaders(headers)
        }
        if (setDatasetData) {
          setDatasetData({ fileName, headers, sampleData })
        } 
        if (setStatus) {
          setStatus('3')
        }
          
        }
        setIsLoading(false)
      },
      error: (err) => {
        alert(`Error parsing file: ${err.message}`)
        setIsLoading(false)
      }
    })
  }, [setCsvHeaders, setDatasetData, setStatus])

  const handleUrlSubmit = useCallback(async () => {
    if (!urlPath.trim()) return
    
    setIsLoading(true)
    try {
      // Extract filename from URL for display
      const fileName = urlPath.split('/').pop() || 'remote-file.csv'
      
      // Fetch only first 2 KB to get headers efficiently
      const res = await fetch(urlPath, {
        headers: { Range: "bytes=0-2047" },
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const textChunk = await res.text()
      
      // Check if the response looks like HTML (common error case)
      if (textChunk.trim().startsWith('<!DOCTYPE') || textChunk.trim().startsWith('<html')) {
        throw new Error('The URL returned HTML instead of CSV data. Please check the URL.')
      }
      
      // Use PapaParse to parse just the first row (headers only)
      Papa.parse(textChunk, {
        preview: 4, // Only parse the first row (headers)
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const headers = results.data[0] || []
            const sampleData = results.data.slice(1, 4) || []
            if (setCsvHeaders) {
              setCsvHeaders(headers)
            }
            if (setDatasetData) {
              setDatasetData({ fileName, headers, sampleData })
            }
            if (setStatus) {
              setStatus('3')
            }
            setIsLoading(false)
          } else {
            throw new Error('No headers found in CSV file')
          }
        },
        error: (error) => {
          throw new Error(`CSV parsing error: ${error.message}`)
        }
      })
      
    } catch (error) {
      alert('Error reading URL: ' + error.message)
      setIsLoading(false)
    }
  }, [urlPath, setCsvHeaders, setDatasetData, setStatus])

  const handleClick = useCallback((e) => {
    e.stopPropagation(); // Prevent event bubbling to parent
  }, [])

  // Memoize event handlers for input type buttons
  const handleLocalClick = useCallback((e) => {
    e.stopPropagation();
    handleInputTypeChange('local');
  }, [handleInputTypeChange])

  const handleUrlClick = useCallback((e) => {
    e.stopPropagation();
    handleInputTypeChange('url');
  }, [handleInputTypeChange])

  const handleUrlInputChange = useCallback((e) => setUrlPath(e.target.value), [])

  const handleUrlSubmitClick = useCallback((e) => {
    e.stopPropagation();
    handleUrlSubmit();
  }, [handleUrlSubmit])

  return (
    <div className="data-file-input" onClick={handleClick}>
      <div className="input-type-selector">
        <button
          className={`input-type-btn ${isLocalMode ? 'active' : ''}`}
          onClick={handleLocalClick}
        >
          📁 Upload File
        </button>
        <button
          className={`input-type-btn ${isUrlMode ? 'active' : ''}`}
          onClick={handleUrlClick}
        >
          🌐 URL
        </button>
      </div>

      {isLocalMode ? (
        <div className="file-upload-input">
          <label htmlFor="file-upload">Choose CSV File:</label>
          <input
            type="file"
            id="file-upload"
            accept=".csv,.txt"
            onChange={handleFileChange}
            onClick={handleClick}
            className="file-input"
            disabled={isLoading}
          />
          {selectedFile && (
            <div className="selected-file">
              <span>Selected: {selectedFile.name}</span>
              {isLoading && <span> (Reading headers...)</span>}
            </div>
          )}
        </div>
      ) : (
        <div className="url-input">
          <label htmlFor="url-path">CSV URL:</label>
          <input
            type="url"
            id="url-path"
            value={urlPath}
            onChange={handleUrlInputChange}
            onClick={handleClick}
            placeholder="e.g., https://example.com/data.csv"
            className="path-input"
            disabled={isLoading}
          />
          <button
            onClick={handleUrlSubmitClick}
            disabled={!isUrlValid || isLoading}
            className="submit-btn"
          >
            {isLoading ? 'Reading...' : 'Read Headers'}
          </button>
        </div>
      )}
    </div>
  )
})

export default DataFileInput
