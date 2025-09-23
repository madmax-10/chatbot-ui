import { useCallback, useMemo, useState, memo } from 'react'

const DropColumnSelector = memo(({ 
  title = "Drop Columns", 
  description = "Select columns to remove from your dataset (or keep all columns)", 
  columns, 
  onDrop, 
  onCancel,
  selectedColumnsToDrop = [],
  onColumnToggle
}) => {
  // Memoize computed values
  const selectedCount = useMemo(() => selectedColumnsToDrop.length, [selectedColumnsToDrop])
  const remainingColumns = useMemo(() => 
    columns.filter(col => !selectedColumnsToDrop.includes(col)), 
    [columns, selectedColumnsToDrop]
  )

  // Memoize event handlers
  const handleColumnToggle = useCallback((column) => {
    onColumnToggle(column)
  }, [onColumnToggle])

  const handleDrop = useCallback(() => {
    onDrop()
  }, [onDrop])

  const handleSelectAll = useCallback(() => {
    columns.forEach(column => {
      if (!selectedColumnsToDrop.includes(column)) {
        onColumnToggle(column)
      }
    })
  }, [columns, selectedColumnsToDrop, onColumnToggle])

  const handleDeselectAll = useCallback(() => {
    selectedColumnsToDrop.forEach(column => {
      onColumnToggle(column)
    })
  }, [selectedColumnsToDrop, onColumnToggle])

  return (
    <div className="drop-column-selector-section">
      <div className="drop-column-selector-container">
        <div className="drop-column-selector-header">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        
        <div className="drop-column-selector-stats">
          <div className="drop-column-stat">
            <span className="stat-label">Total Columns:</span>
            <span className="stat-value">{columns.length}</span>
          </div>
          <div className="drop-column-stat">
            <span className="stat-label">Selected to Drop:</span>
            <span className="stat-value selected">{selectedCount}</span>
          </div>
          <div className="drop-column-stat">
            <span className="stat-label">Will Remain:</span>
            <span className="stat-value remaining">{remainingColumns.length}</span>
          </div>
        </div>

        <div className="drop-column-selector-actions">
          <button 
            onClick={handleSelectAll}
            className="drop-column-action-button select-all"
            disabled={selectedCount === columns.length}
          >
            Select All
          </button>
          <button 
            onClick={handleDeselectAll}
            className="drop-column-action-button deselect-all"
            disabled={selectedCount === 0}
          >
            Deselect All
          </button>
        </div>

        <div className="drop-column-selector-list">
          <h4>Available Columns:</h4>
          <div className="drop-column-grid">
            {columns.map((column, index) => {
              const isSelected = selectedColumnsToDrop.includes(column)
              return (
                <div 
                  key={index} 
                  className={`drop-column-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleColumnToggle(column)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    onClick={(e) => {
                      e.stopPropagation()
                      handleColumnToggle(column)
                    }}
                    className="drop-column-checkbox"
                  />
                  <span className="drop-column-name">{column}</span>
                </div>
              )
            })}
          </div>
        </div>

        {selectedCount > 0 && (
          <div className="drop-column-selected-list">
            <h4>Columns to Drop ({selectedCount}):</h4>
            <div className="drop-column-selected-items">
              {selectedColumnsToDrop.map((column, index) => (
                <div key={index} className="drop-column-selected-item">
                  <span className="drop-column-selected-name">{column}</span>
                  <button 
                    onClick={() => handleColumnToggle(column)}
                    className="drop-column-remove-button"
                    title="Remove from drop list"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="drop-column-selector-footer">
          <button 
            onClick={onCancel}
            className="drop-column-cancel-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleDrop}
            className="drop-column-drop-button"
          >
            {selectedCount === 0 ? 'Keep All Columns' : `Drop ${selectedCount} Column${selectedCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
})

export default DropColumnSelector
