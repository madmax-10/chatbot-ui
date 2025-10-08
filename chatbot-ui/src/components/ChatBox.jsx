import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import ColumnSelector from "./ColumnSelector";
import OptionsSelector from "./OptionsSelector";
import DropColumnSelector from "./DropColumnSelector";

// Move levenshteinDistance outside component to avoid recreation
const levenshteinDistance = (s1, s2) => {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
};

function getInitialMessage(selectedOption) {
  switch (selectedOption) {
    case "recommend":
      return "I'm ready to provide recommendations based on your data. Please upload a CSV file to get started.";
    case "modify":
      return "I'm here to help you modify your data parameters and constraints. Please upload a CSV file to begin.";
    case "whatif":
      return 'I\'m ready to explore "what if" scenarios with your data. Please upload a CSV file to start analyzing different possibilities.';
    default:
      return "Please upload a CSV file to get started.";
  }
}

function ChatBox({
  queryType,
  setQueryType,
  localPath,
  csvHeaders,
  status,
  setStatus,
  setCsvHeaders,
  datasetData,
  setDatasetData,
  isSubsetSamplingEnabled = false,
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [messages, setMessages] = useState([
    { id: "m-0", role: "assistant", content: getInitialMessage(null) },
  ]);
  const [taskType, setTaskType] = useState("Regression");
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [partial, setPartial] = useState("");
  const [selectedColumnsToDrop, setSelectedColumnsToDrop] = useState([]);
  const [droppedColumns, setDroppedColumns] = useState([]);
  const [userConstraints, setUserConstraints] = useState({});
  const [userConstraintsForSamples, setUserConstraintsForSamples] = useState(
    {}
  );
  const [fixedColumnsForSamples, setFixedColumnsForSamples] = useState({});
  const [fixedColumns, setFixedColumns] = useState({});
  const [target, setTarget] = useState({});
  const [queryFeatures, setQueryFeatures] = useState({});
  const [samples, setSamples] = useState([]);
  const [showDropColumnSelector, setShowDropColumnSelector] = useState(false);
  const [finalJson, setFinalJson] = useState({});
  const [quickOptions, setQuickOptions] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, partial]);

  useEffect(() => {
    // Update the initial message when selectedOption changes
    if (selectedOption) {
      setMessages([
        {
          id: "m-0",
          role: "assistant",
          content: getInitialMessage(selectedOption),
        },
      ]);
    }
  }, [selectedOption]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isGenerating,
    [input, isGenerating]
  );
  const isChatDisabled = useMemo(
    () => status === "2" || status === "4" || parseInt(status) >= 9,
    [status]
  );

  // Generate quick options based on status and csvHeaders
  const generateQuickOptions = useCallback(() => {
    const options = [];

    if (status === "5") {
      // Target Variables
      if (csvHeaders.length >= 2) {
        const lastTwoHeaders = csvHeaders.slice(-2);
        options.push(
          {
            text: `Maximize ${lastTwoHeaders[0]}`,
            action: () => setInput(`Maximize ${lastTwoHeaders[0]}`),
          },
          {
            text: `Minimize ${lastTwoHeaders[1]}`,
            action: () => setInput(`Minimize ${lastTwoHeaders[1]}`),
          },
          {
            text: `Set ${lastTwoHeaders[1]} between 10 and 100`,
            action: () =>
              setInput(`Set ${lastTwoHeaders[1]} between 10 and 100`),
          }
        );
      }
    } else if (status === "6") {
      // Query Features
      if (csvHeaders.length >= 4) {
        const thirdFourthHeaders = csvHeaders.slice(2, 4);
        options.push(
          {
            text: `Recommend on ${thirdFourthHeaders[0]}`,
            action: () => setInput(`Recommend on ${thirdFourthHeaders[0]}`),
          },
          {
            text: `Recommend on ${thirdFourthHeaders[1]}`,
            action: () => setInput(`Recommend on ${thirdFourthHeaders[1]}`),
          },
          {
            text: `Recommend on ${thirdFourthHeaders[0]} and ${thirdFourthHeaders[1]}`,
            action: () =>
              setInput(
                `Recommend on ${thirdFourthHeaders[0]} and ${thirdFourthHeaders[1]}`
              ),
          }
        );
      }
    } else if (status === "7" || status === "3") {
      // User Constraints
      if (csvHeaders.length >= 4) {
        const thirdFourthHeaders = csvHeaders.slice(2, 4);
        options.push(
          {
            text: `I want ${thirdFourthHeaders[0]} between 10 and 100`,
            action: () =>
              setInput(`I want ${thirdFourthHeaders[0]} between 10 and 100`),
          },
          {
            text: `I want ${thirdFourthHeaders[1]} to be 50`,
            action: () => setInput(`I want ${thirdFourthHeaders[1]} to be 50`),
          },
          {
            text: `I want ${thirdFourthHeaders[0]} less than 80`,
            action: () =>
              setInput(`I want ${thirdFourthHeaders[0]} less than 80`),
          }
        );
      }
    } else if (status === "8") {
      // Analysis Type
      options.push(
        { text: "Regression", action: () => setInput("Regression") },
        { text: "Classification", action: () => setInput("Classification") },
        { text: "Clustering", action: () => setInput("Clustering") }
      );
    } else {
      // Default options
      options.push(
        {
          text: "Can you help me analyze this data?",
          action: () => setInput("Can you help me analyze this data?"),
        },
        {
          text: "What insights can you provide?",
          action: () => setInput("What insights can you provide?"),
        },
        {
          text: "Can you suggest improvements?",
          action: () => setInput("Can you suggest improvements?"),
        }
      );
    }

    return options;
  }, [status, csvHeaders]);

  const parseTextAndMatchFeatures = (text) => {
    if (!text || typeof text !== "string") {
      console.debug("parseText: empty or invalid text");
      return {};
    }

    if (!csvHeaders || !Array.isArray(csvHeaders) || csvHeaders.length === 0) {
      console.debug("parseText: missing csvHeaders");
      return {};
    }

    const constraints = {};
    const processedText = text.toLowerCase();

    console.debug("parseText: status=", status, " text=", processedText);

    // Helper function to find best matching feature
    const findBestMatch = (rawFeature) => {
      let cleanedFeature = rawFeature.toLowerCase().replace(/\s+/g, " ").trim();

      // Remove common stopwords
      const stopwords = [
        "the",
        "a",
        "an",
        "my",
        "set",
        "change",
        "make",
        "recommend",
      ];
      for (const stopword of stopwords) {
        if (cleanedFeature.startsWith(stopword + " ")) {
          cleanedFeature = cleanedFeature.slice(stopword.length).trim();
          break;
        }
      }

      // Remove trailing generic terms
      cleanedFeature = cleanedFeature
        .replace(/\b(column|field|value)s?\s*$/i, "")
        .trim();

      let bestMatch = null;
      let minDistance = Infinity;
      const normalizedRawFeature = cleanedFeature.replace(/\s+/g, "");

      for (const canonicalFeature of csvHeaders) {
        const strategies = [
          canonicalFeature.toLowerCase().replace(/[_]/g, ""),
          canonicalFeature.toLowerCase().replace(/_/g, " ").replace(/\s+/g, ""),
          canonicalFeature.toLowerCase().replace(/\s+/g, ""),
          canonicalFeature.toLowerCase().replace(/_/g, " "),
        ];

        for (const normalizedCanonical of strategies) {
          const distance = levenshteinDistance(
            normalizedRawFeature,
            normalizedCanonical
          );
          if (distance < minDistance) {
            minDistance = distance;
            bestMatch = canonicalFeature;
          }
        }
      }

      if (bestMatch && bestMatch.length > 0) {
        const featureLength = Math.max(
          normalizedRawFeature.length,
          bestMatch.length
        );
        const threshold = Math.max(2, Math.floor(featureLength * 0.4));

        if (minDistance <= threshold) {
          console.debug(
            `match: "${rawFeature}" -> "${bestMatch}" (d=${minDistance})`
          );
          return bestMatch;
        }
      }

      console.debug(`no-match: "${rawFeature}"`);
      return null;
    };

    // Status 4: Target Variables - Maximize/minimize and set operations
    if (status === "5") {
      console.debug("parseText: target patterns");

      // Pattern 1: Maximize/minimize feature1, feature2,...
      const maximizeMinimizePattern =
        /(?:maximize|minimize)\s+([a-zA-Z_][a-zA-Z0-9_\s,]+?)(?=\s*(?:,|$))/gi;
      processedText.replace(
        maximizeMinimizePattern,
        (match, featuresString) => {
          const operation = match.toLowerCase().includes("maximize")
            ? "maximize"
            : "minimize";
          const featureNames = featuresString
            .split("and")
            .map((f) => f.trim())
            .filter((f) => f.length > 0);

          for (const rawFeature of featureNames) {
            const feature = findBestMatch(rawFeature);
            if (feature) {
              constraints[feature] = operation;
              console.debug(`target ${operation}: ${feature}`);
            }
          }
        }
      );

      // Pattern 2: Set feature operations (comparison and range)
      const setPattern =
        /set\s+([a-zA-Z_][a-zA-Z0-9_\s]*?)\s+(?:to be|=|is|<=|>=|<|>|less than or equal to|greater than or equal to|less than|more than|greater than|between)\s+([^,]+?)(?=\s*(?:,|$))/gi;
      processedText.replace(setPattern, (match, featureName, valuePart) => {
        const feature = findBestMatch(featureName);
        if (feature) {
          // Detect operator from the full match text
          const opMatch = match
            .toLowerCase()
            .match(
              /\s(to be|=|is|<=|>=|<|>|less than or equal to|greater than or equal to|less than|more than|greater than|between)\s/
            );
          const operator = opMatch ? opMatch[1] : null;
          if (operator === "between") {
            const rangeMatch = valuePart.match(
              /(\d+\.?\d*)\s*(?:and|to)\s*(\d+\.?\d*)/i
            );
            if (rangeMatch) {
              constraints[feature] = {
                min: parseFloat(rangeMatch[1]),
                max: parseFloat(rangeMatch[2]),
              };
              console.debug(
                `target range: ${feature} ${rangeMatch[1]}..${rangeMatch[2]}`
              );
            }
          } else if (
            operator === "less than or equal to" ||
            operator === "<="
          ) {
            const value = parseFloat(valuePart.trim());
            constraints[feature] = { min: null, max: value };
            console.debug(`target <= : ${feature} <= ${value}`);
          } else if (
            operator === "greater than or equal to" ||
            operator === ">="
          ) {
            const value = parseFloat(valuePart.trim());
            constraints[feature] = { min: value, max: null };
            console.debug(`target >= : ${feature} >= ${value}`);
          } else if (operator === "less than" || operator === "<") {
            const value = parseFloat(valuePart.trim());
            constraints[feature] = { min: null, max: value };
            console.debug(`target < : ${feature} < ${value}`);
          } else if (
            operator === "more than" ||
            operator === "greater than" ||
            operator === ">"
          ) {
            const value = parseFloat(valuePart.trim());
            constraints[feature] = { min: value, max: null };
            console.debug(`target > : ${feature} > ${value}`);
          } else {
            // Exact value
            const value = parseFloat(valuePart.trim());
            constraints[feature] = { min: value, max: value };
            console.debug(`target = : ${feature} = ${value}`);
          }
        }
      });
    }

    // Status 5: Query Features - I want feature operations
    else if (
      (status === "7" && queryType === "recommend") ||
      (status === "3" && queryType === "modify")
    ) {
      console.debug("parseText: user constraint patterns");

      const wantPattern =
        /(?:i want\s+)?([a-zA-Z_][a-zA-Z0-9_\s]*?)\s+(?:is|to be|==|=|<=|>=|<|>|less than or equal to|greater than or equal to|less than|more than|greater than|between)\s+([^,]+?)(?=\s*(?:,|$))/gi;

      // Protect 'and' inside ranges, then split clauses on ' and '
      const protectedText = processedText.replace(
        /between\s+(\d+\.?\d*)\s+and\s+(\d+\.?\d*)/gi,
        (m, a, b) => `between ${a} __AND__ ${b}`
      );
      const clauses = protectedText.split(/\s+and\s+/i);
      for (const clause of clauses) {
        const restored = clause.replace(/__AND__/g, "and");
        restored.replace(wantPattern, (match, featureName, valuePart) => {
          const feature = findBestMatch(featureName);
          if (feature) {
            // Detect operator from the full match text
            const opMatch = match
              .toLowerCase()
              .match(
                /\s(is|to be|==|=|<=|>=|<|>|less than or equal to|greater than or equal to|less than|more than|greater than|between)\s/
              );
            const operator = opMatch ? opMatch[1] : null;

            if (operator === "between") {
              const rangeMatch = valuePart.match(
                /(\d+\.?\d*)\s*(?:and|to)\s*(\d+\.?\d*)/i
              );
              if (rangeMatch) {
                constraints[feature] = {
                  min: parseFloat(rangeMatch[1]),
                  max: parseFloat(rangeMatch[2]),
                };
                console.debug(
                  `want range: ${feature} ${rangeMatch[1]}..${rangeMatch[2]}`
                );
              }
            } else if (
              operator === "less than or equal to" ||
              operator === "<="
            ) {
              const value = parseFloat(valuePart.trim());
              constraints[feature] = { min: null, max: value };
              console.debug(`want <= : ${feature} <= ${value}`);
            } else if (
              operator === "greater than or equal to" ||
              operator === ">="
            ) {
              const value = parseFloat(valuePart.trim());
              constraints[feature] = { min: value, max: null };
              console.debug(`want >= : ${feature} >= ${value}`);
            } else if (operator === "less than" || operator === "<") {
              const value = parseFloat(valuePart.trim());
              constraints[feature] = { min: null, max: value };
              console.debug(`want < : ${feature} < ${value}`);
            } else if (
              operator === "more than" ||
              operator === "greater than" ||
              operator === ">"
            ) {
              const value = parseFloat(valuePart.trim());
              constraints[feature] = { min: value, max: null };
              console.debug(`want > : ${feature} > ${value}`);
            } else if (operator === "==") {
              const rawWhole = valuePart.trim();
              let rawValue = rawWhole;
              let value;
              // If quoted, extract inside quotes; else cut at ' and '
              const quoteMatch = rawWhole.match(/^("|')(.*?)(\1)/);
              if (quoteMatch) {
                rawValue = quoteMatch[2];
              } else {
                rawValue = rawWhole.split(/\s+and\s+/i)[0];
              }
              rawValue = rawValue.replace(/[.,;]+$/, "").trim();
              if (/^-?\d+(?:\.\d+)?$/.test(rawValue)) {
                value = parseFloat(rawValue);
              } else {
                value = rawValue;
              }
              constraints[feature] = value;
              console.debug(`want == : ${feature} == ${value}`);
            } else if (
              operator === "is" ||
              operator === "to be" ||
              operator === "="
            ) {
              const value = parseFloat(valuePart.trim());
              constraints[feature] = { min: value, max: value };
              console.debug(`want = : ${feature} = ${value}`);
            }
          }
        });
      }
    }

    // Status 6: User Constraints - Recommend on features
    else if (status === "6") {
      console.debug("parseText: feature recommendation patterns");

      const recommendPattern =
        /(?:recommend on|recommend)\s+([a-zA-Z_][a-zA-Z0-9_\s,]+?)(?=\s*$)/gi;
      processedText.replace(recommendPattern, (match, featuresString) => {
        const featureNames = featuresString
          .split(/[,\s]+and\s+|[,\s]+/)
          .map((f) => f.trim())
          .filter((f) => f.length > 0);

        for (const rawFeature of featureNames) {
          const feature = findBestMatch(rawFeature);
          if (feature) {
            constraints[feature] = true; // Simple boolean for recommend
            console.debug(`recommend: ${feature}`);
          }
        }
      });
    }

    console.debug("parseText: constraints=", constraints);
    return constraints;
  };

  // Memoize option selector handler
  const handleOptionSelected = useCallback(
    (optionId) => {
      setSelectedOption(optionId);
      // map option to queryType for final JSON
      if (optionId === "recommend") setQueryType("recommend");
      else if (optionId === "modify") setQueryType("modify");
      else if (optionId === "whatif") setQueryType("whatif");
      setStatus("2"); // Change status to show chat interface
    },
    [setStatus]
  );

  // Handle done button click - increase status by 1
  const handleDoneClick = useCallback(() => {
    const currentStatus = parseInt(status);
    // Advance for stages 4 (Drop Columns) through 10 (Complete)
    if (currentStatus >= 4 && currentStatus < 10) {
      setStatus((currentStatus + 1).toString());
    }
  }, [status, setStatus]);

  // Memoize computed values
  const userConstraintsCount = useMemo(
    () => Object.keys(userConstraints).length,
    [userConstraints]
  );
  const targetCount = useMemo(() => Object.keys(target).length, [target]);
  const selectedColumnsCount = useMemo(
    () => selectedColumnsToDrop.length,
    [selectedColumnsToDrop]
  );

  // Define analyzePrompt before onSend to avoid circular dependency
  const analyzePrompt = useCallback(
    (prompt) => {
      const result = parseTextAndMatchFeatures(prompt);
      console.debug("onAnalyze: status=", status);
      if (status === "5") {
        console.debug("set target");
        setTarget((prev) => ({ ...prev, ...result }));
      } else if (status === "6") {
        console.debug("set queryFeatures");
        setQueryFeatures((prev) => ({ ...prev, ...result }));
      } else if (status === "7" || status === "3") {
        console.debug("set userConstraints/fixedColumns");
        const constraintsUpdates = {};
        const fixedUpdates = {};
        for (const [key, value] of Object.entries(result)) {
          if (value && typeof value === "object") {
            constraintsUpdates[key] = value;
          } else if (typeof value === "string") {
            fixedUpdates[key] = value;
          } else {
            // numbers, booleans, or other primitives -> treat as constraints
            constraintsUpdates[key] = value;
          }
        }
        if (Object.keys(constraintsUpdates).length > 0) {
          if (status === "3") {
            setUserConstraintsForSamples((prev) => ({
              ...prev,
              ...constraintsUpdates,
            }));
          }
          setUserConstraints((prev) => ({ ...prev, ...constraintsUpdates }));
        }
        if (Object.keys(fixedUpdates).length > 0) {
          if (status === "3") {
            setFixedColumnsForSamples((prev) => ({ ...prev, ...fixedUpdates }));
          }
          setFixedColumns((prev) => ({ ...prev, ...fixedUpdates }));
        }
      }

      if (Object.keys(result).length === 0) {
        if (status === "7" || status === "3")
          setStatus("show_user_constraints");
        else if (status === "5") setStatus("show_target_variables");
        else if (status === "6") setStatus("show_query_features");
        return `I couldn't find any specific constraints in your message. Could you please specify which columns you'd like to set constraints for? For example: '${csvHeaders[0]} between 10 and 100' or '${csvHeaders[1]} greater than 18`;
      }

      let response = "I found the following constraints in your message:\n\n";
      for (const [column, constraint] of Object.entries(result)) {
        response += `• ${column}: `;

        // Handle different constraint types based on status
        if (status === "5") {
          // Status 4: Target Variables - Can return "maximize", "minimize", or {min, max} objects
          if (constraint === "maximize") {
            response += `maximize\n`;
          } else if (constraint === "minimize") {
            response += `minimize\n`;
          } else if (typeof constraint === "object" && constraint !== null) {
            // Handle min/max objects
            if (constraint.min !== null && constraint.max !== null) {
              if (constraint.min === constraint.max) {
                response += `set to ${constraint.min}\n`;
              } else {
                response += `between ${constraint.min} and ${constraint.max}\n`;
              }
            } else if (constraint.min !== null) {
              response += `greater than or equal to ${constraint.min}\n`;
            } else if (constraint.max !== null) {
              response += `less than or equal to ${constraint.max}\n`;
            }
          }
        } else if (status === "7" || status === "3") {
          // User Constraints and Fixed Columns
          if (typeof constraint === "object" && constraint !== null) {
            if (constraint.min !== null && constraint.max !== null) {
              if (constraint.min === constraint.max) {
                response += `set to ${constraint.min}\n`;
              } else {
                response += `between ${constraint.min} and ${constraint.max}\n`;
              }
            } else if (constraint.min !== null) {
              response += `greater than or equal to ${constraint.min}\n`;
            } else if (constraint.max !== null) {
              response += `less than or equal to ${constraint.max}\n`;
            }
          } else if (typeof constraint === "string") {
            response += `fixed to ${constraint}\n`;
          } else if (
            typeof constraint === "number" &&
            !Number.isNaN(constraint)
          ) {
            response += `set to ${constraint}\n`;
          }
        } else if (status === "6") {
          // Status 6: User Constraints - Returns boolean true for recommend
          if (constraint === true) {
            response += `recommend\n`;
          }
        }
      }

      response +=
        "\nPlease say done if you are done setting what you are trying to achieve.";

      // response += "\nWould you like me to apply these constraints to your data analysis?"

      return response;
    },
    [csvHeaders, setStatus, status]
  );

  // Define streamText before onSend to avoid circular dependency
  const streamText = useCallback(async (text, onChunk, chunkMs = 15) => {
    const tokens = text.split(/(\s+)/);
    for (const token of tokens) {
      await new Promise((r) => setTimeout(r, chunkMs));
      onChunk(token);
    }
  }, []);

  // Define onSend before handleKeyDown to avoid circular dependency
  const onSend = useCallback(
    async (initialOverride) => {
      const content = (initialOverride ?? input).trim();
      if (!content) return;
      if (!initialOverride) setInput("");

      const userMessage = { id: crypto.randomUUID(), role: "user", content };
      setMessages((prev) => [...prev, userMessage]);

      if (content.includes("done")) {
        if (status !== "") {
          setStatus((parseInt(status) + 1).toString());
        }
        return;
      }

      if (status === "8") {
        if (content.toLowerCase().includes("regression")) {
          setTaskType("Regression");
          setStatus("9");
        } else if (content.toLowerCase().includes("classification")) {
          setTaskType("Classification");
          setStatus("9");
        } else {
          const errorMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `I'm sorry, I didn't understand your response. Please try again.`,
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
        return;
      }

      setIsGenerating(true);
      setPartial("");

      const full = analyzePrompt(content);

      // const full = await callLLM(content)
      try {
        await streamText(full, (chunk) => setPartial((p) => p + chunk));
        const assistantMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: full,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } finally {
        setPartial("");
        setIsGenerating(false);
      }
    },
    [input, analyzePrompt, streamText]
  );

  // Generate placeholder text from quickOptions for status 4, 5, 6
  const generatePlaceholderText = useCallback(() => {
    if (["3", "5", "6", "7"].includes(status) && quickOptions.length > 0) {
      return quickOptions.map((option) => option.text).join(", ");
    }
    return "Message Assistant";
  }, [status, quickOptions]);

  const handleKeyDown = useCallback(
    (e) => {
      if (isChatDisabled) return;

      // Handle Tab key to auto-fill placeholder text
      if (
        e.key === "Tab" &&
        ["3", "5", "6", "7"].includes(status) &&
        quickOptions.length > 0 &&
        input.trim() === ""
      ) {
        e.preventDefault();
        const placeholderText = generatePlaceholderText();
        if (placeholderText !== "Message Assistant") {
          setInput(placeholderText);
        }
        return;
      }

      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !e.altKey &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        if (canSend) onSend();
      }
    },
    [
      canSend,
      onSend,
      isChatDisabled,
      status,
      quickOptions,
      input,
      generatePlaceholderText,
    ]
  );

  const getUserConstraints = useCallback(() => {
    const headerMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Do you have any extra constraints you want me to consider? If you have multiple of them, you can separate them using commas.",
    };
    setMessages((prev) => [...prev, headerMessage]);
  }, []);

  const getTaskType = useCallback(() => {
    const headerMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Is the task going to be a regression or classification?`,
    };
    setMessages((prev) => [...prev, headerMessage]);
  }, []);

  const handleTaskTypeChange = useCallback((newTaskType) => {
    setTaskType(newTaskType);
  }, []);

  const handleAddConstraint = useCallback((newConstraint, column, min, max) => {
    setUserConstraints((prev) => ({
      ...prev,
      ...newConstraint,
    }));

    const confirmMessage1 = {
      id: crypto.randomUUID(),
      role: "user",
      content: `Added constraint for ${column}: min=${min}, max=${max}.`,
    };
    const confirmMessage2 = {
      id: crypto.randomUUID(),
      role: "user",
      content: `You can add more constraints or click "Finish" to proceed.`,
    };
    setMessages((prev) => [...prev, confirmMessage1, confirmMessage2]);
  }, []);

  const handleFinishConstraints = useCallback(() => {
    const finishMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Great! You've set ${userConstraintsCount} constraints.`,
    };
    setMessages((prev) => [...prev, finishMessage]);
    setStatus("8");
  }, [userConstraintsCount, setStatus]);

  const getTarget = useCallback(() => {
    const headerMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `What performance outcome are you trying to achieve?`,
    };
    setMessages((prev) => [...prev, headerMessage]);
  }, []);

  const handleSetTarget = useCallback((newTarget, column, min, max) => {
    setTarget((prev) => ({
      ...prev,
      ...newTarget,
    }));

    const confirmMessage1 = {
      id: crypto.randomUUID(),
      role: "user",
      content: `Added target variable: ${column} with min=${min}, max=${max}.`,
    };
    const confirmMessage2 = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `You can add more targets or click "Finish" to proceed.`,
    };

    setMessages((prev) => [...prev, confirmMessage1, confirmMessage2]);
  }, []);

  const getQueryFeatures = useCallback(() => {
    const headerMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `What features do you want the recommendation to be based on?`,
    };
    setMessages((prev) => [...prev, headerMessage]);
  }, []);

  const handleFinishTargets = useCallback(() => {
    const finishMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Perfect! You've set ${targetCount} target variables.`,
    };
    setMessages((prev) => [...prev, finishMessage]);
    setStatus("6");
  }, [targetCount, setStatus]);

  // Auto get-samples when status === '3'
  useEffect(() => {
    if (status === "3") {
      if (
        Object.keys(userConstraintsForSamples).length === 0 &&
        Object.keys(fixedColumnsForSamples).length === 0
      ) {
        getUserConstraints();
      } else {
        const payload = {
          path: localPath || "test_file",
          count: 5,
          task_type: "regression",
          apply_log: false,
          user_constraints: userConstraintsForSamples,
          fixed_columns: fixedColumnsForSamples,
        };
        fetch("http://127.0.0.1:8000/api/get-samples/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
          .then((res) => res.json().catch(() => ({})))
          .then((data) => {
            if (data && data.samples && setDatasetData) {
              setDatasetData((prev) => ({
                ...(prev || {}),
                samples: data.samples,
              }));
            }
            setStatus("4");
          })
          .catch(() => {
            setStatus("4");
          });
      }
    }
  }, [
    status,
    localPath,
    setDatasetData,
    setStatus,
    userConstraintsForSamples,
    fixedColumnsForSamples,
  ]);

  useEffect(() => {
    if (!inputRef.current) return;
    const el = inputRef.current;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  useEffect(() => {
    if (status === "8") {
      getTaskType();
    }
  }, [status]);

  // Update quick options when status or csvHeaders change
  useEffect(() => {
    const options = generateQuickOptions();
    setQuickOptions(options);
  }, [status, csvHeaders, generateQuickOptions]);

  useEffect(() => {
    if (status === "5") {
      getTarget();
    }
  }, [status, getTarget]);

  useEffect(() => {
    if (status === "6") {
      getQueryFeatures();
    }
  }, [status, getQueryFeatures]);

  useEffect(() => {
    if (status === "7") {
      getUserConstraints();
    }
  }, [status, getUserConstraints]);

  useEffect(() => {
    if (status === "9") {
      const query_structure = {
        key: `${datasetData.fileName}_${queryType}`,
        file_name: localPath,
        is_subset_sampling_enabled: isSubsetSamplingEnabled,
        task_type: taskType,
        dropped_columns: droppedColumns,
        query_type: queryType,
        target: target,
        fixed_columns: fixedColumns,
        user_constraints: userConstraints,
        query_features: queryFeatures,
        ...(samples.length > 0 && { samples: samples }),
      };
      setFinalJson(query_structure);
    }
  }, [
    status,
    localPath,
    taskType,
    droppedColumns,
    queryType,
    target,
    userConstraints,
    setStatus,
    isSubsetSamplingEnabled,
    fixedColumns,
    samples,
  ]);

  useEffect(() => {
    if (status === "10") {
      console.info("Final JSON ready", finalJson);
    }
  }, [status, finalJson]);

  const callLLM = useCallback(async (userText) => {
    try {
      const response = await fetch("/api/a", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userText }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.message || "Sorry, I could not generate a response.";
    } catch (error) {
      console.error("LLM API Error:", error);
      const text = userText.trim().toLowerCase();
      if (text.includes("hello") || text.includes("hi")) {
        return "Hello! I'm having trouble connecting to my AI service, but I can still help with basic questions.";
      }
      return "I'm sorry, I'm having trouble connecting to my AI service right now. Please try again later.";
    }
  }, []);

  const handleColumnToggle = useCallback((column) => {
    setSelectedColumnsToDrop((prev) => {
      if (prev.includes(column)) {
        return prev.filter((col) => col !== column);
      } else {
        return [...prev, column];
      }
    });
  }, []);

  const handleDropColumns = useCallback(() => {
    if (selectedColumnsCount === 0) {
      // User chose to keep all columns
      const keepAllMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: "Keeping all columns. No columns were dropped.",
      };
      setMessages((prev) => [...prev, keepAllMessage]);
    } else {
      // User dropped specific columns
      const remainingHeaders = csvHeaders.filter(
        (header) => !selectedColumnsToDrop.includes(header)
      );

      // Find indices of columns to drop
      const columnsToDropIndices = selectedColumnsToDrop.map((column) =>
        csvHeaders.indexOf(column)
      );

      // Update dataset data by removing dropped columns from sample data
      if (setDatasetData && datasetData) {
        const updatedSampleData = datasetData.sampleData.map((row) =>
          row.filter((_, index) => !columnsToDropIndices.includes(index))
        );

        setDatasetData({
          ...datasetData,
          headers: remainingHeaders,
          sampleData: updatedSampleData,
        });
      }

      setCsvHeaders(remainingHeaders);
      setDroppedColumns(selectedColumnsToDrop);
      const dropMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: `Dropped ${selectedColumnsCount} columns: ${selectedColumnsToDrop.join(
          ", "
        )}. Remaining columns: ${remainingHeaders.join(", ")}.`,
      };
      setMessages((prev) => [...prev, dropMessage]);
    }

    setSelectedColumnsToDrop([]);
    setShowDropColumnSelector(false);
    setStatus("5");
    // setStatus('columns_dropped')
  }, [
    selectedColumnsCount,
    selectedColumnsToDrop,
    csvHeaders,
    setCsvHeaders,
    setStatus,
    setDatasetData,
    datasetData,
  ]);

  const handleCancelDropColumns = useCallback(() => {
    setSelectedColumnsToDrop([]);
    setShowDropColumnSelector(false);
  }, []);

  const handleShowDropColumnSelector = useCallback(() => {
    setShowDropColumnSelector(true);
  }, []);

  if (status === "1") {
    return <OptionsSelector onOptionSelected={handleOptionSelected} />;
  }

  return (
    <div className="chat-box">
      {status === "4" ? (
        <DropColumnSelector
          title="Drop Columns"
          description="Select columns to remove from your dataset"
          columns={csvHeaders}
          onDrop={handleDropColumns}
          onCancel={handleCancelDropColumns}
          selectedColumnsToDrop={selectedColumnsToDrop}
          onColumnToggle={handleColumnToggle}
        />
      ) : (
        <>
          <div className="chat-messages">
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {isGenerating && partial && (
              <MessageBubble role="assistant" content={partial} isStreaming />
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-controls">
            {status === "show_user_constraints" && (
              <ColumnSelector
                title="Set Constraints"
                description="Select columns and specify minimum and maximum values"
                columns={csvHeaders}
                onAdd={handleAddConstraint}
                onFinish={handleFinishConstraints}
                existingItems={userConstraints}
                buttonText="Add Constraint"
                finishButtonText="Finish"
                showFinishButton={true}
                allowMultiple={true}
              />
            )}

            {status === "show_target_variables" && (
              <ColumnSelector
                title="Set Target Variables"
                description="Select target columns and specify their minimum and maximum values"
                columns={csvHeaders}
                onAdd={handleSetTarget}
                onFinish={handleFinishTargets}
                existingItems={target}
                buttonText="Add Target Variable"
                finishButtonText="Finish"
                showFinishButton={true}
                allowMultiple={true}
              />
            )}

            <div className="chat-input-bar">
              {/* Quick options above the textbox */}
              {!isChatDisabled && quickOptions.length > 0 && (
                <div className="quick-options">
                  {quickOptions.map((option, index) => (
                    <button
                      key={index}
                      className="quick-option-btn"
                      onClick={option.action}
                    >
                      {option.text}
                    </button>
                  ))}
                  {/* Done button - enabled if status > 2 */}
                  {parseInt(status) > 2 && parseInt(status) < 8 && (
                    <button
                      className="quick-option-btn done-btn"
                      onClick={handleDoneClick}
                    >
                      Done
                    </button>
                  )}
                </div>
              )}

              <div className="chat-input-container">
                <textarea
                  className="chat-input"
                  placeholder={generatePlaceholderText()}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  ref={inputRef}
                  rows={1}
                  disabled={isChatDisabled}
                  style={{
                    "--placeholder-color":
                      ["4", "5", "6"].includes(status) && quickOptions.length > 0
                        ? "#9ca3af"
                        : "#6b7280",
                  }}
                />
                <button
                  className="send-button"
                  onClick={() => onSend()}
                  disabled={!canSend || isChatDisabled}
                  aria-label="Send"
                >
                  <SendIcon disabled={!canSend} />
                </button>
              </div>
              <div className="chat-disclaimer">
                This is a local demo. No messages are stored.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const MessageBubble = memo(({ role, content, isStreaming }) => {
  const isUser = role === "user";
  return (
    <div className={isUser ? "msg-row user" : "msg-row assistant"}>
      <div className={isUser ? "avatar user" : "avatar assistant"}>
        {isUser ? "🙂" : "🤖"}
      </div>
      <div className={isUser ? "bubble user" : "bubble assistant"}>
        <span>{content}</span>
        {isStreaming ? <span className="cursor">▍</span> : null}
      </div>
    </div>
  );
});

const SendIcon = memo(({ disabled }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={disabled ? "#6b7280" : "#e5e7eb"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
});

export default ChatBox;
