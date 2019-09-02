/**
 * Removes new lines and indentation from a multi-line template string.
 * @param strings The string parts of a template string.
 * @param values The value (${}) parts of a template string.
 * @returns The template string with all whitespace removed.
 */
export function singleLineify(strings: TemplateStringsArray, ...values: string[]) {
  // Interleave the strings with the value parts first.
  let output = '';
  for (let i = 0; i < values.length; i += 1) {
    output += strings[i] + values[i];
  }
  output += strings[values.length];
  // Split on newlines.
  const lines = output.split(/(?:\r\n|\n|\r)/);
  // Remove leading whitespace.
  return lines.map((line) => {
    return line.replace(/^\s+/gm, '');
  }).join(' ').trim();
}
