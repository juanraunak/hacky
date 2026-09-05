// Everything Newton says in the study, and the one card the game ever shows.
// Edit the words here; nothing in the scene knows what they say.
//
// He is teaching, so most beats are several lines. He never asks the player
// anything and never checks whether they got it. He works it out out loud and
// lets them watch, which is the only teaching this game does.

/** A beat: where he stands to say it, and what he says. */
export interface Beat {
  at: keyof typeof STATION;
  lines: string[];
}

// Where he stands to say a thing. The study is a room, and a man explaining
// something walks to the thing he is explaining.
export const STATION = {
  desk: 'desk',
  front: 'front',
  floor: 'floor',
  notebook: 'notebook',
  aside: 'aside',
  rack: 'rack',
  cellar: 'cellar',
} as const;

export const ENTRY: Beat = {
  at: STATION.front,
  lines: [
    'Mind the papers. Some of those are important. I don’t remember which.',
    'Since you’re here — take something off that desk. Anything. Then let it go.',
  ],
};

export const STONE: Beat = {
  at: STATION.floor,
  lines: [
    'Same as the apple. Same as everything. They all fall the same.',
    'Not the same weight. The same fall.',
    'A heavy thing does not hurry. A light thing does not dawdle.',
    'Everyone I have ever asked says the heavy one lands first. I said it too.',
    'It doesn’t. It never has. We were all just repeating each other.',
  ],
};

export const STONE_NOTE: Beat = {
  at: STATION.notebook,
  lines: ['Down it goes, then. Before I forget it again.'],
};

export const PEN: Beat = {
  at: STATION.front,
  lines: [
    'Keep that. You’ll want something in your hand.',
    'And look — it fell exactly as the stone did. A quill against a rock.',
    'Different weight. Same fall. It is not the weight that decides.',
  ],
};

export const FEATHER: Beat = {
  at: STATION.floor,
  lines: ['Put that down. That’s a story for another time.'],
};

export const PORTAL: Beat = {
  at: STATION.aside,
  lines: [
    'I locked the door for this. If the landlady asks, we were reading.',
    'Oh — wait. Look behind you. What is that.',
    '…that’s new.',
  ],
};

export const BEFORE_FIGHT: Beat = {
  at: STATION.aside,
  lines: [
    'Whatever comes out of that will fall. It has no say in the matter.',
    'A big one and a small one, side by side, will reach you together.',
    'So don’t judge by how large it looks. Judge by when it arrives.',
  ],
};

export const AFTER_WAVE_2: Beat = {
  at: STATION.aside,
  lines: [
    'The big ones weren’t faster. You swung early at those, didn’t you.',
    'Size is loud. It tells you nothing about falling.',
  ],
};

export const THRICE: Beat = {
  at: STATION.aside,
  lines: ['It’s an apple. It has no legs. How.'],
};

export const DONE: Beat = {
  at: STATION.notebook,
  lines: [
    'I’m going to need a bigger notebook.',
    'Everything falls the same. That is not a rule about apples.',
    'It is a rule about everything. Stones, quills, apples. The Moon, I suspect.',
  ],
};

// --- the rack, and the three laws ----------------------------------------
// Each weapon is one law, and the law is how the weapon works. Take the
// numbers out and the weapon stops functioning, which is the whole idea.

export const RACK: Beat = {
  at: STATION.rack,
  lines: [
    'Don’t touch th— fine. Take one each. ONE.',
    'They are not three ways to hit something. They are three things I worked out.',
  ],
};

/** First law. Brace and the net force is zero, so you do not accelerate. */
export const SHIELD: Beat = {
  at: STATION.rack,
  lines: [
    'A thing keeps doing what it is doing until something stops it.',
    'That sandbag is doing something. It will keep doing it through you.',
    'Set your feet — hold — and you are the something. The forces cancel and you do not move.',
    'Stand there admiring it and its motion becomes yours. That is the whole first law.',
  ],
};

/** Second law. Force is mass times acceleration; a tap has no acceleration. */
export const SWORD: Beat = {
  at: STATION.rack,
  lines: [
    'A sword is not fearsome because it is heavy. It is fearsome because you make it move.',
    'Force is mass times acceleration. The mass is fixed. The acceleration is yours.',
    'Flick it at that post and it will slide off and embarrass you.',
    'Hold, wind it up, then let go. Same blade, same arm, entirely different outcome.',
  ],
};

/** Third law. Firing kicks you back, equal and opposite. */
export const GUN: Beat = {
  at: STATION.rack,
  lines: [
    'That one’s from the future. Don’t ask.',
    'Every push has an equal push the other way. That is not a warning, it is arithmetic.',
    'Send something that small away that fast, and it sends you backwards.',
    'You will feel it. Fire it near a ledge and you will feel it a great deal.',
  ],
};

export const CELLAR: Beat = {
  at: STATION.cellar,
  lines: [
    'Right. Downstairs. Try not to die, it’s a lot of paperwork.',
  ],
};

export const NOTE_BRACE = 'brace and nothing moves you.';
export const NOTE_WINDUP = 'a tap is not a blow. wind it up.';
export const NOTE_RECOIL = 'push it away, it pushes you back.';

// The page pinned to the wall. Lines are added, never removed.
export const NOTE_SAME_FALL = 'big or small, same fall.';
export const NOTE_NOT_FASTER = 'the big ones weren’t faster.';

// The single card, shown while the game is paused for everyone.
export const CARD = {
  title: 'APPLES',
  lines: [
    'Each one goes down in ONE hit with the pen.',
    'LEFT CLICK / TAP when it’s about to reach you.',
  ],
  ready: 'Ready',
} as const;

// Typing, matched to World 1 so Newton sounds like the same man.
export const TYPE_MS = 25;
export const STOP_PAUSE_MS = 380;
export const COMMA_PAUSE_MS = 160;
export const HOLD_MS = 1500;
export const GAP_MS = 420;
export const FADE_MS = 450;

export function pauseAfter(ch: string): number {
  if (ch === '.' || ch === '!' || ch === '?' || ch === '…') return STOP_PAUSE_MS;
  if (ch === ',') return COMMA_PAUSE_MS;
  return 0;
}
