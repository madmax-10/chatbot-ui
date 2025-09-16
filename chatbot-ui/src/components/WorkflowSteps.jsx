import { useCallback, useMemo, useState, memo } from 'react'
import DataFileInput from './DataFileInput'
import DatasetPreview from './DatasetPreview'

const WorkflowSteps = memo(({ localPath = '', setLocalPath, setCsvHeaders, status, setStatus}) => {
  const [expandedRequirement, setExpandedRequirement] = useState(null)
  const [datasetData, setDatasetData] = useState(null)

  // Memoize requirements array to prevent recreation on every render
  const requirements = useMemo(() => [
    {
      id: 'action-type',
      number: 1,
      title: 'Action Type',
      description: 'Choose your analysis action (Recommend, Modify, or What if)',
      icon: '🎯'
    },
    {
      id: 'datafile',
      number: 2,
      title: 'Data File Path',
      description: 'Upload and select your CSV data file',
      icon: '📁'
    },
    {
      id: 'drop-columns',
      number: 5,
      title: 'Drop Columns',
      description: 'Remove unnecessary columns from your dataset',
      icon: '🗑️'
    },
    {
      id: 'target-variables',
      number: 3,
      title: 'Target Variables',
      description: 'Define your target variables and their ranges',
      icon: '🎯'
    },
    {
      id: 'user-constraints',
      number: 4,
      title: 'User Constraints',
      description: 'Set constraints and parameters for analysis',
      icon: '⚙️'
    },
    {
      id: 'analysis',
      number: 6,
      title: 'Analysis',
      description: 'Run analysis and get insights',
      icon: '📊'
    },
    {
      id: 'results',
      number: 7,
      title: 'Results',
      description: 'View and export your results',
      icon: '📈'
    }
  ], [])

  // Memoize sorted requirements
  const sortedRequirements = useMemo(() => 
    requirements.sort((a, b) => a.number - b.number), 
    [requirements]
  )

  // Memoize current status as number
  const currentStatus = useMemo(() => parseInt(status), [status])

  const getRequirementStatus = useCallback((requirementNumber) => {
    return requirementNumber < currentStatus ? 'completed' : 'pending'
  }, [currentStatus])

  const handleRequirementClick = useCallback((requirementId) => {
    if (requirementId === 'datafile') {
      // Toggle expansion for datafile requirement
      if (expandedRequirement === requirementId) {
        setExpandedRequirement(null)
      } else {
        setExpandedRequirement(requirementId)
      }
    }
  }, [expandedRequirement])


  return (
  
      <div className="workflow-steps">
        <div className="steps-header">
          <h3>Requirements</h3>
          <p>Complete these requirements to proceed with your analysis</p>
        </div>
        
        <div className="steps-list">
          {sortedRequirements.map((requirement, index) => {
            const requirementStatus = getRequirementStatus(requirement.number)
            const isDataFileRequirement = requirement.id === 'datafile'
            const isExpanded = expandedRequirement === requirement.id || (isDataFileRequirement && currentStatus === requirement.number)
            
            return (
              <div
                key={requirement.id}
                className={`step-item ${requirementStatus} ${isDataFileRequirement ? 'expandable' : ''} ${isExpanded ? 'expanded' : ''}`}
                onClick={() => handleRequirementClick(requirement.id)}
              >
                <div className="step-number">
                  <span className="step-icon">{requirement.icon}</span>
                  <span className="step-num">{requirement.number}</span>
                </div>
                <div className="step-content">
                  <h4>{requirement.title}</h4>
                  <p>{requirement.description}</p>
                  {isDataFileRequirement && isExpanded && (
                    <div className="step-uploader">
                      <DataFileInput localPath={localPath} setLocalPath={setLocalPath} setStatus={setStatus} setCsvHeaders={setCsvHeaders} setDatasetData={setDatasetData} />
                    </div>
                  )}
                </div>
                <div className="step-status">
                  {requirementStatus === 'completed' && <span className="checkmark">✓</span>}
                  {requirementStatus === 'pending' && <span className="pending-indicator">○</span>}
                  {isDataFileRequirement && (
                    <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        <DatasetPreview datasetData={datasetData} />
      </div>
    )
})

export default WorkflowSteps