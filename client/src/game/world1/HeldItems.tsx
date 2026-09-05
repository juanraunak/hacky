// Everything that can end up in a hand, in one place: the apple from the
// meadow, the quill from the study, and the three things off the rack.
// The rack builds its stock from the same meshes, so a sword on the wall and
// a sword in your fist are the same object.
//
// All original shapes: chunky, flat paint, ink outlines, no borrowed designs.

import { GEO, Part } from './toon';
import { AppleMesh } from './AppleMesh';
import { APPLE_ITEM, GUN_ITEM, PEN_ITEM, SHIELD_ITEM, SWORD_ITEM } from './store';

const STEEL = '#c9ccd6';
const STEEL_DARK = '#8f95a3';
const GOLD = '#ffc72c';
const GRIP = '#8f1420';
const WOOD = '#7a5233';
const WOOD_DARK = '#5a3d24';
const CORD = '#f3f3f3';
const FUTURE = '#3a3f4c';
const FUTURE_TRIM = '#2fd6c4';
const INKY = '#111111';

/** A straight, heavy blade. Plain crossguard, wrapped grip, round pommel. */
export function SwordMesh() {
  return (
    <group>
      <Part color={STEEL} position={[0, 0.62, 0]} scale={[0.11, 0.95, 0.035]} outline={0.09} />
      <Part
        color={STEEL_DARK}
        position={[0, 1.12, 0]}
        rotation={[0, 0, Math.PI / 4]}
        scale={[0.078, 0.078, 0.036]}
        outline={0.12}
        castShadow={false}
      />
      <Part color={GOLD} position={[0, 0.14, 0]} scale={[0.42, 0.08, 0.09]} outline={0.1} />
      <Part color={GRIP} position={[0, -0.04, 0]} scale={[0.07, 0.3, 0.07]} outline={0.14} />
      <Part
        geometry={GEO.sphereLow}
        color={GOLD}
        position={[0, -0.22, 0]}
        scale={0.075}
        outline={0.14}
        castShadow={false}
      />
    </group>
  );
}

/** Oak boards, an iron rim and a heavy boss. Something to put between you
 *  and whatever is already moving. */
export function ShieldMesh() {
  return (
    <group>
      <Part color={WOOD} scale={[0.78, 0.98, 0.09]} outline={0.06} />
      <Part color={WOOD_DARK} position={[-0.24, 0, 0.055]} scale={[0.06, 0.94, 0.03]} outline={0.14} castShadow={false} />
      <Part color={WOOD_DARK} position={[0.24, 0, 0.055]} scale={[0.06, 0.94, 0.03]} outline={0.14} castShadow={false} />
      <Part color={STEEL_DARK} position={[0, 0.44, 0.05]} scale={[0.8, 0.1, 0.04]} outline={0.12} castShadow={false} />
      <Part color={STEEL_DARK} position={[0, -0.44, 0.05]} scale={[0.8, 0.1, 0.04]} outline={0.12} castShadow={false} />
      <Part
        geometry={GEO.sphereLow}
        color={STEEL}
        position={[0, 0, 0.09]}
        scale={[0.19, 0.19, 0.1]}
        outline={0.1}
      />
      <Part color={GRIP} position={[0, 0, -0.1]} scale={[0.1, 0.34, 0.09]} outline={0.14} castShadow={false} />
    </group>
  );
}

/** Blunt, blocky, and obviously wrong for 1687. That is the joke. */
export function GunMesh() {
  return (
    <group>
      <Part color={FUTURE} position={[0, 0.1, 0.16]} scale={[0.11, 0.16, 0.62]} outline={0.1} />
      <Part color={FUTURE} position={[0, 0.24, 0.3]} scale={[0.09, 0.09, 0.34]} outline={0.13} castShadow={false} />
      <Part color={FUTURE_TRIM} position={[0, 0.3, 0.14]} scale={[0.05, 0.04, 0.2]} outline={0.2} castShadow={false} />
      <Part color={INKY} position={[0, -0.16, -0.03]} rotation={[0.3, 0, 0]} scale={[0.1, 0.36, 0.14]} outline={0.12} />
      <Part color={INKY} position={[0, -0.02, 0.02]} scale={[0.05, 0.1, 0.06]} outline={0.2} castShadow={false} />
    </group>
  );
}

/** The quill, once it is your weapon. */
export function PenMesh() {
  return (
    <group rotation={[0.4, 0, 0.3]}>
      <Part geometry={GEO.cylinder} color={INKY} scale={[0.018, 0.4, 0.018]} outline={0.3} />
      <Part
        geometry={GEO.cone}
        color={CORD}
        position={[0, 0.28, 0]}
        rotation={[0, 0, Math.PI]}
        scale={[0.05, 0.32, 0.028]}
        outline={0.16}
      />
    </group>
  );
}

/** Whatever this player is carrying, sized and turned to sit in a fist. */
export function HeldItem({ item }: { item: string | null }) {
  if (item === APPLE_ITEM) {
    return (
      <group position={[0, -0.62, 0.16]}>
        <AppleMesh />
      </group>
    );
  }
  if (item === PEN_ITEM) {
    return (
      <group position={[0, -0.6, 0.14]}>
        <PenMesh />
      </group>
    );
  }
  if (item === SWORD_ITEM) {
    return (
      <group position={[0, -0.66, 0.1]} rotation={[0.25, 0, 0.12]} scale={0.72}>
        <SwordMesh />
      </group>
    );
  }
  if (item === SHIELD_ITEM) {
    return (
      <group position={[0.02, -0.5, 0.2]} rotation={[0, 0, -0.1]} scale={0.72}>
        <ShieldMesh />
      </group>
    );
  }
  if (item === GUN_ITEM) {
    return (
      <group position={[0, -0.66, 0.06]} rotation={[0, 0, 0.1]} scale={0.8}>
        <GunMesh />
      </group>
    );
  }
  return null;
}

export function WeaponMesh({ item }: { item: string }) {
  if (item === SWORD_ITEM) return <SwordMesh />;
  if (item === SHIELD_ITEM) return <ShieldMesh />;
  if (item === GUN_ITEM) return <GunMesh />;
  return null;
}
