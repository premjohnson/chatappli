# Contributing to ChatAppli

First off, thank you for taking the time to contribute to **ChatAppli**! 🎉

We appreciate contributions of all kinds, including bug reports, feature requests, documentation improvements, performance optimizations, security enhancements, and code contributions.

---

## Table of Contents

- Getting Started
- Development Setup
- Branching Strategy
- Coding Standards
- Commit Message Convention
- Pull Request Process
- Reporting Bugs
- Suggesting Features
- Security Issues
- License

---

# Getting Started

Before contributing, please:

- Read the README.md
- Read the CODE_OF_CONDUCT.md
- Search existing Issues before creating a new one

---

# Development Setup

## 1. Fork the repository

```bash
git clone https://github.com/premjohnson/chatappli.git
```

## 2. Install dependencies

Backend

```bash
cd backend
npm install
```

Frontend

```bash
cd frontend
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
PORT=5000
MONGODB_URI=your_database_url
JWT_SECRET=your_secret
REDIS_URL=your_redis_url
```

Do **NOT** commit `.env` files.

---

## 4. Start the application

Backend

```bash
npm run dev
```

Frontend

```bash
npm run dev
```

---

# Branching Strategy

Never commit directly to `main`.

Create a feature branch:

```bash
git checkout -b feature/awesome-feature
```

Examples

```
feature/chat-search
feature/read-receipts
fix/socket-reconnect
docs/update-readme
```

---

# Coding Standards

Please follow these practices:

- Use meaningful variable names
- Write modular code
- Keep functions small
- Prefer async/await over promise chains
- Handle errors properly
- Remove dead code
- Add comments only when necessary
- Follow existing project structure

---

# Commit Message Convention

Examples:

```
feat: add typing indicator

fix: resolve socket reconnect issue

docs: update installation guide

refactor: optimize message service

test: add authentication tests
```

---

# Pull Request Process

Before submitting a Pull Request:

- Ensure the project builds successfully
- Run all tests
- Update documentation if necessary
- Keep PRs focused on a single feature or fix

Include:

- Description
- Screenshots (if applicable)
- Related Issue

---

# Reporting Bugs

When reporting bugs, include:

- Expected behavior
- Actual behavior
- Steps to reproduce
- Environment
- Screenshots (if available)

---

# Suggesting Features

Feature requests should include:

- Problem statement
- Proposed solution
- Alternative approaches
- Additional context

---

# Security Issues

Please **DO NOT** create public GitHub issues for security vulnerabilities.

Instead, contact the maintainers privately so the issue can be addressed responsibly.

---

# License

By contributing to ChatAppli, you agree that your contributions will be licensed under the project's license.

Thank you for helping improve ChatAppli! ❤️
