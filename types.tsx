export interface Food {
  name: string
  quantity: string
  calories: number
}

export interface Meal {
  name: string
  time: string
  foods: string[] | Food[]
  calories: string
  macros: {
    protein: string
    carbs: string
    fats: string
  }
}

export interface DietPlan {
  title: string
  calories: string
  protein: string
  carbs: string
  fats: string
  meals: Meal[]
  tips?: string[]
  totalDailyCalories?: string
  totalProtein?: string
  totalCarbs?: string
  totalFats?: string
}

export interface UserData {
  dietPlan?: DietPlan
  workoutPlan?: any
  quizData?: any
}

export interface QuizData {
  name: string
  age: number
  gender: string
  currentWeight: number
  height: number
  goal: string
  bodyType: string
  trainingDaysPerWeek: number
  experience: string
  workoutTime: string
  waterIntake: string
  dietPreferences: string
  allergyDetails: string
  wantsSupplement: string
  supplementType?: string
  // </CHANGE>
  completedAt: string
  createdAt: string
}
