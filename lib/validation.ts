"use client"

import { z } from "zod"

export const emailSchema = z
  .string()
  .min(1, "Email é obrigatório")
  .email("Email inválido")
  .max(254, "Email muito longo")
  .refine((email) => {
    // Additional email validation
    const parts = email.split("@")
    if (parts.length !== 2) return false
    const [local, domain] = parts
    return local.length <= 64 && domain.length <= 253
  }, "Formato de email inválido")

export const phoneSchema = z
  .string()
  .min(10, "Telefone deve ter pelo menos 10 dígitos")
  .max(15, "Telefone deve ter no máximo 15 dígitos")
  .regex(/^[\d\s\-()++]+$/, "Formato de telefone inválido")
  .transform((phone) => phone.replace(/\D/g, ""))
  .refine((phone) => phone.length >= 10 && phone.length <= 11, "Número de telefone inválido")

export const cpfSchema = z
  .string()
  .min(11, "CPF deve ter 11 dígitos")
  .max(14, "CPF inválido")
  .regex(/^[\d.-]+$/, "CPF deve conter apenas números, pontos e hífens")
  .transform((cpf) => cpf.replace(/\D/g, ""))
  .refine((cpf) => isValidCPFAlgorithm(cpf), "CPF inválido")

export const nameSchema = z
  .string()
  .min(2, "Nome deve ter pelo menos 2 caracteres")
  .max(100, "Nome deve ter no máximo 100 caracteres")
  .regex(/^[a-zA-ZÀ-ÿ\s'.-]+$/, "Nome deve conter apenas letras, espaços e caracteres válidos")
  .refine((name) => {
    const words = name.trim().split(/\s+/)
    return words.length >= 2 && words.every((word) => word.length >= 1)
  }, "Nome deve conter pelo menos nome e sobrenome")

export const passwordSchema = z
  .string()
  .min(8, "Senha deve ter pelo menos 8 caracteres")
  .max(128, "Senha muito longa")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    "Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial",
  )

export const weightSchema = z
  .number()
  .min(30, "Peso deve ser pelo menos 30kg")
  .max(300, "Peso deve ser no máximo 300kg")
  .refine((weight) => Number.isFinite(weight) && weight % 0.1 === 0, "Peso deve ter no máximo 1 casa decimal")

export const heightSchema = z
  .number()
  .min(100, "Altura deve ser pelo menos 100cm")
  .max(250, "Altura deve ser no máximo 250cm")
  .refine((height) => Number.isInteger(height), "Altura deve ser um número inteiro")

export const ageSchema = z
  .number()
  .min(16, "Idade deve ser pelo menos 16 anos")
  .max(100, "Idade deve ser no máximo 100 anos")
  .refine((age) => Number.isInteger(age), "Idade deve ser um número inteiro")

export const creditCardSchema = z.object({
  number: z
    .string()
    .regex(/^\d{13,19}$/, "Número do cartão inválido")
    .refine((number) => luhnCheck(number), "Número do cartão inválido"),
  expiryMonth: z.number().min(1, "Mês inválido").max(12, "Mês inválido"),
  expiryYear: z
    .number()
    .min(new Date().getFullYear(), "Ano de expiração inválido")
    .max(new Date().getFullYear() + 20, "Ano de expiração muito distante"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV inválido"),
  holderName: nameSchema,
})

export const addressSchema = z.object({
  street: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres").max(200, "Endereço muito longo"),
  number: z.string().min(1, "Número é obrigatório").max(10, "Número muito longo"),
  complement: z.string().max(100, "Complemento muito longo").optional(),
  neighborhood: z.string().min(2, "Bairro deve ter pelo menos 2 caracteres").max(100, "Bairro muito longo"),
  city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres").max(100, "Cidade muito longa"),
  state: z
    .string()
    .length(2, "Estado deve ter 2 caracteres")
    .regex(/^[A-Z]{2}$/, "Estado inválido"),
  zipCode: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, "CEP inválido")
    .transform((cep) => cep.replace(/\D/g, "")),
})

export const quizDataSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    age: ageSchema,
    gender: z.enum(["homem", "mulher"], { required_error: "Selecione o gênero" }),
    height: heightSchema,
    currentWeight: weightSchema,
    targetWeight: weightSchema,
    bodyType: z.enum(["ectomorfo", "mesomorfo", "endomorfo"], { required_error: "Selecione o tipo corporal" }),
    goal: z.array(z.string()).min(1, "Selecione pelo menos um objetivo"),
    experience: z.enum(["iniciante", "intermediario", "avancado"], {
      required_error: "Selecione o nível de experiência",
    }),
    trainingDaysPerWeek: z.number().min(1).max(7),
    workoutTime: z.string().min(1, "Selecione o tempo de treino"),
    equipment: z.array(z.string()).optional(),
    allergies: z.enum(["sim", "nao"]).optional(),
    allergyDetails: z.string().optional(),
    timeToGoal: z.string().optional(),
    eventDate: z.string().optional(),
  })
  .refine(
    (data) => {
      // Cross-field validation: target weight should be realistic
      const weightDiff = Math.abs(data.targetWeight - data.currentWeight)
      const maxReasonableChange = data.currentWeight * 0.3 // 30% of current weight
      return weightDiff <= maxReasonableChange
    },
    {
      message: "Meta de peso muito distante do peso atual",
      path: ["targetWeight"],
    },
  )
  .refine(
    (data) => {
      // If allergies = "sim", allergyDetails should be provided
      return data.allergies !== "sim" || (data.allergyDetails && data.allergyDetails.trim().length > 0)
    },
    {
      message: "Descreva suas alergias",
      path: ["allergyDetails"],
    },
  )

