# Contributing to ai-ticket-node-vue

Thank you for your interest in contributing to **ai-ticket-node-vue**! This repository is the first project in a long-term series demonstrating AI-collaborative software development.

## Code of Conduct
By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs
If you find a bug, please open a GitHub Issue and include:
- A clear, descriptive title.
- Steps to reproduce the issue.
- Expected vs. actual behavior.
- Environment details (Node.js version, OS, browser, etc.).

### Suggesting Enhancements
We welcome feature suggestions! To suggest a feature, open an issue explaining:
- The goal or use case of the feature.
- How it should work (user flow or technical details).
- The value it adds.

### Submitting Pull Requests (PRs)
1. **Fork the Repository**: Create your own fork of `ai-ticket-node-vue`.
2. **Create a Branch**: Create a feature branch with a descriptive name (e.g., `feature/jwt-refresh` or `bugfix/comment-alignment`).
3. **Write Clean Code**: Ensure your changes align with the TypeScript/Vue style guidelines used in this project.
4. **Preserve the AI Workflow**: If you use an AI coding assistant (like Claude, Gemini, or Copilot), feel free to document your prompt sequence or task specifications under the `.claude/tasks/` directory if appropriate, keeping the historical workflow logs intact.
5. **Verify Your Changes**:
   - Ensure the backend compiles successfully (`npm run build` inside `/backend`).
   - Ensure the frontend builds successfully (`npm run build` inside `/frontend`).
   - Verify that all database migrations run cleanly.
6. **Submit PR**: Open a pull request against the `main` branch of the original repository. Write a detailed description of the changes made and link to any related issues.

## Git Style Guidelines
- Use clear, imperative commit messages (e.g., `Add search pagination` instead of `added pagination`).
- Keep commits focused and atomic (avoid combining unrelated features in a single commit).
