'use strict';
/* Fixed words that name the providers of language models, kept apart from the code that checks submissions, which calls no
 * language model (verification/check.js holds tools/intake.js to that).
 *
 * AGREE_CHECKED: from SITE.checkedFrom (2026-12-01), the words with which a co-author confirms their agreement also consent to
 * the review by the three providers, after the information that Article 28(2) of Japan's APPI asks, which the Privacy Policy
 * gives under "Services outside Japan" (the owner decided this on 2026-11-15).
 * CONSENT and CONSENT_JA: the words with which anyone else who writes in an issue consents to the same (tools/llm.js). */
const AGREE_CHECKED = 'I agree to the listing of this work on Sophaxis, and I consent to the public parts of this submission, what I write in its issue among them, being given, for help with the review, to Anthropic, OpenAI and xAI in the United States, as the Privacy Policy of Sophaxis sets out under "Services outside Japan".';
const CONSENT = 'I consent to what I have written in this issue being given, for help with the review, to Anthropic, OpenAI and xAI in the United States, as the Privacy Policy of Sophaxis sets out under "Language models in the review".';
const CONSENT_JA = 'この issue に私が書いたものが、審査の手助けのために、Sophaxis の個人情報の取り扱いについての「審査での言語モデル」が定めるとおり、米国の Anthropic・OpenAI・xAI に渡されることに同意します。';
module.exports = { AGREE_CHECKED, CONSENT, CONSENT_JA };
