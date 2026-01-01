# Release Process

This project uses automated releases based on [Conventional Commits](https://www.conventionalcommits.org/) and [Semantic Release](https://semantic-release.gitbook.io/).

## How It Works

1. **Commit with Conventional Commits**: All commits to the `main` branch should follow the conventional commits format
2. **Automatic Versioning**: Semantic Release analyzes commits and determines the next version number
3. **Automatic Tagging**: A new git tag is created automatically
4. **Multi-Platform Builds**: Electron distributions are built for Windows, macOS, and Linux
5. **GitHub Release**: A GitHub release is created with all distribution files attached

## Conventional Commits Format

Commits should follow this format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types and Version Impact

- `feat:` - A new feature (triggers **MINOR** version bump, e.g., 1.0.0 → 1.1.0)
- `fix:` - A bug fix (triggers **PATCH** version bump, e.g., 1.0.0 → 1.0.1)
- `perf:` - Performance improvement (triggers **PATCH** version bump)
- `refactor:` - Code refactoring (triggers **PATCH** version bump)
- `docs:` - Documentation changes (no version bump)
- `style:` - Code style changes (no version bump)
- `test:` - Test changes (no version bump)
- `chore:` - Build process or auxiliary tool changes (no version bump)
- `ci:` - CI configuration changes (no version bump)

### Breaking Changes

To trigger a **MAJOR** version bump (e.g., 1.0.0 → 2.0.0), include `BREAKING CHANGE:` in the commit footer or add `!` after the type:

```
feat!: redesign user interface

BREAKING CHANGE: The entire UI has been redesigned and old configurations are not compatible
```

## Examples

### Feature Addition (Minor Version Bump)
```
feat: add dark mode toggle

Adds a dark mode toggle to the settings panel that persists user preference
```

### Bug Fix (Patch Version Bump)
```
fix: resolve crash on startup with invalid config

Fixes issue where app would crash if config file was corrupted
```

### Breaking Change (Major Version Bump)
```
feat!: migrate to new configuration format

BREAKING CHANGE: Configuration file format has changed from JSON to YAML.
Users will need to migrate their config files manually.
```

### Non-Release Commits
```
docs: update installation instructions

chore: update dependencies

test: add unit tests for settings module
```

## Release Workflow

### Automated Process

1. Push commits to `main` branch following conventional commits format
2. Semantic Release workflow runs automatically
3. If releasable commits are found:
   - Version number is determined
   - CHANGELOG.md is updated
   - Git tag is created (e.g., `v1.2.3`)
   - Release workflow is triggered
4. Release workflow builds distributions for:
   - **Windows**: `.exe` installer (x64 and arm64)
   - **macOS**: `.dmg` file (x64 and arm64)
   - **Linux**: AppImage and `.deb` package
5. All artifacts are uploaded to the GitHub release

### Manual Release

If you need to manually create a release:

1. Ensure all changes are committed and pushed
2. Create and push a tag following semantic versioning:
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```
3. The release workflow will automatically build and publish

## Platform-Specific Build Details

### Windows
- Format: NSIS installer
- Architectures: x64, arm64
- Output: `PromptMux-Setup-{version}.exe`

### macOS
- Format: DMG
- Architectures: x64 (Intel), arm64 (Apple Silicon)
- Output: `PromptMux-{version}.dmg`
- Note: Code signing is disabled by default (set `CSC_IDENTITY_AUTO_DISCOVERY=false`)

### Linux
- Formats: AppImage, Debian package
- Architecture: x64
- Outputs:
  - `PromptMux-{version}.AppImage`
  - `promptmux_{version}_amd64.deb`

## Troubleshooting

### Release Not Triggered

- Ensure commits follow conventional commits format exactly
- Check that commits include types that trigger releases (`feat`, `fix`, etc.)
- Verify you're pushing to the `main` or `master` branch

### Build Failures

- Check GitHub Actions logs for specific errors
- Ensure `package.json` version is valid
- Verify all dependencies are properly installed

### Missing Artifacts

- Check electron-builder configuration in `package.json`
- Verify output directory is `release/`
- Check file naming in the release workflow matches actual output

## Configuration Files

- `.releaserc.json` - Semantic Release configuration
- `.github/workflows/semantic-release.yml` - Automated version and tag creation
- `.github/workflows/release.yml` - Multi-platform build and release
- `package.json` - electron-builder configuration under `build` key
