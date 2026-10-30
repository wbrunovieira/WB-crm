# Contributing to WB-crm

Thanks for your interest in contributing. This project is MIT-licensed, and
contributions are welcome through GitHub issues and pull requests.

## How we work

1. **One issue per workstream.** Open or comment on an issue so we agree on
   scope before code is written. For anything non-trivial, a short discussion
   on the issue saves a large rewrite on the PR.
2. **One pull request per issue**, against `main`. Keep PRs focused; a smaller
   PR gets reviewed faster than a large one.
3. **Tests.** Backend changes follow TDD (value objects, then use cases with
   in-memory fakes, then e2e against a test database). A PR that changes
   behaviour should carry the test that proves it.
4. **Language.** Code, comments, and commit messages are in English. UI strings
   are localized (pt-BR and others) through the i18n layer, not hardcoded.

## Developer Certificate of Origin (DCO)

To keep the provenance of the code clean, every commit must be signed off. By
signing off, you certify that you wrote the change or otherwise have the right
to submit it under the project's MIT license (the full text is the standard
Developer Certificate of Origin 1.1, https://developercertificate.org/).

Sign off by adding a line to your commit message:

```
Signed-off-by: Your Name <your.email@example.com>
```

Git adds this automatically with the `-s` flag:

```
git commit -s -m "your message"
```

The name and email must match the commit author. A PR whose commits are not
signed off can't be merged, but it's a one-line fix with `git rebase` if you
forget.

## Scope

The project is moving from an IT-consultancy-specific CRM toward a generalist,
self-hostable Pipedrive alternative. Consultancy-specific features (tech-stack
tracking, tech profiles, Brazilian CNAE classification) are being moved behind
an optional layer rather than removed. When proposing a feature, a useful test
is: would a CRM user in an unrelated domain want it in the core, or is it better
as an optional module or integration? The second kind is still welcome, just in
a different place.

## Questions

Open an issue. For anything security-related, see the note below.

## Security

Please do not open a public issue for a suspected vulnerability, and do not test
exploits against the live instance. Report it privately to the maintainer so it
can be fixed before the details are public.
