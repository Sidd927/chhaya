/**
 * All sound in Chhaya is synthesized at runtime with WebAudio: a tanpura-like
 * drone, bell tones for awakenings, and small spatialized creature sounds
 * placed where the creature stands on your wall. No audio files are shipped.
 */
import type { Vector3 } from '@iwsdk/core';

type Pos = { x: number; y: number; z: number };

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private droneGain!: GainNode;
  private droneTimer = 0;
  private droneStep = 0;
  private shimmer: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private noise!: AudioBuffer;
  private muted = false;
  private paused = false;

  /** Must be called from a user gesture (the "enter" button). */
  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.8);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.35;
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(this.master);

    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    this.droneGain.connect(this.master);
    this.droneGain.connect(this.reverbSend);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return buf;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!this.ctx) return;
    if (paused) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.1);
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Keep the listener on the head so spatial sounds sit on the wall. */
  updateListener(pos: Vector3, forward: Vector3, up: Vector3): void {
    const ctx = this.ctx;
    if (!ctx || this.paused) return;
    const l = ctx.listener;
    if (l.positionX) {
      const t = ctx.currentTime;
      l.positionX.setTargetAtTime(pos.x, t, 0.02);
      l.positionY.setTargetAtTime(pos.y, t, 0.02);
      l.positionZ.setTargetAtTime(pos.z, t, 0.02);
      l.forwardX.setTargetAtTime(forward.x, t, 0.02);
      l.forwardY.setTargetAtTime(forward.y, t, 0.02);
      l.forwardZ.setTargetAtTime(forward.z, t, 0.02);
      l.upX.setTargetAtTime(up.x, t, 0.02);
      l.upY.setTargetAtTime(up.y, t, 0.02);
      l.upZ.setTargetAtTime(up.z, t, 0.02);
    }
  }

  /** Fade the drone in (level 0..1). */
  drone(level: number): void {
    if (!this.ctx) return;
    this.droneGain.gain.setTargetAtTime(level * 0.16, this.ctx.currentTime, 1.2);
  }

  /** Call every frame; plucks the drone's four strings in turn. */
  tick(dt: number): void {
    if (!this.ctx || this.paused) return;
    this.droneTimer -= dt;
    if (this.droneTimer <= 0) {
      // Pa, Sa, Sa, low Sa — the classic tanpura cycle, on C#.
      const sa = 138.59;
      const notes = [sa * 0.75, sa, sa, sa / 2];
      this.pluck(notes[this.droneStep % 4]);
      this.droneStep++;
      this.droneTimer = this.droneStep % 4 === 0 ? 1.6 : 1.15;
    }
  }

  private pluck(freq: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.5, t + 0.02);
    out.gain.exponentialRampToValueAtTime(0.001, t + 5.5);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(freq * 9, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 3, t + 3);
    filter.connect(out);
    out.connect(this.droneGain);
    for (const detune of [-4, 3]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(filter);
      o.start(t);
      o.stop(t + 5.6);
    }
  }

  private spatial(pos: Pos | null): AudioNode {
    const ctx = this.ctx!;
    if (!pos) {
      const g = ctx.createGain();
      g.connect(this.master);
      g.connect(this.reverbSend);
      return g;
    }
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 1;
    p.positionX.value = pos.x;
    p.positionY.value = pos.y;
    p.positionZ.value = pos.z;
    p.connect(this.master);
    p.connect(this.reverbSend);
    return p;
  }

  /** Bell tone: awakenings and confirmations. */
  chime(pitch = 1, pos: Pos | null = null, level = 0.22): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dest = this.spatial(pos);
    const base = 554.37 * pitch;
    [1, 2.76, 5.4, 8.93].forEach((ratio, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = base * ratio;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(level / (i + 1), t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6 / (i * 0.6 + 1));
      o.connect(g).connect(dest);
      o.start(t);
      o.stop(t + 3);
    });
  }

  /** A soft, rising breath while a shape is awakening (0..1, or <0 to stop). */
  awakening(progress: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    if (progress < 0) {
      if (this.shimmer) {
        const s = this.shimmer;
        s.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        s.src.stop(ctx.currentTime + 0.5);
        this.shimmer = null;
      }
      return;
    }
    if (!this.shimmer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 14;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain);
      gain.connect(this.master);
      gain.connect(this.reverbSend);
      src.start();
      this.shimmer = { src, gain, filter };
    }
    const t = ctx.currentTime;
    this.shimmer.filter.frequency.setTargetAtTime(500 + progress * 2600, t, 0.05);
    this.shimmer.gain.gain.setTargetAtTime(0.05 + progress * 0.22, t, 0.05);
  }

  hop(pos: Pos | null): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.09);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(this.spatial(pos));
    o.start(t);
    o.stop(t + 0.15);
  }

  roar(pos: Pos | null, echo = false): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + (echo ? 0.55 : 0);
    const dest = this.spatial(pos);
    const level = echo ? 0.25 : 0.5;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3;
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.exponentialRampToValueAtTime(180, t + 1.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    src.connect(bp).connect(g).connect(dest);
    src.start(t);
    src.stop(t + 1.4);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 1.1);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(level * 0.6, t + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    o.connect(lp).connect(g2).connect(dest);
    o.start(t);
    o.stop(t + 1.3);
  }

  splash(pos: Pos | null): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(300, t);
    hp.frequency.exponentialRampToValueAtTime(2400, t + 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    src.connect(hp).connect(g).connect(this.spatial(pos));
    src.start(t);
    src.stop(t + 1.2);
  }

  /** Small wooden tock for UI confirmations. */
  tock(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(820, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.05);
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g).connect(this.spatial(null));
    o.start(t);
    o.stop(t + 0.12);
  }

  /** Species call when a creature first appears. */
  call(species: string, pos: Pos | null): void {
    if (!this.ctx) return;
    const pitches: Record<string, number> = {
      hare: 1.5, lion: 0.5, stag: 0.75, peacock: 1.333, crocodile: 0.6, tortoise: 0.667, snake: 1.125, wisp: 2,
    };
    if (species === 'lion') this.roar(pos);
    this.chime(pitches[species] ?? 1, pos, 0.2);
  }
}
