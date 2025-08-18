"use client"

import { z } from "zod"

// Common validation schemas
export const emailSchema = z.string().email("Email inválido")

export const phoneSchema = z
  .string()
  .min(10, "Telefone deve ter pelo menos 10 dígitos")
  .max(15, "Telefone deve ter no máximo 15 dígitos")
  .regex(/^[\d\s\-$$$$+]+$/, "Formato de telefone inválido")

export const cpfSchema = z
  .string()
  .min(11, "CPF deve ter 11 dígitos")
  .max(14, "CPF inválido")
  .regex(/^[\d.-]+$/, "CPF deve conter apenas números, pontos e hífens")

export const nameSchema = z
  .string()
  .min(2, "Nome deve ter pelo menos 2 caracteres")
  .max(100, "Nome deve ter no máximo 100 caracteres")
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços")

export const weightSchema = z
  .number()
  .min(30, "Peso deve ser pelo menos 30kg")
  .max(300, "Peso deve ser no máximo 300kg")

export const heightSchema = z
  .number()
  .min(100, "Altura deve ser pelo menos 100cm")
  .max(250, "Altura deve ser no máximo 250cm")

export const ageSchema = z
  .number()
  .min(16, "Idade deve ser pelo menos 16 anos")
  .max(100, "Idade deve ser no máximo 100 anos")

// Quiz data validation schema
export const quizDataSchema = z.object({
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

// Payment form validation schema
export const paymentFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  cpf: cpfSchema,
})

// Validation helper functions
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

// Sanitization functions
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, "")
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

export function sanitizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, "")
}

// Format validation helpers
export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success
}

export function isValidPhone(phone: string): boolean {
  return phoneSchema.safeParse(phone).success
}

export function isValidCPF(cpf: string): boolean {
  const cleanCPF = sanitizeCPF(cpf)

  if (cleanCPF.length !== 11) return false

  // Check for repeated digits
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false

  // Validate CPF algorithm
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cleanCPF.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cleanCPF.charAt(10))) return false

  return true
}
