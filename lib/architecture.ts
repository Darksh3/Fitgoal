import type React from "react"
/**
 * Architecture utilities for maintaining code quality and design patterns
 */

export interface ServiceInterface {
  name: string
  version: string
  initialize(): Promise<void>
  destroy(): Promise<void>
}

export class ArchitectureManager {
  private services: Map<string, ServiceInterface> = new Map()
  private initialized = false

  async registerService(service: ServiceInterface): Promise<void> {
    if (this.services.has(service.name)) {
      throw new Error(`Service ${service.name} already registered`)
    }

    this.services.set(service.name, service)

    if (this.initialized) {
      await service.initialize()
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    for (const service of this.services.values()) {
      await service.initialize()
    }

    this.initialized = true
  }

  async destroy(): Promise<void> {
    for (const service of this.services.values()) {
      await service.destroy()
    }

    this.services.clear()
    this.initialized = false
  }

  getService<T extends ServiceInterface>(name: string): T | null {
    return (this.services.get(name) as T) || null
  }
}

export const architectureManager = new ArchitectureManager()

// Design patterns implementation
export abstract class Observer {
  abstract update(data: any): void
}

export class Subject {
  private observers: Observer[] = []

  attach(observer: Observer): void {
    this.observers.push(observer)
  }

  detach(observer: Observer): void {
    const index = this.observers.indexOf(observer)
    if (index > -1) {
      this.observers.splice(index, 1)
    }
  }

  notify(data: any): void {
    this.observers.forEach((observer) => observer.update(data))
  }
}

// Factory pattern for component creation
export interface ComponentFactory {
  create(type: string, props: any): React.ComponentType<any>
}

export class DefaultComponentFactory implements ComponentFactory {
  private components: Map<string, React.ComponentType<any>> = new Map()

  register(type: string, component: React.ComponentType<any>): void {
    this.components.set(type, component)
  }

  create(type: string, props: any): React.ComponentType<any> {
    const Component = this.components.get(type)
    if (!Component) {
      throw new Error(`Component type ${type} not found`)
    }
    return Component
  }
}
