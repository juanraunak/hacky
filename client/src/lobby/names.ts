// Deterministic animal name per identity, so the same player is the same
// animal on every device and across refreshes without storing anything.

const ANIMALS = [
  'Otter', 'Heron', 'Lynx', 'Magpie', 'Badger', 'Falcon', 'Marten', 'Ibis',
  'Vole', 'Osprey', 'Stoat', 'Curlew', 'Pika', 'Shrike', 'Tapir', 'Grebe',
  'Serval', 'Auk', 'Civet', 'Kestrel', 'Dunlin', 'Fossa', 'Bittern', 'Coati',
];

export function animalName(identityHex: string): string {
  if (!identityHex) return 'Guest';
  let hash = 0;
  for (let i = 0; i < identityHex.length; i++) {
    hash = (hash * 31 + identityHex.charCodeAt(i)) >>> 0;
  }
  return ANIMALS[hash % ANIMALS.length];
}
