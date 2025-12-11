const currentStep = 0 // Declare currentStep variable
const quizData = {
  weightChangeType: "",
  bodyFat: 0,
  diet: "",
} // Declare quizData variable

const canProceed = (): boolean => {
  switch (currentStep) {
    case 5: // New case for weight change question
      return quizData.weightChangeType !== ""
    case 6: // Body fat percentage question
      return quizData.bodyFat !== 0
    case 7: // Renumbered from case 5
      return quizData.diet !== ""
    default:
      return false // Default case to ensure a boolean return
  }
}

// ... rest of code here ...

export default canProceed // Ensure there is a default export
