# Contributing to PacEditor

Thanks for helping. Bug reports, documentation fixes, new blocks and features are all welcome.

## Before you start

- **Bugs**: search the [issues](https://github.com/chooyee/pac-editor/issues) first. If it is new, open one with steps to reproduce, what you expected, what happened, and your browser.
- **Features**: open an issue to discuss the idea before writing a large change, so we can agree on the approach.
- **Security problems**: do not open a public issue. See [SECURITY.md](SECURITY.md).

## Setting up

You need Node.js 22 or later for development. (The `render` entry itself runs on any modern JavaScript runtime.)

```sh
git clone https://github.com/chooyee/pac-editor.git
cd pac-editor
npm install
npm run dev      # rebuilds on change, serves http://localhost:8000/examples/
npm test         # unit tests
npm run build    # writes dist/
```

Read [docs/architecture.md](docs/architecture.md) for a tour of the code.

## Making a change

1. Create a branch from `main`.
2. Keep the change focused: one fix or feature per pull request.
3. Follow the project rules:
   - Code in `src/core` and `src/blocks` must not touch the DOM; it has to run on servers.
   - In `render` functions, escape values with `esc()`, check URLs with `safeUrl()`, and use fixed lists for `style` and `class` values.
   - Scope CSS under `.fp-editor` or `.fp-site`, prefix classes with `fp-`, and use `--fp-*` variables for colours.
   - In the editor, look up elements with `this.$()`, and register document-level listeners with `this.listen()`.
   - Match the existing code style: 2-space indent, single quotes, semicolons, and short comments that explain *why*.
4. Add or update tests in `test/` for core changes. Built-in blocks need a test with hostile input.
5. Try your change in the examples, on a wide screen and a narrow one, in light and dark themes.
6. Update the documentation in `docs/` and the type definitions in `types/` if you changed the API.
7. Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(blocks): add Video block
fix(editor): keep focus in rich text after undo
docs: explain custom fields
```

Use `feat!:` or a `BREAKING CHANGE:` footer for changes that break the public API or the data format.

## Pull requests

- Describe what changed and why, and link the issue.
- Include a screenshot or short recording for visual changes.
- CI must pass (tests and build).
- A maintainer will review. Small follow-up commits are fine; we squash when merging.

## Releasing (maintainers)

1. Move the **Unreleased** notes in `CHANGELOG.md` to a new version heading.
2. `npm version <patch|minor|major>`. This updates `package.json` and creates a tag.
3. `git push --follow-tags`. The release workflow publishes to npm with provenance.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
