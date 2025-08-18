"use client"

import { useState, useCallback, useEffect } from "react"
import { z } from "zod"

interface ValidationOptions {
  validateOnChange?: boolean
  validateOnBlur?: boolean
  debounceMs?: number
  asyncValidation?: boolean
}

interface FieldState {
  value: any
  error: string | null
  touched: boolean
  validating: boolean
}

export function useFormValidation<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  initialValues: Partial<T> = {},
  options: ValidationOptions = {},
) {
  const { validateOnChange = true, validateOnBlur = true, debounceMs = 300, asyncValidation = false } = options

  const [fields, setFields] = useState<Record<string, FieldState>>(() => {
    const initialFields: Record<string, FieldState> = {}
    Object.keys(initialValues).forEach((key) => {
      initialFields[key] = {
        value: initialValues[key] || "",
        error: null,
        touched: false,
        validating: false,
      }
    })
    return initialFields
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitCount, setSubmitCount] = useState(0)

  // Debounced validation
  const [validationTimeouts, setValidationTimeouts] = useState<Record<string, NodeJS.Timeout>>({})

  const validateField = useCallback(
    async (fieldName: string, value: any): Promise<string | null> => {
      try {
        // Create a partial schema for single field validation
        const fieldSchema = schema.pick({ [fieldName]: true } as any)
        await fieldSchema.parseAsync({ [fieldName]: value })
        return null
      } catch (error) {
        if (error instanceof z.ZodError) {
          return error.errors[0]?.message || "Valor inválido"
        }
        return "Erro de validação"
      }
    },
    [schema],
  )

  const validateAllFields = useCallback(async (): Promise<boolean> => {
    const values = Object.keys(fields).reduce(
      (acc, key) => {
        acc[key] = fields[key].value
        return acc
      },
      {} as Record<string, any>,
    )

    try {
      await schema.parseAsync(values)

      // Clear all errors
      setFields((prev) =>
        Object.keys(prev).reduce(
          (acc, key) => {
            acc[key] = { ...prev[key], error: null }
            return acc
          },
          {} as Record<string, FieldState>,
        ),
      )

      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMap: Record<string, string> = {}
        error.errors.forEach((err) => {
          const fieldName = err.path[0] as string
          if (fieldName) {
            errorMap[fieldName] = err.message
          }
        })

        setFields((prev) =>
          Object.keys(prev).reduce(
            (acc, key) => {
              acc[key] = {
                ...prev[key],
                error: errorMap[key] || null,
                touched: true,
              }
              return acc
            },
            {} as Record<string, FieldState>,
          ),
        )
      }
      return false
    }
  }, [fields, schema])

  const setFieldValue = useCallback(
    (fieldName: string, value: any) => {
      setFields((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          value,
          touched: true,
        },
      }))

      if (validateOnChange) {
        // Clear existing timeout
        if (validationTimeouts[fieldName]) {
          clearTimeout(validationTimeouts[fieldName])
        }

        // Set new timeout for debounced validation
        const timeout = setTimeout(async () => {
          setFields((prev) => ({
            ...prev,
            [fieldName]: {
              ...prev[fieldName],
              validating: true,
            },
          }))

          const error = await validateField(fieldName, value)

          setFields((prev) => ({
            ...prev,
            [fieldName]: {
              ...prev[fieldName],
              error,
              validating: false,
            },
          }))
        }, debounceMs)

        setValidationTimeouts((prev) => ({
          ...prev,
          [fieldName]: timeout,
        }))
      }
    },
    [validateOnChange, validateField, debounceMs, validationTimeouts],
  )

  const setFieldError = useCallback((fieldName: string, error: string | null) => {
    setFields((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        error,
      },
    }))
  }, [])

  const setFieldTouched = useCallback(
    async (fieldName: string, touched = true) => {
      setFields((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          touched,
        },
      }))

      if (validateOnBlur && touched) {
        const error = await validateField(fieldName, fields[fieldName]?.value)
        setFieldError(fieldName, error)
      }
    },
    [validateOnBlur, validateField, fields, setFieldError],
  )

  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => void | Promise<void>) => {
      setIsSubmitting(true)
      setSubmitCount((prev) => prev + 1)

      try {
        const isValid = await validateAllFields()

        if (isValid) {
          const values = Object.keys(fields).reduce(
            (acc, key) => {
              acc[key] = fields[key].value
              return acc
            },
            {} as Record<string, any>,
          ) as T

          await onSubmit(values)
        }
      } catch (error) {
        console.error("Form submission error:", error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [fields, validateAllFields],
  )

  const resetForm = useCallback((newValues: Partial<T> = {}) => {
    setFields((prev) =>
      Object.keys(prev).reduce(
        (acc, key) => {
          acc[key] = {
            value: newValues[key] || "",
            error: null,
            touched: false,
            validating: false,
          }
          return acc
        },
        {} as Record<string, FieldState>,
      ),
    )
    setSubmitCount(0)
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(validationTimeouts).forEach(clearTimeout)
    }
  }, [validationTimeouts])

  const getFieldProps = useCallback(
    (fieldName: string) => ({
      value: fields[fieldName]?.value || "",
      onChange: (value: any) => setFieldValue(fieldName, value),
      onBlur: () => setFieldTouched(fieldName, true),
      error: fields[fieldName]?.error,
      touched: fields[fieldName]?.touched || false,
      validating: fields[fieldName]?.validating || false,
    }),
    [fields, setFieldValue, setFieldTouched],
  )

  const isValid = Object.values(fields).every((field) => !field.error)
  const hasErrors = Object.values(fields).some((field) => field.error)
  const isValidating = Object.values(fields).some((field) => field.validating)

  return {
    fields,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    getFieldProps,
    handleSubmit,
    resetForm,
    validateAllFields,
    isValid,
    hasErrors,
    isValidating,
    isSubmitting,
    submitCount,
  }
}

export function useFieldValidation(
  fieldName: string,
  schema: z.ZodSchema,
  options: { debounceMs?: number; asyncValidator?: (value: any) => Promise<string | null> } = {},
) {
  const { debounceMs = 300, asyncValidator } = options
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [validating, setValidating] = useState(false)

  const validate = useCallback(
    async (val: any) => {
      setValidating(true)

      try {
        await schema.parseAsync(val)

        if (asyncValidator) {
          const asyncError = await asyncValidator(val)
          setError(asyncError)
        } else {
          setError(null)
        }
      } catch (err) {
        if (err instanceof z.ZodError) {
          setError(err.errors[0]?.message || "Valor inválido")
        } else {
          setError("Erro de validação")
        }
      } finally {
        setValidating(false)
      }
    },
    [schema, asyncValidator],
  )

  const debouncedValidate = useCallback(
    (val: any) => {
      const timeout = setTimeout(() => validate(val), debounceMs)
      return () => clearTimeout(timeout)
    },
    [validate, debounceMs],
  )

  const handleChange = useCallback(
    (newValue: any) => {
      setValue(newValue)
      setTouched(true)
      debouncedValidate(newValue)
    },
    [debouncedValidate],
  )

  const handleBlur = useCallback(() => {
    setTouched(true)
    validate(value)
  }, [validate, value])

  return {
    value,
    error,
    touched,
    validating,
    onChange: handleChange,
    onBlur: handleBlur,
    isValid: !error && touched,
  }
}
