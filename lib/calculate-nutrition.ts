export const calculateNutrition = (userData: any) => {
  const weight = Number.parseFloat(userData?.currentWeight || userData?.weight) || 70
  const height = Number.parseFloat(userData?.height) || 175
  const age = Number.parseInt(userData?.age) || 25
  const gender = userData?.gender || "masculino"
  const trainingDays = Number.parseInt(userData?.trainingDaysPerWeek) || 5
  const goal = userData?.goal || "Ganho de massa muscular"
  const bodyType = userData?.bodyType || "mesomorfo"
  const targetWeight = Number.parseFloat(userData?.targetWeight) || weight + 8
  const timeToGoal = userData?.timeToGoal || "26 de nov. de 2025"

  // 1. TMB (Taxa Metabólica Basal)
  let tmb: number
  if (gender.toLowerCase() === "feminino" || gender === "mulher") {
    tmb = 10 * weight + 6.25 * height - 5 * age - 161
  } else {
    tmb = 10 * weight + 6.25 * height - 5 * age + 5
  }

  // 2. TDEE (Total Daily Energy Expenditure)
  let activityMultiplier: number
  if (trainingDays <= 2) {
    activityMultiplier = 1.2
  } else if (trainingDays >= 6) {
    activityMultiplier = 2.0
  } else {
    activityMultiplier = 1.6
  }

  let tdee = tmb * activityMultiplier

  if (bodyType === "ectomorfo") {
    tdee *= 1.1
  } else if (bodyType === "endomorfo") {
    tdee *= 0.95
  }

  let calorieAdjustment = 0
  if (goal.toLowerCase().includes("ganho") || goal.toLowerCase().includes("massa")) {
    const weightDifference = targetWeight - weight

    const targetDate = new Date(
      timeToGoal.replace(/(\d+) de (\w+)\. de (\d+)/, (match, day, month, year) => {
        const months: { [key: string]: string } = {
          jan: "01",
          fev: "02",
          mar: "03",
          abr: "04",
          mai: "05",
          jun: "06",
          jul: "07",
          ago: "08",
          set: "09",
          out: "10",
          nov: "11",
          dez: "12",
        }
        return `${year}-${months[month]}-${day.padStart(2, "0")}`
      }),
    )

    const currentDate = new Date()
    const weeksToGoal = Math.max(
      1,
      Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 7)),
    )

    const weeklyGainNeeded = Math.max(0.2, weightDifference / weeksToGoal)
    calorieAdjustment = Math.round((weeklyGainNeeded * 7700) / 7)
  } else if (goal.toLowerCase().includes("perda") || goal.toLowerCase().includes("emagrecer")) {
    const weightDifference = weight - targetWeight

    const targetDate = new Date(
      timeToGoal.replace(/(\d+) de (\w+)\. de (\d+)/, (match, day, month, year) => {
        const months: { [key: string]: string } = {
          jan: "01",
          fev: "02",
          mar: "03",
          abr: "04",
          mai: "05",
          jun: "06",
          jul: "07",
          ago: "08",
          set: "09",
          out: "10",
          nov: "11",
          dez: "12",
        }
        return `${year}-${months[month]}-${day.padStart(2, "0")}`
      }),
    )

    const currentDate = new Date()
    const weeksToGoal = Math.max(
      4,
      Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 7)),
    )

    const weeklyLossNeeded = Math.min(1.0, Math.max(0.3, weightDifference / weeksToGoal))
    const calculatedDeficit = Math.round((weeklyLossNeeded * 7700) / 7)
    calorieAdjustment = -Math.min(1300, Math.max(200, calculatedDeficit))
  }

  return Math.round(tdee + calorieAdjustment)
}
