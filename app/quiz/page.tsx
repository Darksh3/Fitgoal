"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"

const QuizPage = () => {
  const [showQuickResults, setShowQuickResults] = useState(true)
  const [showAnalyzingData, setShowAnalyzingData] = useState(true)
  const [analyzingStep, setAnalyzingStep] = useState(0)
  const messages = ["message1", "message2"]

  const showAnalyzingDataMessage = showAnalyzingData && analyzingStep < messages.length

  useEffect(() => {
    const timer = setInterval(() => {
      setAnalyzingStep((prevStep) => prevStep + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (showQuickResults) {
    const musclePts: Array<[number, number]> = [
      [0, 250],
      [100, 200],
    ]

    return (
      <div>
        <h1>Quiz Page</h1>
        {showAnalyzingDataMessage && <p>Analyzing data...</p>}
        <Card>
          <h2>Quick Results</h2>
          <ul>
            {musclePts.map(([score, points], index) => (
              <li key={index}>
                Score: {score}, Points: {points}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <h1>Quiz Page</h1>
      {showAnalyzingDataMessage && <p>Analyzing data...</p>}
    </div>
  )
}

export default QuizPage
