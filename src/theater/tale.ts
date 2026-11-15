/**
 * "The Lion and the Clever Hare", retold from the Panchatantra (public
 * domain, Book I). Each beat narrates, may ask the audience to perform, and
 * waits for it, with a gentle assist if nobody can or wants to.
 */
import type { Creature, Ground } from './creature.js';
import type { Species } from './hand-shape.js';

export interface TaleContext {
  readonly time: number;
  readonly width: number;
  readonly ground: Ground;
  find(species: Species): Creature | undefined;
  others(...exclude: Species[]): Creature[];
  summon(species: Species, x: number): Creature;
  /** True on a frame when any hand bursts open (fist → open), or pinches. */
  readonly roarGesture: boolean;
  setForest(on: boolean): void;
  setWell(on: boolean): void;
  readonly wellX: number;
  showReflection(on: boolean): void;
  roar(c: Creature, echo?: boolean): void;
  splash(): void;
  celebrate(): void;
  clearStage(except?: Species[]): void;
}

export interface Beat {
  narration?: string;
  instruction?: string;
  /** Minimum seconds on this beat (reading time). */
  hold?: number;
  enter?: (c: TaleContext) => void;
  until?: (c: TaleContext) => boolean;
  /** Seconds before the assist line appears / the assist acts. */
  assistAfter?: number;
  assistText?: string;
  assist?: (c: TaleContext) => void;
  /** The assist simply moves the story on (used for the roar). */
  skipOnAssist?: boolean;
}

const near = (a: Creature | undefined, x: number, d: number, u: number) =>
  !!a && Math.abs(a.x - x) < d * u && a.state !== 'carried';

export const LION_AND_HARE: { id: string; title: string; byline: string; beats: Beat[] } = {
  id: 'lion-and-hare',
  title: 'The Lion and the Clever Hare',
  byline: 'a tale from the Panchatantra',
  beats: [
    {
      enter: (c) => {
        c.clearStage();
        c.setForest(true);
      },
      hold: 5,
    },
    {
      narration: 'Long ago, in a deep forest,\nthere lived a lion named Bhasuraka.',
      instruction: 'Bend your fingers into a claw and hold it in the light',
      until: (c) => !!c.find('lion') && c.find('lion')!.state !== 'awakening',
      hold: 4,
      assistAfter: 22,
      assistText: 'Or pinch, and the lantern will shape him for you',
      assist: (c) => void (c.find('lion') ?? c.summon('lion', c.width * 0.32)),
    },
    {
      narration: 'He hunted far more than he could eat,\nand the whole forest lived in fear.',
      enter: (c) => {
        const lion = c.find('lion');
        if (lion) c.roar(lion);
      },
      hold: 6,
    },
    {
      narration: 'So the animals came to him together.',
      instruction: 'Bring an animal of the forest: a stag, a peacock, a tortoise…',
      until: (c) => c.others('lion', 'hare').some((o) => o.state !== 'awakening'),
      hold: 3,
      assistAfter: 22,
      assistText: 'Or pinch, and a stag will come',
      assist: (c) => void (c.others('lion', 'hare')[0] ?? c.summon('stag', c.width * 0.62)),
    },
    {
      narration: '“Spare us,” they said, “and every day,\none of us will come to you.”',
      hold: 6.5,
    },
    {
      narration: 'One morning, it was the turn\nof a small and clever hare.',
      instruction: 'Raise two fingers for ears, fold the others, and hold still',
      enter: (c) => {
        for (const o of c.others('lion', 'hare')) o.leave(o.x < c.width / 2 ? -1 : 1);
      },
      until: (c) => !!c.find('hare') && c.find('hare')!.state !== 'awakening',
      hold: 3,
      assistAfter: 22,
      assistText: 'Or pinch, and the lantern will shape the hare',
      assist: (c) => void (c.find('hare') ?? c.summon('hare', c.width * 0.85)),
    },
    {
      narration: 'The hare took his time,\nand arrived long after noon.',
      instruction: 'Pinch the hare’s shadow and carry him to the lion',
      until: (c) => {
        const lion = c.find('lion');
        const hare = c.find('hare');
        return !!lion && !!hare && near(hare, lion.x, 0.42, c.ground.unit);
      },
      hold: 2,
      assistAfter: 26,
      assistText: 'Or wait, and he will hop there himself',
      assist: (c) => {
        const lion = c.find('lion');
        const hare = c.find('hare');
        if (lion && hare) hare.goTo(lion.x + (hare.x > lion.x ? 0.3 : -0.3) * c.ground.unit, c.ground);
      },
    },
    {
      narration: '“You are late!” roared the lion.',
      enter: (c) => {
        const lion = c.find('lion');
        if (lion) c.roar(lion);
      },
      hold: 3.5,
    },
    {
      narration: '“Forgive me,” said the hare. “Another lion stopped me.\nHe says this forest belongs to him.”',
      hold: 7,
    },
    {
      narration: '“Show me this other lion,” growled Bhasuraka.\nThe hare led him to an old well.',
      instruction: 'Pinch the lion and carry him to the well',
      enter: (c) => c.setWell(true),
      until: (c) => near(c.find('lion'), c.wellX, 0.32, c.ground.unit),
      hold: 3,
      assistAfter: 26,
      assistText: 'Or wait, and he will stalk there himself',
      assist: (c) => c.find('lion')?.goTo(c.wellX - 0.28 * c.ground.unit, c.ground),
    },
    {
      narration: 'The lion looked down into the water,\nand another lion looked back at him.',
      instruction: 'Close your hand, then open it wide to make him roar',
      enter: (c) => c.showReflection(true),
      until: (c) => c.roarGesture,
      hold: 2.5,
      assistAfter: 16,
      assistText: 'Or pinch to roar',
      skipOnAssist: true,
    },
    {
      narration: 'He roared, and the lion in the well roared back.',
      enter: (c) => {
        const lion = c.find('lion');
        if (lion) {
          c.roar(lion);
          c.roar(lion, true);
        }
      },
      hold: 4,
    },
    {
      narration: 'Furious, Bhasuraka leapt at his rival…',
      enter: (c) => {
        const lion = c.find('lion');
        if (lion) lion.leap(c.wellX, 0.32 * c.ground.unit);
        c.showReflection(false);
      },
      hold: 3.2,
    },
    {
      narration: '…and the forest never saw him again.',
      enter: (c) => c.splash(),
      hold: 4,
    },
    {
      narration: 'Wit is stronger than strength.',
      enter: (c) => {
        c.setWell(false);
        c.celebrate();
      },
      hold: 7,
    },
  ],
};
