#!/usr/bin/env node
/* Whether the public parts of an issue may be given to a language model to help the review (Moderation Policy, "Decisions";
 * Privacy Policy, "Language models in the review").
 *
 *   node tools/llm.js 42        (GITHUB_REPOSITORY and GITHUB_TOKEN set, as for the other tools)
 *
 * The operator gives a submission to Claude (Anthropic), ChatGPT (OpenAI) and Grok (xAI) by hand, in the chat of each service.
 * Since 2026-11-15 the operator does so only when every GitHub account whose writing is in the issue has consented: the
 * submitter by the box of the form on services outside Japan, anyone else by a comment with the fixed words CONSENT (or its
 * Japanese translation), and, from 2026-12-01, a co-author by the fixed words of the checked intake (tools/intake.js,
 * AGREE_CHECKED), which carry the same consent. A comment of a bot, or of the operator's own account, is not counted as the
 * writing of another person. If one account has not consented, nothing is given: a person reviews the issue, or it waits.
 * Nothing here sends anything to a language model; it only reads the issue and its comments, and prints the result for the
 * operator. It keeps nothing. The owner decided this on 2026-11-15 (docs/legal-audit-2026-11-12.md, 「2026-11-15：点検の答え」).
 */
'use strict';
const I = require('./intake.js');

const { CONSENT, CONSENT_JA } = require('./words.js');
const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

/* Pure: the box of the submission form by which the submitter consents to the review by the three providers, in either language. */
const REVIEW_BOX = I.BOXES.consent.find((b) => /Anthropic/.test(b[0]));
function submitterConsents(body) {
  if (!REVIEW_BOX) return false;
  const t = new Set(I.tickedIn(body));
  return t.has(REVIEW_BOX[0]) || t.has(REVIEW_BOX[1]);
}

/* Pure: whether a comment carries one of the fixed words of consent. */
const consentsIn = (body) => [CONSENT, CONSENT_JA, I.AGREE_CHECKED].some((w) => squash(body).includes(squash(w)));

/* Pure: { ok, missing } for an issue and its comments. `owner` is the operator's account. Every account that wrote the issue or
 * a comment, other than a bot and the operator, must have consented; `missing` lists the accounts that have not. */
function mayPass({ issue, comments = [], owner = '' }) {
  const isOwner = (login) => !!owner && String(login || '').toLowerCase() === String(owner).toLowerCase();
  const writers = new Map();
  const note = (login, yes) => { if (!login) return; writers.set(login, writers.get(login) || yes); };
  if (issue && issue.user && issue.user.type !== 'Bot' && !isOwner(issue.user.login)) note(issue.user.login, submitterConsents(issue.body));
  for (const c of comments) {
    if (!c.user || c.user.type === 'Bot' || isOwner(c.user.login)) continue;
    note(c.user.login, consentsIn(c.body));
  }
  /* A consent given in any comment of the account counts for all its writing in the issue. */
  for (const c of comments) if (c.user && writers.has(c.user.login) && consentsIn(c.body)) writers.set(c.user.login, true);
  const missing = [...writers].filter(([, yes]) => !yes).map(([login]) => login);
  return { ok: missing.length === 0 && writers.size > 0, missing, writers: writers.size };
}

async function main() {
  const n = Number(process.argv[2]);
  if (!Number.isInteger(n) || n < 1) throw new Error('give the number of the issue');
  const SITE = require('../site.json');
  const issue = await I.github('GET', '/issues/' + n);
  if (!issue) throw new Error('no such issue');
  const comments = (await I.github('GET', '/issues/' + n + '/comments?per_page=100')) || [];
  const r = mayPass({ issue, comments, owner: SITE.operator.github });
  console.log(r.ok ? 'May be given: every one of the ' + r.writers + ' accounts that wrote in #' + n + ' has consented.'
    : 'Not to be given: ' + r.missing.length + ' of the ' + r.writers + ' accounts that wrote in #' + n + ' have not consented. A person reviews it, or it waits.');
  process.exitCode = r.ok ? 0 : 3;
}

module.exports = { CONSENT, CONSENT_JA, mayPass, submitterConsents, consentsIn, REVIEW_BOX };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
