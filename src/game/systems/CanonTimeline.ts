export interface CanonMarineOffice {
  id: string;
  name: string;
  office: 'fleet-admiral' | 'admiral';
}

export const EAST_BLUE_START_MARINE_COMMAND: CanonMarineOffice[] = [
  { id: 'sengoku', name: 'Sengoku', office: 'fleet-admiral' },
  { id: 'sakazuki', name: 'Sakazuki', office: 'admiral' },
  { id: 'borsalino', name: 'Borsalino', office: 'admiral' },
  { id: 'kuzan', name: 'Kuzan', office: 'admiral' },
];

export function isTimelineValidAdmiral(characterId: string): boolean {
  return EAST_BLUE_START_MARINE_COMMAND.some(
    (officer) => officer.office === 'admiral' && officer.id === characterId,
  );
}

export function canonMarineName(characterId: string): string | null {
  return EAST_BLUE_START_MARINE_COMMAND.find((officer) => officer.id === characterId)?.name ?? null;
}
