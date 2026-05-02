# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

## Creating a changeset

```bash
pnpm changeset
```

Follow the prompts to describe your change and select which packages to bump.

## Releasing

```bash
pnpm version-packages    # bump versions + update changelogs
pnpm release             # publish to npm
```
