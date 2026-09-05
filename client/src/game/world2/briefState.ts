// Shared flag so the camera and the player controller both know Newton has
// the floor. Kept outside React because both read it every frame.

export const briefing = { active: true };

/** True only during the shield drill, when something is thrown at you. */
export const drill = { shove: false };

/** He walks in from the door before anything else happens. */
export const newtonEntrance = { playing: false, startedAt: 0 };
