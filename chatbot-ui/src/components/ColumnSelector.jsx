import { useCallback, useMemo, useState, memo } from 'react'

const ColumnSelector = memo(({ 
  title, 
  description, 
  columns, 
  onAdd, 
  onFinish, 
  existingItems = {}, 
  buttonText = "Add",
  finishButtonText = "Finish",
  showFinishButton = true,
  allowMultiple = true
}) => {
  const [selectedColumn, setSelectedColumn] = useState('')
  const [minValue, setMinValue] = useState('')
  const [maxValue, setMaxValue] = useState('')

  // Memoize computed values
  const existingItemsCount = useMemo(() => Object.keys(existingItems).length, [existingItems])
  const existingItemsEntries = useMemo(() => Object.entries(existingItems), [existingItems])
  const isFormValid = useMemo(() => 
    selectedColumn && minValue && maxValue && 
    !isNaN(parseFloat(minValue)) && !isNaN(parseFloat(maxValue)) &&
    parseFloat(minValue) < parseFloat(maxValue)
  , [selectedColumn, minValue, maxValue])

  // Memoize event handlers
  const handleColumnChange = useCallback((e) => setSelectedColumn(e.target.value), [])
  const handleMinChange = useCallback((e) => setMinValue(e.target.value), [])
  const handleMaxChange = useCallback((e) => setMaxValue(e.target.value), [])

  const handleAdd = useCallback(() => {
    if (!selectedColumn || !minValue || !maxValue) {
      alert('Please fill in all fields')
      return
    }

    const min = parseFloat(minValue)
    const max = parseFloat(maxValue)

    if (isNaN(min) || isNaN(max)) {
      alert('Please enter valid numbers')
      return
    }

    if (min >= max) {
      alert('Minimum value must be less than maximum value')
      return
    }

    const newItem = {
      [selectedColumn]: {
        min: min,
        max: max
      }
    }

    onAdd(newItem, selectedColumn, min, max)

    // Clear form if allowing multiple
    if (allowMultiple) {
      setSelectedColumn('')
      setMinValue('')
      setMaxValue('')
    }
  }, [selectedColumn, minValue, maxValue, onAdd, allowMultiple])

  return (
    <div className="column-selector-section">
      <div className="column-selector-container">
        <div className="column-selector-header">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        
        <div className="column-selector-form">
          <div className="column-selector-input-group">
            <label className="column-selector-label">Column:</label>
            <select 
              value={selectedColumn}
              onChange={handleColumnChange}
              className="column-selector-select"
            >
              <option value="">Select a column</option>
              {columns.map((column, index) => (
                <option key={index} value={column}>{column}</option>
              ))}
            </select>
          </div>

          <div className="column-selector-input-group">
            <label className="column-selector-label">Minimum:</label>
            <input
              type="number"
              value={minValue}
              onChange={handleMinChange}
              placeholder="Min value"
              className="column-selector-input"
            />
          </div>

          <div className="column-selector-input-group">
            <label className="column-selector-label">Maximum:</label>
            <input
              type="number"
              value={maxValue}
              onChange={handleMaxChange}
              placeholder="Max value"
              className="column-selector-input"
            />
          </div>
        </div>

        <div className="column-selector-actions">
          <button 
            onClick={handleAdd}
            className="column-selector-add-button"
          >
            {buttonText}
          </button>
          {showFinishButton && (
            <button 
              onClick={onFinish}
              className="column-selector-finish-button"
            >
              {finishButtonText} ({existingItemsCount} items)
            </button>
          )}
        </div>

        {existingItemsCount > 0 && (
          <div className="column-selector-list">
            <h4>Current Items:</h4>
            {existingItemsEntries.map(([column, values]) => (
              <div key={column} className="column-selector-item">
                <strong>{column}</strong>: min={values.min}, max={values.max}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

export default ColumnSelector
