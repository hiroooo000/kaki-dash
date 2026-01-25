---
trigger: always_on
glob: "**/*"
description: Implementation rules for the Kakidash project, emphasizing the notification protocol and incremental development.
---

# Implementation Rules

## 1. Command Authorization & Notification Protocol (CRITICAL RULE)
> [!IMPORTANT]
> **This is the most critical rule in the project. Failure to follow this protocol is UNACCEPTABLE.**

- **Pre-Authorization Notification**: Whenever you intend to propose a command for execution or ask for user approval/input, you are **STRICTLY REQUIRED** to execute the `notification` skill **IMMEDIATELY BEFORE** presenting the command or asking for approval on the platform.
    - **Protocol**:
        1. Identify the need for command execution or approval.
        2. Execute `python3 notification/scripts/notify_skill.py <Project Name> <Message>`.
        3. Present the command/question to the user in the Antigravity chat.
- **Explicit Feedback**: Do not complete tasks silently. Ensure the user is explicitly aware of the current status through both Antigravity chat and Discord notifications at every critical step.

## 2. Mandatory Pre-Implementation Protocol
- **Branch Confirmation**: Always ask the user whether to create a new branch or use the current one before starting any implementation.
- **Plan Approval**: NEVER modify code until the implementation plan has been presented and approved by the user.

## 3. Git Operations
- **Command Concatenation**:
    - PROHIBITED: Connecting `git` commands with non-git commands using `&&` (e.g., `npm test && git commit`). Execute them separately.
    - PERMITTED: Connecting multiple `git` commands with `&&` (e.g., `git add . && git commit`).
- **Language Requirements**:
    - Commit messages MUST be written in English.
    - Branch names MUST be written in English.

## 4. Mandatory Post-Implementation Verification
- **Verification Suite**: After implementation, you MUST run linting, building, and all relevant tests.
- **Error Handling**: If an issue occurs during verification, present at least two options for resolution and seek user confirmation.

## 5. Incremental Development & Testing
- **Small Steps**: Do not implement large features or complex fixes in a single massive step. Break down the task into the smallest possible functional increments.
- **Concurrent Updates**: For each small increment, modify both the implementation code and its corresponding test code simultaneously.
- **Incremental Quality**: Ensure each step is stable and verified before proceeding. Build quality incrementally through small, well-tested cycles.
