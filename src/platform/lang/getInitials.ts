export function getInitials(name: string): string {
  // Split the name by spaces
  const words = name
    .trim()
    .replace(/[^a-zA-Z\s]/g, "")
    .split(/\s+/);

  // Get the first letter of the first word and the first letter of the second word if available
  const firstInitial = words[0]?.charAt(0).toUpperCase() || "";

  if (words.length === 1) {
    return firstInitial;
  }

  const secondInitial =
    words[Math.max(1, words.length - 1)]?.charAt(0).toUpperCase() || "";

  // Return the initials (if only one word, return its first letter twice)
  return firstInitial + (secondInitial || firstInitial);
}

export function getInitialsOneLetter(name: string): string {
  // Split the name by spaces
  const words = name
    .trim()
    .replace(/[^a-zA-Z\s]/g, "")
    .split(/\s+/);

  // Get the first letter of the first word and the first letter of the second word if available
  const firstInitial = words[0]?.charAt(0).toUpperCase() || "";

  return firstInitial;
}
