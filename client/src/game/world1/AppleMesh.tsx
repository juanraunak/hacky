import { GEO, Part } from './toon';
import { APPLE, APPLE_STEM, LEAF } from './palette';
import { APPLE_RADIUS } from './layout';

// One apple, origin at its centre. Used in the tree, on the ground, and in a
// player's hand.
export function AppleMesh() {
  const r = APPLE_RADIUS;
  return (
    <group>
      <Part geometry={GEO.sphere} color={APPLE} scale={[r, r * 0.92, r]} outline={0.08} />
      <Part
        geometry={GEO.cylinder}
        color={APPLE_STEM}
        position={[0, r * 0.95, 0]}
        scale={[0.022, 0.13, 0.022]}
        outline={0.35}
        castShadow={false}
      />
      <Part
        geometry={GEO.sphere}
        color={LEAF}
        position={[0.07, r * 0.98, 0]}
        rotation={[0, 0, -0.5]}
        scale={[0.085, 0.03, 0.05]}
        outline={0.18}
        castShadow={false}
      />
    </group>
  );
}
