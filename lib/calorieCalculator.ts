export const calculateWeeksToGoal = (timeToGoal: string): number => {
  try {
    let goalDate: Date

    if (timeToGoal.includes(" de ")) {
      const monthMap: { [key: string]: number } = {
        jan: 0,
        fev: 1,
        mar: 2,
        abr: 3,
        mai: 4,
        jun: 5,
        jul: 6,
        ago: 7,
        set: 8,
        out: 9,
        nov: 10,
        dez: 11,
      }

      const parts = timeToGoal.split(" de ")
      if (parts.length === 3) {
        const day = Number.parseInt(parts[0])
        const monthStr = parts[1].toLowerCase().substring(0, 3)
        const year = Number.parseInt(parts[2])
        const month = monthMap[monthStr]

        if (!isNaN(day) && !isNaN(year) && month !== undefined) {
          goalDate = new Date(year, month, day)
        } else {
          return 0
        }
      } else {
        return 0
      }
    } else {
      goalDate = new Date(timeToGoal)
    }

    const currentDate = new Date()
    const timeDifferenceMs = goalDate.getTime() - currentDate.getTime()

    if (isNaN(timeDifferenceMs) || timeDifferenceMs <= 0) {
      return 0
    }

    const weeksToGoal = Math.max(1, timeDifferenceMs / (1000 * 60 * 60 * 24 * 7))
    return Math.round(weeksToGoal)
  } catch (error) {
    console.error("Error calculating weeks to goal:", error)
    return 0
  }
}

