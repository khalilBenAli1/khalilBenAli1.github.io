/**
 * The second typographic voice (D2).
 *
 * Dictionary strings may carry exactly one `*marker*` around the word that
 * should print in Instrument Serif italic. `accent()` turns that into
 * `<em class="accent-serif">word</em>` and escapes everything else, so the
 * result is safe to hand to `set:html`.
 *
 *   accent("Things I've *shipped*")
 *   → "Things I&#39;ve <em class=\"accent-serif\">shipped</em>"
 *
 * The accented word is chosen per locale in i18n.ts — the natural emphasis in
 * that language, not a translation of the English choice.
 */

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ENTITIES[char] ?? char);
}

const MARKER = /\*([^*]+)\*/;

/** Escaped HTML for a dictionary string, with any `*marked*` word in serif. */
export function accent(value: string): string {
  const match = MARKER.exec(value);
  if (!match) return escapeHtml(value);

  const before = escapeHtml(value.slice(0, match.index));
  const word = escapeHtml(match[1]);
  const after = escapeHtml(value.slice(match.index + match[0].length));

  return `${before}<em class="accent-serif">${word}</em>${after}`;
}

/** Same string with the markers dropped — for title/aria contexts. */
export function plain(value: string): string {
  return value.replace(/\*/g, "");
}
