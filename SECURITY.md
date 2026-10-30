# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | Yes |

Before 1.0, only the latest minor version gets security fixes.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report privately through [GitHub security advisories](https://github.com/chooyee/pac-editor/security/advisories/new), or email **SECURITY_CONTACT_EMAIL**. Include:

- what the problem is and what an attacker could do with it,
- steps or page data that reproduce it,
- the PacEditor version and browser.

We aim to reply within 3 working days and to ship a fix, or a plan, within 30 days. We will credit you in the release notes unless you prefer not to be named.

## Scope

Most relevant are ways for page data to run script or load unexpected content when rendered by `render()` or shown in the editor, ways around `safeUrl`, `renderRich` or `validateData`, and ways for one editor instance to affect another.

Problems in custom blocks that do not follow the rules in [docs/security.md](docs/security.md) are out of scope.
