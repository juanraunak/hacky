// Phone controls for the study. World 3's Hud carries these; StudyHud does
// not, so on a phone there was no way to brace, swing or fire and the whole
// tutorial was unplayable. Same functions, same behaviour.

import { useRef } from 'react';
import { fireGun, selectWeapon, setBracing, setSwordCharge, swingSword, useCombat } from '../world3/combat';
import { LAWS, SWORD_CHARGE_MS } from '../world3/weapons';

export function TouchWeapons() {
  const c = useCombat();
  const held = useRef(0);

  if (!c.owned.length) return null;

  const label = c.weapon === 'gun' ? 'FIRE' : c.weapon === 'shield' ? 'BRACE' : 'SWING';

  return (
    <>
      <div className="tw-slots">
        {LAWS.filter(l => c.owned.includes(l.id)).map((l, i) => (
          <button
            key={l.id}
            type="button"
            className="tw-slot"
            data-on={c.weapon === l.id}
            onPointerDown={e => {
              e.stopPropagation();
              selectWeapon(l.id);
            }}
          >
            <b>{l.glyph}</b>
            <span>{l.short}</span>
            <i>{i + 1}</i>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="tw-fire"
        onPointerDown={e => {
          e.stopPropagation();
          if (c.weapon === 'gun') fireGun();
          else if (c.weapon === 'shield') setBracing(true);
          else held.current = performance.now();
        }}
        onPointerUp={e => {
          e.stopPropagation();
          if (c.weapon === 'shield') setBracing(false);
          if (c.weapon === 'sword' && held.current) {
            setSwordCharge((performance.now() - held.current) / SWORD_CHARGE_MS);
            swingSword();
            held.current = 0;
          }
        }}
      >
        {label}
      </button>
    </>
  );
}

export default TouchWeapons;
