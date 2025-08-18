"use client"

import { useState, useEffect, useCallback } from "react"
import { useTimer } from "@/lib/performance-monitor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Square, RotateCcw } from "@/lib/icons"

interface WorkoutTimerProps {
  exerciseName?: string
  sets?: number
  reps?: number
  restTime?: number
  onComplete?: (duration: number) => void
}

export function WorkoutTimer({
  exerciseName = "Exercise",
  sets = 3,
  reps = 10,
  restTime = 60,
  onComplete,
}: WorkoutTimerProps) {
  const { startTimer, stopTimer, getTimer } = useTimer()
  const [currentTimerId, setCurrentTimerId] = useState<string | null>(null)
  const [currentSet, setCurrentSet] = useState(1)
  const [isResting, setIsResting] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [restTimeLeft, setRestTimeLeft] = useState(0)
  const [isActive, setIsActive] = useState(false)

  // Update elapsed time for active timer
  useEffect(() => {
    if (!currentTimerId || !isActive) return

    const interval = setInterval(() => {
      const timer = getTimer(currentTimerId)
      if (timer && !timer.endTime) {
        setElapsedTime(Date.now() - timer.startTime)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [currentTimerId, isActive, getTimer])

  // Rest timer countdown
  useEffect(() => {
    if (!isResting || restTimeLeft <= 0) return

    const interval = setInterval(() => {
      setRestTimeLeft((prev) => {
        if (prev <= 1000) {
          setIsResting(false)
          return 0
        }
        return prev - 1000
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isResting, restTimeLeft])

  const startExercise = useCallback(() => {
    const timerId = startTimer(`${exerciseName} - Set ${currentSet}`, "exercise", {
      exercise: exerciseName,
      set: currentSet,
      reps,
    })
    setCurrentTimerId(timerId)
    setIsActive(true)
  }, [exerciseName, currentSet, reps, startTimer])

  const pauseExercise = useCallback(() => {
    setIsActive(false)
  }, [])

  const resumeExercise = useCallback(() => {
    setIsActive(true)
  }, [])

  const completeSet = useCallback(() => {
    if (currentTimerId) {
      const completedTimer = stopTimer(currentTimerId)
      setIsActive(false)
      setCurrentTimerId(null)

      if (currentSet < sets) {
        // Start rest period
        setIsResting(true)
        setRestTimeLeft(restTime * 1000)
        setCurrentSet((prev) => prev + 1)
      } else {
        // Workout complete
        if (onComplete && completedTimer) {
          const totalDuration = completedTimer.duration || 0
          onComplete(totalDuration)
        }
        resetTimer()
      }
    }
  }, [currentTimerId, currentSet, sets, restTime, stopTimer, onComplete])

  const resetTimer = useCallback(() => {
    if (currentTimerId) {
      stopTimer(currentTimerId)
    }
    setCurrentTimerId(null)
    setCurrentSet(1)
    setIsResting(false)
    setElapsedTime(0)
    setRestTimeLeft(0)
    setIsActive(false)
  }, [currentTimerId, stopTimer])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">{exerciseName}</CardTitle>
        <div className="flex justify-center gap-4 text-sm text-muted-foreground">
          <span>Sets: {sets}</span>
          <span>Reps: {reps}</span>
          <span>Rest: {restTime}s</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="text-center space-y-2">
          <div className="text-3xl font-mono font-bold">{formatTime(elapsedTime)}</div>
          <div className="flex justify-center gap-2">
            <Badge variant="outline">
              Set {currentSet} of {sets}
            </Badge>
            {isResting && <Badge variant="secondary">Rest: {Math.ceil(restTimeLeft / 1000)}s</Badge>}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(((currentSet - 1) / sets) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentSet - 1) / sets) * 100}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          {!isActive && !isResting && currentSet <= sets && (
            <Button onClick={startExercise} className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              {currentTimerId ? "Resume" : "Start"}
            </Button>
          )}

          {isActive && (
            <>
              <Button onClick={pauseExercise} variant="outline" className="flex items-center gap-2 bg-transparent">
                <Pause className="w-4 h-4" />
                Pause
              </Button>
              <Button onClick={completeSet} className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                Complete Set
              </Button>
            </>
          )}

          {!isActive && currentTimerId && (
            <Button onClick={resumeExercise} className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Resume
            </Button>
          )}

          <Button onClick={resetTimer} variant="outline" className="flex items-center gap-2 bg-transparent">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>

        {/* Rest Period */}
        {isResting && (
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold text-blue-700">Rest Time</div>
            <div className="text-2xl font-mono font-bold text-blue-800">{Math.ceil(restTimeLeft / 1000)}s</div>
            <div className="text-sm text-blue-600 mt-2">Prepare for Set {currentSet}</div>
          </div>
        )}

        {/* Completion */}
        {currentSet > sets && (
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-700">Workout Complete!</div>
            <div className="text-sm text-green-600 mt-2">Great job completing all {sets} sets!</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
