/**
 * What Chhaya remembers between visits, kept on the device in localStorage:
 * which creatures you have woken, which tales you have finished, and the
 * persistent anchor of your stage wall.
 */
import { ALL_SPECIES, type Species } from './hand-shape.js';

const KEY = 'chhaya.save.v1';

export interface SaveData {
  discovered: Species[];
  talesFinished: string[];
  visits: number;
  tutorialDone: boolean;
  stageAnchor: string | null;
  lastVisit: number;
}

const fresh = (): SaveData => ({
  discovered: [],
  talesFinished: [],
  visits: 0,
  tutorialDone: false,
  stageAnchor: null,
  lastVisit: 0,
});

export class Save {
  data: SaveData;

  constructor() {
    this.data = fresh();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...fresh(), ...JSON.parse(raw) };
    } catch {
      this.data = fresh();
    }
    this.data.discovered = this.data.discovered.filter((s) => ALL_SPECIES.includes(s));
  }

  private write(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage may be unavailable in private browsing; play continues */
    }
  }

  beginVisit(): void {
    this.data.visits += 1;
    this.data.lastVisit = Date.now();
    this.write();
  }

  /** Returns true the first time a species is discovered. */
  discover(species: Species): boolean {
    if (this.data.discovered.includes(species)) return false;
    this.data.discovered.push(species);
    this.write();
    return true;
  }

  finishTale(id: string): void {
    if (!this.data.talesFinished.includes(id)) this.data.talesFinished.push(id);
    this.write();
  }

  setTutorialDone(): void {
    this.data.tutorialDone = true;
    this.write();
  }

  setStageAnchor(uuid: string | null): void {
    this.data.stageAnchor = uuid;
    this.write();
  }

  get discoveredCount(): number {
    return this.data.discovered.length;
  }
}
