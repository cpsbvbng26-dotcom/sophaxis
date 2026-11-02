# Contributing to Sophaxis

Sophaxis is run by one person, Takuya Nemoto. Contributions are welcome, and this page says where each kind goes.

## Which way to go

| What | Where |
| --- | --- |
| Submit a preprint or a new version | [The submission form](https://github.com/cpsbvbng26-dotcom/sophaxis/issues/new?template=submission.yml). The steps are on [From submission to listing](https://sophaxis.vercel.app/process.html). |
| An error in a record | [The correction form](https://github.com/cpsbvbng26-dotcom/sophaxis/issues/new?template=correction.yml), or the link at the foot of the record page |
| Withdraw a work, as one of its authors | [The withdrawal form](https://github.com/cpsbvbng26-dotcom/sophaxis/issues/new?template=withdrawal.yml) |
| Removal for legal reasons | [The removal form](https://github.com/cpsbvbng26-dotcom/sophaxis/issues/new?template=removal.yml) |
| A bug, a question or a suggestion | [An issue](https://github.com/cpsbvbng26-dotcom/sophaxis/issues/new) |
| A security problem, or anything that should not be public | Email to the address on the operator's [ORCID record](https://orcid.org/0009-0000-1406-0547), not an issue |
| A change to the code, the policies or the pages | A pull request, as below |

Issues are public. Do not put personal data in them.
Write in English or Japanese. The operator aims to answer within 7 days.

## Changing the code or the pages

1. Fork the repository and make a branch.
2. Edit the sources, not the generated site. `site/` and `site/vercel.json` are generated from `site.json`, `policy.md`, `policies/`, the other `.md` pages and `data/papers/`.
3. Run the build and the checks. There are no dependencies to install; Node.js 22 is enough.

   ```
   node build.js
   node verification/check.js
   ```

4. Commit the sources and the generated `site/` in separate commits.
5. Open a pull request. Say what changed and why. The same checks run on GitHub Actions.

A change to a policy also changes its "Last updated" date.
A check is never loosened to make a change pass. If a check fails, fix the change, or explain in the pull request why the check is wrong.
The site loads nothing from other servers, and every page forbids scripts except the search page. Keep it that way.

## Language models and other generative models

Sophaxis was built with Claude Code (Anthropic), and this is disclosed on every page.
A contribution made with a generative model is welcome on the same terms as a submission: say which model and what it did, and check the result yourself.
A generative model is never listed as an author or a contributor.

## Licence

By contributing, you agree that your contribution is shared under the licences of the repository: the code under MIT ([LICENSE](LICENSE)), and the text of the site and the policies under CC BY 4.0.

## Conduct

Be civil. Criticism of the work is welcome; attacks on people are not.
Threats, harassment, impersonation and personal data shared without consent are removed from the issues and pull requests.

## Support

Help is given in the issues, by the operator, as time allows.
What Sophaxis does not promise is in the [Disclaimer](https://sophaxis.vercel.app/disclaimer.html).
