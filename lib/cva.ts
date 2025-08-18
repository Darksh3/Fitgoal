export type VariantProps<T> = T extends (...args: any[]) => any ? Parameters<T>[0] : never

export function cva(
  base: string,
  config?: {
    variants?: Record<string, Record<string, string>>
    compoundVariants?: Array<Record<string, any> & { class: string }>
    defaultVariants?: Record<string, any>
  },
) {
  return (props?: Record<string, any>) => {
    let classes = base

    if (config?.variants && props) {
      for (const [key, value] of Object.entries(props)) {
        if (config.variants[key] && config.variants[key][value]) {
          classes += ` ${config.variants[key][value]}`
        }
      }
    }

    if (config?.compoundVariants && props) {
      for (const compound of config.compoundVariants) {
        const { class: compoundClass, ...conditions } = compound
        const matches = Object.entries(conditions).every(([key, value]) => props[key] === value)
        if (matches) {
          classes += ` ${compoundClass}`
        }
      }
    }

    return classes.trim()
  }
}
