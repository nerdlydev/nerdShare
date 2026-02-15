/**
 * Sliding-window speed calculator.
 * Provides stable speed readings by averaging over a configurable time window,
 * avoiding the wild fluctuations of a simple bytes/elapsed calculation.
 */

interface Sample {
  time: number;
  bytes: number;
}

export class SpeedTracker {
  private samples: Sample[] = [];
  private windowMs: number;

  constructor(windowMs = 3000) {
    this.windowMs = windowMs;
  }

  addSample(bytes: number): void {
    const now = Date.now();
    this.samples.push({ time: now, bytes });
    // Trim samples outside the window
    this.samples = this.samples.filter((s) => now - s.time < this.windowMs);
  }

  /** Returns speed in bytes/second */
  getSpeed(): number {
    if (this.samples.length < 2) return 0;
    const oldest = this.samples[0];
    const newest = this.samples[this.samples.length - 1];
    const totalBytes = this.samples.reduce((sum, s) => sum + s.bytes, 0);
    const elapsed = (newest.time - oldest.time) / 1000;
    return elapsed > 0 ? totalBytes / elapsed : 0;
  }

  reset(): void {
    this.samples = [];
  }
}
