# Releasing

A GitHub Action (`.github/workflows/release.yml`) handles releases automatically. **Do not create releases manually with `gh release create`.**

## Steps

1. Bump `version` in both `package.json` and `public/manifest.json`
2. Commit: `chore: bump version to X.Y.Z`
3. Tag and push:
   ```bash
   git tag vX.Y.Z
   git push origin main --tags
   ```

The Action runs tests, builds, packages `openheaders-vX.Y.Z.zip`, generates a changelog from commits, and creates the GitHub release with the artifact attached.
