/**
 * Reads an optional subject line from a campaign template, declared as an HTML
 * comment near the top of the file: `<!-- subject: ... -->`. Returns undefined
 * when absent (the campaign builder then leaves the subject field untouched, so
 * existing templates without the marker keep their current behavior).
 */
export function extractTemplateSubject(html: string): string | undefined {
  const m = html.match(/<!--\s*subject:\s*([\s\S]+?)\s*-->/i);
  return m ? m[1].trim() : undefined;
}
