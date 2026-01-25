---
trigger: always_on
glob: "**/*"
description: Design and planning rules for the Kakidash project, covering architecture, communication, and coding standards.
---

# Design and Planning Rules

## 0. Mandatory Communication Rules (Absolute)
- **Output Language**: All user-facing content (responses, explanations, reports) MUST be delivered in Japanese.
- **Planning Language**: Implementation plans (`implementation_plan.md`), task lists (`task.md`), and walkthroughs (`walkthrough.md`) MUST be written in Japanese.
- **Notification Protocol**: Before requesting user confirmation, command approval, or reporting task completion on the platform, you MUST use the `notification` skill to send a message to Discord. This ensures the user is alerted to the pending request or status update.

## 1. Architecture Principles (Clean Architecture)
- **Dependency Rule**: Dependencies must only point inwards. Outer layers (Presentation, Infrastructure) can depend on inner layers (Application, Domain), but never vice-versa.
- **Layer Responsibilities**:
    - **Domain**: Pure business logic and entities. No external dependencies.
    - **Application**: Use cases and service orchestration.
    - **Presentation**: UI rendering (SVG), user input handling, and controllers.
    - **Infrastructure**: Concrete implementations of domain/application interfaces (e.g., Disk I/O, Browser APIs).
- **Dependency Inversion**: Always depend on interfaces/abstractions rather than concrete implementations for cross-layer communication.

## 2. Component Design
- **Single Responsibility Principle (SRP)**: Each class or module should have one, and only one, reason to change.
- **State Management**: The Domain layer (`MindMap`, `Node`) should hold the source of truth. The Presentation layer should reflect this state.
- **Event-Driven**: Use `EventEmitter` or similar patterns for decoupled communication between components when direct calls violate architectural boundaries.

## 3. Planning Requirements
- **Impact Analysis**: Before implementing changes, identify which layers and components are affected.
- **Interface First**: Define or update interfaces in the Domain/Application layers before implementation in the Infrastructure/Presentation layers.
- **Visual Documentation**: Use Mermaid diagrams in documentation (`docs/*.md`) to represent complex logic or architectural changes.
- **Documentation Synchronicity**: Any code addition or modification MUST be accompanied by updates to relevant documentation. This requirement must be explicitly included in the implementation plan.
    - **README**: Update usage, features, or installation instructions if external interfaces or behaviors change.
    - **Architecture Documentation**: Update `docs/SOFTWARE_ARCHITECTURE_ja.md` and related documents if there are structural or architectural changes.
    - **API Documentation (TypeDoc)**: Ensure all classes, methods, and types have up-to-date TSDoc comments.

## 4. Coding Standards
- **Type Safety**: Avoid `any`. Use strict TypeScript types and interfaces.
- **Immutability**: Prefer immutable data structures where possible, especially for state updates to ensure predictable behavior.
- **Naming**: Use descriptive names. Classes should be nouns, methods should be verbs.

## 5. Testing Strategy
- **Unit Tests**: Mandatory for Domain and Application layers. Focus on business logic correctness.
- **Integration/E2E Tests**: Required for Presentation layer components (e.g., `SvgRenderer`) to ensure correct rendering and interaction.
- **Regression**: All new features must include corresponding tests to prevent regressions.
