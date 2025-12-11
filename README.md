# SE_Team_6_Project_Coffee_App

## Getting Started

> **Please note:** all active development lives in the `dev` branch.
> Before you begin, switch to that branch:

```bash
git checkout dev
```
---

## Development Guidelines

> **Important:** Please never commit directly to the `main` branch and always request a review by opening a **Pull Request**!

### Branch Naming

| Prefix      | Description                     |
| ----------- | ------------------------------- |
| `feature/`  | New breaking changes & features |
| `refactor/` | Refactors & optimization        |
| `hotfix/`   | Quick 'n' dirty fix             |
| `bugfix/`   | Fixes for known bugs            |
| `chore/`    | If nothing fits the category    |

**Example Branches:**

```
feature/auth-flow
refactor/composables
hotfix/api-fix
bugfix/form-validation
chore/everything-else
```

### Commit Style

Use the following conventional commit prefixes to keep history clear and consistent:

* `feat:`    add auth middleware         *// this commit completes a new feature*
* `fix:`    resolve form validation    *// this commit fixes a bug*
* `refactor:` optimize API calls      *// this commit rewrites/optimizes a feature*
* `chore:` this is a normal commit         *// this commit is for everything else*
