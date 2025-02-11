// File: /Users/dennisonbertram/develop/discourse-demo/services/rss/metrics.ts
export class Metrics {
  private counters: Map<string, number>;
  private gauges: Map<string, number>;
  private timings: Map<string, number[]>;
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
    this.counters = new Map();
    this.gauges = new Map();
    this.timings = new Map();
  }

  private getMetricName(name: string): string {
    return `${this.prefix}_${name}`;
  }

  increment(name: string, value: number = 1): void {
    const metricName = this.getMetricName(name);
    const currentValue = this.counters.get(metricName) || 0;
    this.counters.set(metricName, currentValue + value);
  }

  gauge(name: string, value: number): void {
    const metricName = this.getMetricName(name);
    this.gauges.set(metricName, value);
  }

  timing(name: string, value: number): void {
    const metricName = this.getMetricName(name);
    if (!this.timings.has(metricName)) {
      this.timings.set(metricName, []);
    }
    this.timings.get(metricName)?.push(value);
  }

  getMetrics() {
    const metrics: Record<string, any> = {};

    // Add counters
    for (const [key, value] of this.counters) {
      metrics[key] = value;
    }

    // Add gauges
    for (const [key, value] of this.gauges) {
      metrics[key] = value;
    }

    // Add timing statistics
    for (const [key, values] of this.timings) {
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        metrics[`${key}_avg`] = sum / values.length;
        metrics[`${key}_max`] = Math.max(...values);
        metrics[`${key}_min`] = Math.min(...values);
      }
    }

    return metrics;
  }

  // For testing and cleanup
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.timings.clear();
  }
}
