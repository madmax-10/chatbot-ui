import { useState } from 'react'

function ColumnSelector({ 
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
}) {
  const [selectedColumn, setSelectedColumn] = useState('')
  const [minValue, setMinValue] = useState('')
  const [maxValue, setMaxValue] = useState('')

  function handleAdd() {
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
  }

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
              onChange={(e) => setSelectedColumn(e.target.value)}
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
              onChange={(e) => setMinValue(e.target.value)}
              placeholder="Min value"
              className="column-selector-input"
            />
          </div>

          <div className="column-selector-input-group">
            <label className="column-selector-label">Maximum:</label>
            <input
              type="number"
              value={maxValue}
              onChange={(e) => setMaxValue(e.target.value)}
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
              {finishButtonText} ({Object.keys(existingItems).length} items)
            </button>
          )}
        </div>

        {Object.keys(existingItems).length > 0 && (
          <div className="column-selector-list">
            <h4>Current Items:</h4>
            {Object.entries(existingItems).map(([column, values]) => (
              <div key={column} className="column-selector-item">
                <strong>{column}</strong>: min={values.min}, max={values.max}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ColumnSelector
