/* The notices from rights holders (.github/ISSUE_TEMPLATE/rights.yml and rights-ja.yml, since 2026-11-18), known in one place
 * for every tool that must treat them apart:
 *   - tools/llm.js gives only the title and text of a notice, only to Claude, and only when RIGHTS_BOX is ticked in it;
 *   - tools/removal.js never empties or closes a notice, as it never empties a removal request, so that the notice and the
 *     decision on it stay, even when the notice names a record that is removed.
 * A notice is known by the label "rights", or, where the label is missing, by a heading of the form in either language.
 * The owner asked for the form on 2026-11-18, and Claude wrote this. */
'use strict';

/* The box of consent, with the sentence that rule 17 of the operator's repositories searches for. */
const RIGHTS_PHRASE = 'I consent to the operator giving the title and text of this issue to Claude';
const RIGHTS_BOX = RIGHTS_PHRASE + ' (Anthropic, United States).';
const RIGHTS_LABEL = 'rights';
const RIGHTS_HEADS = ['### Which right', '### どの権利か'];

/* Pure: whether an issue (as GitHub gives it, or as the search gives it) is a notice from a rights holder. */
function rightsNotice(issue) {
  const labels = ((issue && issue.labels) || []).map((l) => (typeof l === 'string' ? l : l && l.name));
  const body = String((issue && issue.body) || '').replace(/\r\n/g, '\n');
  return labels.includes(RIGHTS_LABEL) || RIGHTS_HEADS.some((h) => body.split('\n').includes(h));
}

module.exports = { RIGHTS_PHRASE, RIGHTS_BOX, RIGHTS_LABEL, RIGHTS_HEADS, rightsNotice };
