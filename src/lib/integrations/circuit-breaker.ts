export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold?: number; // consecutive failures before OPEN
  recoveryTimeMs?: number;   // time to stay OPEN before attempting HALF_OPEN
  timeoutMs?: number;        // request timeout
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly recoveryTimeMs: number;
  private readonly timeoutMs: number;
  public readonly name: string;

  constructor(name: string, options?: CircuitBreakerOptions) {
    this.name = name;
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.recoveryTimeMs = options?.recoveryTimeMs ?? 30000; // 30s
    this.timeoutMs = options?.timeoutMs ?? 8000; // 8s
  }

  public getState(): CircuitState {
    if (this.state === "OPEN") {
      const now = Date.now();
      if (now - this.lastFailureTime > this.recoveryTimeMs) {
        this.state = "HALF_OPEN";
      }
    }
    return this.state;
  }

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === "OPEN") {
      throw new Error(`CircuitBreaker '${this.name}' is OPEN. Fast failing external request to isolate LMS.`);
    }

    try {
      const result = await Promise.race([
        action(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${this.timeoutMs}ms`)), this.timeoutMs)
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold || this.state === "HALF_OPEN") {
      this.state = "OPEN";
    }
  }

  public reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = "CLOSED";
  }

  public getStats() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
    };
  }
}

// Global in-memory registry of circuit breakers
const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker(name, options));
  }
  return breakers.get(name)!;
}
