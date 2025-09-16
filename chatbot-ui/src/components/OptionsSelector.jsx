import { useCallback, useMemo, useState, memo } from 'react'

const OptionsSelector = memo(({ onOptionSelected }) => {
  const [selectedOption, setSelectedOption] = useState(null)

  // Memoize options array to prevent recreation on every render
  const options = useMemo(() => [
    {
      id: 'recommend',
      title: 'Recommend',
      description: 'Get AI-powered recommendations based on your data analysis and insights',
      icon: '💡'
    },
    {
      id: 'modify',
      title: 'Modify',
      description: 'Modify and adjust your data parameters, constraints, and target variables',
      icon: '⚙️'
    },
    {
      id: 'whatif',
      title: 'What if',
      description: 'Explore hypothetical scenarios and see how changes would affect your results',
      icon: '🔮'
    }
  ], [])

  const handleOptionClick = useCallback((optionId) => {
    setSelectedOption(optionId)
    if (onOptionSelected) {
      onOptionSelected(optionId)
    }
  }, [onOptionSelected])

  return (
    <div className="options-container">
      <section className="options-header">
        <h1>What do you want to do?</h1>
        <p>Choose an option to get started</p>
      </section>

      <div className="options-grid">
        {options.map((option) => (
          <button
            key={option.id}
            className="option-card"
            onClick={() => handleOptionClick(option.id)}
          >
            <div className="option-icon">{option.icon}</div>
            <div className="option-content">
              <h3>{option.title}</h3>
              <p>{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
})

export default OptionsSelector
