// Shared flag so the camera and the player controller both know Newton has
// the floor. Kept outside React because both read it every frame.

export const briefing = { active: false }; // the rig owns the camera, always

/** True only during the shield drill, when something is thrown at you. */
export const drill = { shove: false };

/** He walks in from the door before anything else happens. */
export const newtonEntrance = { playing: false, startedAt: 0 };

/** True once THIS player has finished the montage. Their own pace. */
export const briefDone = { value: false };

/** Newton is winding up a throw; the HUD shouts so you can brace in time. */
export const incoming = { armed: false, at: 0 };
