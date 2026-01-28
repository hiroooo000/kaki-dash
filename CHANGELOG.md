# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-01-28

### Added
- Node icon support (Check, Star, Warning, etc.).
- Command Palette (`m` key) for icon selection and node searching.
- Exposed icon update support in public API `Kakidash.updateNode`.
- Consistent icon resource management via `presentation/resources/Icons.ts`.

### Changed
- Refined Command Palette item styles (removed bold).
- Updated Software Architecture and README documentation to include icon features.

### Fixed
- Layout inconsistencies and width calculation for nodes with icons in `SvgRenderer`.
- Rendering crash when icon images failed to load.

## [0.1.0] - 2026-01-25

### Added
- Automated version-up workflow and project rules.
- Software architecture documentation with Mermaid diagrams.
- Pnpm and Turbo integration for build optimization and improved developer experience.
- New `IdGenerator` interface and `CryptoIdGenerator` implementation in the Infrastructure layer for cleaner architecture.
- Zoom reset functionality and enhanced shortcut key configurations.
- Custom style inheritance for border and connection lines.
- Detailed TSDoc comments for styling-related APIs.

### Changed
- Reorganized directory structure into separate `domain`, `application`, `presentation`, and `infrastructure` layers.
- Migrated from `npm` to `pnpm`.
- Enhanced `Kakidash` constructor to accept optional parameters like `maxNodeWidth` and `customStyles`.

### Fixed
- Double paste issue by removing redundant shortcut handling.
- Zooom reset view centering logic.
- Node background color issues in dark mode when embedded in VSCode.
- Vertical text rendering issue when `maxWidth` is applied.
- Refined fold logic for leaf nodes to prevent accidental folding.
