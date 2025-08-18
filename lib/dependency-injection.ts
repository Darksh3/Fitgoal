/**
 * Dependency Injection Container for managing application dependencies
 */

type Constructor<T = {}> = new (...args: any[]) => T
type ServiceFactory<T> = () => T
type ServiceInstance<T> = T | ServiceFactory<T> | Constructor<T>

export enum ServiceLifetime {
  Singleton = "singleton",
  Transient = "transient",
  Scoped = "scoped",
}

interface ServiceDescriptor<T = any> {
  instance?: T
  factory?: ServiceFactory<T>
  constructor?: Constructor<T>
  lifetime: ServiceLifetime
  dependencies?: string[]
}

export class DIContainer {
  private services = new Map<string, ServiceDescriptor>()
  private singletons = new Map<string, any>()
  private scoped = new Map<string, any>()

  // Register a singleton service
  registerSingleton<T>(name: string, instance: ServiceInstance<T>): void {
    this.services.set(name, {
      instance: typeof instance === "function" && instance.prototype ? undefined : (instance as T),
      factory: typeof instance === "function" && !instance.prototype ? (instance as ServiceFactory<T>) : undefined,
      constructor: typeof instance === "function" && instance.prototype ? (instance as Constructor<T>) : undefined,
      lifetime: ServiceLifetime.Singleton,
      dependencies: [],
    })
  }

  // Register a transient service
  registerTransient<T>(name: string, factory: ServiceFactory<T> | Constructor<T>): void {
    this.services.set(name, {
      factory: typeof factory === "function" && !factory.prototype ? (factory as ServiceFactory<T>) : undefined,
      constructor: typeof factory === "function" && factory.prototype ? (factory as Constructor<T>) : undefined,
      lifetime: ServiceLifetime.Transient,
      dependencies: [],
    })
  }

  // Register a scoped service
  registerScoped<T>(name: string, factory: ServiceFactory<T> | Constructor<T>): void {
    this.services.set(name, {
      factory: typeof factory === "function" && !factory.prototype ? (factory as ServiceFactory<T>) : undefined,
      constructor: typeof factory === "function" && factory.prototype ? (factory as Constructor<T>) : undefined,
      lifetime: ServiceLifetime.Scoped,
      dependencies: [],
    })
  }

  // Resolve a service
  resolve<T>(name: string): T {
    const descriptor = this.services.get(name)
    if (!descriptor) {
      throw new Error(`Service ${name} not registered`)
    }

    switch (descriptor.lifetime) {
      case ServiceLifetime.Singleton:
        return this.resolveSingleton<T>(name, descriptor)
      case ServiceLifetime.Transient:
        return this.resolveTransient<T>(descriptor)
      case ServiceLifetime.Scoped:
        return this.resolveScoped<T>(name, descriptor)
      default:
        throw new Error(`Unknown service lifetime: ${descriptor.lifetime}`)
    }
  }

  private resolveSingleton<T>(name: string, descriptor: ServiceDescriptor<T>): T {
    if (this.singletons.has(name)) {
      return this.singletons.get(name)
    }

    const instance = this.createInstance<T>(descriptor)
    this.singletons.set(name, instance)
    return instance
  }

  private resolveTransient<T>(descriptor: ServiceDescriptor<T>): T {
    return this.createInstance<T>(descriptor)
  }

  private resolveScoped<T>(name: string, descriptor: ServiceDescriptor<T>): T {
    if (this.scoped.has(name)) {
      return this.scoped.get(name)
    }

    const instance = this.createInstance<T>(descriptor)
    this.scoped.set(name, instance)
    return instance
  }

  private createInstance<T>(descriptor: ServiceDescriptor<T>): T {
    if (descriptor.instance) {
      return descriptor.instance
    }

    if (descriptor.factory) {
      return descriptor.factory()
    }

    if (descriptor.constructor) {
      return new descriptor.constructor()
    }

    throw new Error("No valid service definition found")
  }

  // Clear scoped services (useful for request boundaries)
  clearScoped(): void {
    this.scoped.clear()
  }

  // Check if service is registered
  isRegistered(name: string): boolean {
    return this.services.has(name)
  }

  // Get all registered service names
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys())
  }
}

// Global DI container instance
export const container = new DIContainer()

// Decorator for dependency injection
export function Injectable(name: string) {
  return <T extends Constructor>(constructor: T) => {
    container.registerTransient(name, constructor)
    return constructor
  }
}

// Service interfaces
export interface IUserService {
  getCurrentUser(): Promise<any>
  updateUser(data: any): Promise<void>
}

export interface INotificationService {
  show(message: string, type: "success" | "error" | "info"): void
  clear(): void
}

export interface IStorageService {
  get(key: string): any
  set(key: string, value: any): void
  remove(key: string): void
  clear(): void
}

// Example service implementations
@Injectable("userService")
export class UserService implements IUserService {
  async getCurrentUser(): Promise<any> {
    // Implementation here
    return null
  }

  async updateUser(data: any): Promise<void> {
    // Implementation here
  }
}

@Injectable("storageService")
export class LocalStorageService implements IStorageService {
  get(key: string): any {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  }

  set(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error("Failed to save to localStorage:", error)
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key)
  }

  clear(): void {
    localStorage.clear()
  }
}
