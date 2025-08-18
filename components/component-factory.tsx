"use client"

import type React from "react"
import { DefaultComponentFactory } from "@/lib/architecture"

// Component registry for dynamic component creation
const componentFactory = new DefaultComponentFactory()

// Base component interfaces
interface BaseComponentProps {
  id?: string
  className?: string
  children?: React.ReactNode
}

// Dynamic button component
const DynamicButton: React.FC<
  BaseComponentProps & {
    variant?: "primary" | "secondary" | "danger"
    onClick?: () => void
  }
> = ({ variant = "primary", onClick, children, className = "" }) => {
  const baseClasses = "px-4 py-2 rounded font-medium transition-colors"
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} onClick={onClick}>
      {children}
    </button>
  )
}

// Dynamic card component
const DynamicCard: React.FC<
  BaseComponentProps & {
    title?: string
    footer?: React.ReactNode
  }
> = ({ title, footer, children, className = "" }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="mb-4">{children}</div>
      {footer && <div className="border-t pt-4">{footer}</div>}
    </div>
  )
}

// Dynamic form field component
const DynamicFormField: React.FC<
  BaseComponentProps & {
    type?: "text" | "email" | "password" | "number"
    label?: string
    placeholder?: string
    value?: string
    onChange?: (value: string) => void
    error?: string
  }
> = ({ type = "text", label, placeholder, value, onChange, error, className = "" }) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
}

// Register components
componentFactory.register("button", DynamicButton)
componentFactory.register("card", DynamicCard)
componentFactory.register("form-field", DynamicFormField)

// Component factory hook
export const useComponentFactory = () => {
  const createComponent = (type: string, props: any) => {
    try {
      const Component = componentFactory.create(type, props)
      return Component
    } catch (error) {
      console.error(`Failed to create component of type ${type}:`, error)
      return null
    }
  }

  return { createComponent, factory: componentFactory }
}

// Dynamic component renderer
export const DynamicComponent: React.FC<{
  type: string
  props?: any
  fallback?: React.ComponentType<any>
}> = ({ type, props = {}, fallback: Fallback }) => {
  const { createComponent } = useComponentFactory()

  try {
    const Component = createComponent(type, props)
    if (!Component) {
      return Fallback ? <Fallback {...props} /> : <div>Component not found: {type}</div>
    }
    return <Component {...props} />
  } catch (error) {
    console.error("Error rendering dynamic component:", error)
    return Fallback ? <Fallback {...props} /> : <div>Error loading component</div>
  }
}

export default componentFactory
