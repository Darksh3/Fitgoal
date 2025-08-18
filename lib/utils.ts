export type ClassValue = string | number | boolean | undefined | null | ClassArray | ClassDictionary

interface ClassDictionary {
  [id: string]: any
}

interface ClassArray extends Array<ClassValue> {}

export function clsx(...inputs: ClassValue[]): string {
  const classes: string[] = []

  for (const input of inputs) {
    if (!input) continue

    if (typeof input === "string" || typeof input === "number") {
      classes.push(String(input))
    } else if (Array.isArray(input)) {
      const result = clsx(...input)
      if (result) classes.push(result)
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key)
      }
    }
  }

  return classes.join(" ")
}

// Simple tailwind-merge replacement
export function twMerge(input: string): string {
  return input
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs))
}
