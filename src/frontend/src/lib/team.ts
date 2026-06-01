const MAX_TEAM_NAME_LENGTH = 11;

export function truncateTeamName(name: string): string {
  if (name.length <= MAX_TEAM_NAME_LENGTH) return name;
  return `${name.slice(0, MAX_TEAM_NAME_LENGTH - 2)}…`;
}
