---
description: Perform version bump and release preparation
---

// turbo-all
1. **Cleanup and Update Environment**
   Ensure the working tree is clean with `git status`, then switch to the main branch and pull the latest changes using `git checkout main && git pull origin main`.

2. **Create Release Branch**
   Confirm the new version (e.g., 0.1.0) with the user and execute `git checkout -b release/v[VERSION]`.

3. **Update CHANGELOG**
   Append the changes for this version (Features, Fixes, Chores, etc.) to `CHANGELOG.md` and `CHANGELOG_ja.md`. Create these files if they do not exist.

4. **Bump Version**
   Update the `"version"` property in `package.json` to the new version.

5. **Update Dependencies and Lockfile**
   Run `pnpm install` to synchronize `pnpm-lock.yaml`.

6. **Final Quality Check (CI)**
   Execute `pnpm turbo:ci` and ensure that build, test, lint, type check, and documentation generation all pass successfully.

7. **Commit and Push Changes**
   Run `git add . && git commit -m "chore: release v[VERSION]"` and push to the remote repository with `git push origin release/v[VERSION]`.

8. **Release Notification**
   Once pushed, instruct the user to create a Pull Request on GitHub. Merging into `main` will trigger the `release.yml` workflow, automatically tagging and publishing to npm.
