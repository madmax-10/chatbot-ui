import { useMemo, memo } from 'react'

const DatasetPreview = memo(({ datasetData }) => {
  // Memoize computed values
  const hasValidData = useMemo(() => 
    datasetData && datasetData.headers && datasetData.headers.length > 0, 
    [datasetData]
  )
  
  const fileName = useMemo(() => 
    datasetData?.fileName || 'Dataset', 
    [datasetData?.fileName]
  )
  
  const columnCount = useMemo(() => 
    datasetData?.headers?.length || 0, 
    [datasetData?.headers?.length]
  )
  
  const sampleRowCount = useMemo(() => 
    datasetData?.sampleData?.length || 0, 
    [datasetData?.sampleData?.length]
  )
  
  const headers = useMemo(() => 
    datasetData?.headers || [], 
    [datasetData?.headers]
  )
  
  const sampleData = useMemo(() => 
    datasetData?.sampleData || [], 
    [datasetData?.sampleData]
  )

  if (!hasValidData) {
    return (
      <div className="dataset-preview">
        <div className="preview-header">
          <h4>Dataset Preview</h4>
          <p>No dataset loaded yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dataset-preview">
      <div className="preview-header">
        <h4>📄 {fileName}</h4>
        <p>{columnCount} columns, {sampleRowCount} sample rows</p>
      </div>
      
      <div className="preview-table-container">
        <table className="preview-table">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sampleData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>
                    {cell || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
})

export default DatasetPreview
