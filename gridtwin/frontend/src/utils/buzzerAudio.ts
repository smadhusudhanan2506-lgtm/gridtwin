/**
 * Industrial SCADA Electrical Alarm Buzzer
 * Uses Web Audio API to generate a continuous pulsing hazard buzzer
 * when Reverse Feed Current backflow is detected on isolated transmission towers.
 */
class ReverseFeedBuzzerService {
  private audioCtx: AudioContext | null = null;
  private intervalId: any = null;
  private isRunning = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    const ctx = this.getContext();

    const playBeep = () => {
      if (!this.isRunning) return;
      const c = this.getContext();
      if (!c) return;

      try {
        const now = c.currentTime;
        const osc = c.createOscillator();
        const gain = c.createGain();

        // Industrial Dual-Tone Sawtooth Alarm Buzzer (880Hz -> 620Hz sweep)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.16);

        // Sharp audible attack with fast decay envelope
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(c.destination);

        osc.start(now);
        osc.stop(now + 0.16);
      } catch (err) {
        console.warn('[Buzzer] Web Audio error:', err);
      }
    };

    // Play first burst immediately, then repeat pulse every 320ms
    playBeep();
    this.intervalId = setInterval(playBeep, 320);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public isActive(): boolean {
    return this.isRunning;
  }
}

export const reverseFeedBuzzer = new ReverseFeedBuzzerService();