export const paymentFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  cpf: cpfSchema,
})

export function validateQuizData(data: unknown) {
  try {
    return {
      success: true,
      data: quizDataSchema.parse(data),
      errors: null,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.reduce(
          (acc, err) => {
            const path = err.path.join(".")
            acc[path] = err.message
            return acc
          },
          {} as Record<string, string>,
        ),
      }
    }
    return {
      success: false,
      data: null,
      errors: { general: "Erro de validação desconhecido" },
    }
  }
}

export function validatePaymentForm(data: unknown) {
  try {
    return {
      success: true,
      data: paymentFormSchema.parse(data),
      errors: null,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.reduce(
          (acc, err) => {
            const path = err.path.join(".")
            acc[path] = err.message
            return acc
          },
          {} as Record<string, string>,
        ),
      }
    }
    return {
      success: false,
      data: null,
      errors: { general: "Erro de validação desconhecido" },
    }
  }
}

export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/&lt;script&gt;/gi, "")
    .replace(/&lt;\/script&gt;/gi, "")
}

export function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .replace(/[<>'"]/g, "")
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

export function sanitizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, "")
}

export function sanitizeHTML(input: string): string {
  const div = document.createElement("div")
  div.textContent = input
  return div.innerHTML
}

export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success
}

export function isValidPhone(phone: string): boolean {
  return phoneSchema.safeParse(phone).success
}

export function isValidCPF(cpf: string): boolean {
  const cleanCPF = sanitizeCPF(cpf)
  return isValidCPFAlgorithm(cleanCPF)
}

function isValidCPFAlgorithm(cpf: string): boolean {
  if (cpf.length !== 11) return false

  // Check for repeated digits
  if (/^(\d)\1{10}$/.test(cpf)) return false

  // Validate CPF algorithm
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(cpf.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cpf.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(cpf.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cpf.charAt(10))) return false

  return true
}

function luhnCheck(cardNumber: string): boolean {
  let sum = 0
  let isEven = false

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = Number.parseInt(cardNumber.charAt(i))

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

export function getPasswordStrength(password: string): {
  score: number
  feedback: string[]
  isStrong: boolean
} {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score += 1
  else feedback.push("Use pelo menos 8 caracteres")

  if (/[a-z]/.test(password)) score += 1
  else feedback.push("Adicione letras minúsculas")

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push("Adicione letras maiúsculas")

  if (/\d/.test(password)) score += 1
  else feedback.push("Adicione números")

  if (/[@$!%*?&]/.test(password)) score += 1
  else feedback.push("Adicione caracteres especiais (@$!%*?&)")

  if (password.length >= 12) score += 1

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 1
    feedback.push("Evite repetir caracteres")
  }

  if (/123|abc|qwe/i.test(password)) {
    score -= 1
    feedback.push("Evite sequências óbvias")
  }

  return {
    score: Math.max(0, Math.min(5, score)),
    feedback,
    isStrong: score >= 4,
  }
}

export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, "")
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  }
  return phone
}

export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, "")
  return cleaned.replace(/(\d{5})(\d{3})/, "$1-$2")
}

export function formatCreditCard(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, "")
  return cleaned.replace(/(\d{4})(?=\d)/g, "$1 ")
}

export async function validateEmailAvailability(email: string): Promise<boolean> {
  try {
    const response = await fetch("/api/validate-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    const result = await response.json()
    return result.available
  } catch (error) {
    console.error("Email validation error:", error)
    return true // Assume available on error
  }
}

export async function validateCEP(cep: string): Promise<{
  valid: boolean
  address?: {
    street: string
    neighborhood: string
    city: string
    state: string
  }
}> {
  try {
    const cleanCEP = cep.replace(/\D/g, "")
    if (cleanCEP.length !== 8) return { valid: false }

    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`)
    const data = await response.json()

    if (data.erro) return { valid: false }

    return {
      valid: true,
      address: {
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
      },
    }
  } catch (error) {
    console.error("CEP validation error:", error)
    return { valid: false }
  }
}

export const customValidationRules = {
  uniqueEmail: (email: string) => validateEmailAvailability(email),
  strongPassword: (password: string) => getPasswordStrength(password).isStrong,
  validCEP: (cep: string) => validateCEP(cep).then((result) => result.valid),
  minimumAge: (birthDate: string, minAge: number) => {
    const birth = new Date(birthDate)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 >= minAge
    }
    return age >= minAge
  },
}