export const calculateScientificCalories = (quizData: any) => {
  if (!quizData) return 2200

  const weight = Number.parseFloat(quizData.currentWeight || quizData.weight) || 70
  const height = Number.parseFloat(quizData.height) || 170
  const age = Number.parseFloat(quizData.age) || 25
  const gender = quizData.gender || "masculino"
  const trainingDaysPerWeek = quizData.trainingDaysPerWeek || quizData.trainingDays || 5
  const goals = Array.isArray(quizData.goal) ? quizData.goal : [quizData.goal || "ganhar-massa"]

  const targetWeight = Number.parseFloat(quizData.targetWeight) || weight
  const timeToGoal = quizData.timeToGoal || quizData.dataParaAtingirObjetivo || ""
  const bodyType = quizData.bodyType || quizData.biotype || ""

  const isFemale = gender.toLowerCase().includes("fem") || gender.toLowerCase().includes("mulher")

  // TMB (Mifflin-St Jeor)
  let tmb
  if (isFemale) {
    tmb = 10 * weight + 6.25 * height - 5 * age - 161
  } else {
    tmb = 10 * weight + 6.25 * height - 5 * age + 5
  }

  // Fator de atividade base
  let baseActivityMultiplier
  const trainingDaysNum = Number.parseInt(String(trainingDaysPerWeek))
  if (trainingDaysNum <= 1) {
    baseActivityMultiplier = 1.2
  } else if (trainingDaysNum <= 3) {
    baseActivityMultiplier = 1.375
  } else if (trainingDaysNum <= 5) {
    baseActivityMultiplier = 1.55
  } else if (trainingDaysNum <= 6) {
    baseActivityMultiplier = 1.725
  } else {
    baseActivityMultiplier = 1.9
  }

  // Ajuste do fator de atividade por somatótipo
  let activityMultiplier = baseActivityMultiplier
  if (bodyType.toLowerCase() === "ectomorfo") {
    activityMultiplier = baseActivityMultiplier * 1.05
  } else if (bodyType.toLowerCase() === "endomorfo") {
    activityMultiplier = baseActivityMultiplier * 0.95
  }

  let tdee = tmb * activityMultiplier

  // Ajuste metabólico por somatótipo
  let metabolicAdjustment = 1.0
  if (bodyType.toLowerCase() === "ectomorfo") {
    metabolicAdjustment = isFemale ? 1.12 : 1.15
  } else if (bodyType.toLowerCase() === "endomorfo") {
    metabolicAdjustment = isFemale ? 0.92 : 0.95
  }

  tdee = tdee * metabolicAdjustment

  // Ajuste calórico baseado no objetivo
  let dailyCalorieAdjustment = 0
  const weightDifference = targetWeight - weight

  if (weightDifference < -0.5) {
    // Perda de peso
    const weightToLose = Math.abs(weightDifference)
    if (timeToGoal && weightToLose > 0) {
      const weeksToGoal = calculateWeeksToGoal(timeToGoal)
      if (weeksToGoal > 0) {
        const weeklyWeightChange = weightToLose / weeksToGoal
        let maxWeeklyLoss
        if (bodyType.toLowerCase() === "ectomorfo") {
          maxWeeklyLoss = Math.min(weeklyWeightChange, 0.5)
        } else if (bodyType.toLowerCase() === "endomorfo") {
          maxWeeklyLoss = Math.min(weeklyWeightChange, 1.0)
        } else {
          maxWeeklyLoss = Math.min(weeklyWeightChange, 0.75)
        }
        dailyCalorieAdjustment = -Math.round((maxWeeklyLoss * 7700) / 7)
        const maxDeficit = isFemale
          ? bodyType.toLowerCase() === "endomorfo"
            ? -700
            : -600
          : bodyType.toLowerCase() === "endomorfo"
            ? -900
            : -800
        dailyCalorieAdjustment = Math.max(dailyCalorieAdjustment, maxDeficit)
      } else {
        dailyCalorieAdjustment =
          bodyType.toLowerCase() === "ectomorfo" ? -400 : bodyType.toLowerCase() === "endomorfo" ? -600 : -500
      }
    } else {
      dailyCalorieAdjustment =
        bodyType.toLowerCase() === "ectomorfo" ? -400 : bodyType.toLowerCase() === "endomorfo" ? -600 : -500
    }
  } else if (weightDifference > 0.5) {
    // Ganho de peso
    const weightToGain = weightDifference
    if (timeToGoal && weightToGain > 0) {
      const weeksToGoal = calculateWeeksToGoal(timeToGoal)
      if (weeksToGoal > 0) {
        const weeklyWeightChange = weightToGain / weeksToGoal
        let maxWeeklyGain
        if (bodyType.toLowerCase() === "ectomorfo") {
          maxWeeklyGain = Math.min(weeklyWeightChange, 0.75)
        } else if (bodyType.toLowerCase() === "endomorfo") {
          maxWeeklyGain = Math.min(weeklyWeightChange, 0.4)
        } else {
          maxWeeklyGain = Math.min(weeklyWeightChange, 0.5)
        }
        dailyCalorieAdjustment = Math.round((maxWeeklyGain * 7700) / 7)
        const maxSurplus =
          bodyType.toLowerCase() === "ectomorfo"
            ? isFemale
              ? 700
              : 850
            : bodyType.toLowerCase() === "endomorfo"
              ? isFemale
                ? 400
                : 500
              : isFemale
                ? 500
                : 600
        dailyCalorieAdjustment = Math.min(dailyCalorieAdjustment, maxSurplus)
      } else {
        dailyCalorieAdjustment =
          bodyType.toLowerCase() === "ectomorfo"
            ? isFemale
              ? 600
              : 700
            : bodyType.toLowerCase() === "endomorfo"
              ? isFemale
                ? 300
                : 400
              : isFemale
                ? 400
                : 500
      }
    } else {
      dailyCalorieAdjustment =
        bodyType.toLowerCase() === "ectomorfo"
          ? isFemale
            ? 600
            : 700
          : bodyType.toLowerCase() === "endomorfo"
            ? isFemale
              ? 300
              : 400
            : isFemale
              ? 400
              : 500
    }
  } else {
    // Manutenção/Recomposição
    if (goals.includes("perder-peso") || goals.includes("emagrecer")) {
      dailyCalorieAdjustment = bodyType.toLowerCase() === "endomorfo" ? -400 : -300
    } else if (goals.includes("ganhar-massa") || goals.includes("ganhar-peso")) {
      dailyCalorieAdjustment =
        bodyType.toLowerCase() === "ectomorfo" ? 400 : bodyType.toLowerCase() === "endomorfo" ? 200 : 300
    }
  }

  const finalCalories = Math.round(tdee + dailyCalorieAdjustment)
  let safeCalories = finalCalories

  // Limites de segurança
  const minCaloriesWomen = trainingDaysNum >= 4 ? 1400 : 1200
  const minCaloriesMen = trainingDaysNum >= 4 ? 1600 : 1400
  const absoluteMinimum = isFemale ? minCaloriesWomen : minCaloriesMen

  if (safeCalories < absoluteMinimum) {
    safeCalories = absoluteMinimum
  }

  if (safeCalories < tmb * 1.1) {
    safeCalories = Math.round(tmb * 1.1)
  }

  return safeCalories
}
