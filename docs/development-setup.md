# Development Setup & Recommended Tools

This document covers setting up your development environment with recommended tools and workflows for **Containment Protocol** development.

## Quick Setup Checklist

- [ ] Node.js 22 installed (verify with `node --version`)
- [ ] Dependencies installed (`npm ci`)
- [ ] VS Code extensions installed (notification will appear)
- [ ] `.env.local` configured (already done, review if needed)
- [ ] Dev server starts (`npm run dev`)
- [ ] Tests pass (`npm run test:run`)
- [ ] Linting passes (`npm run lint`)

## Recommended Tools & Extensions

### VS Code Extensions

**Auto-installed from `.vscode/extensions.json`:**

1. **ESLint** (`dbaeumer.vscode-eslint`) - Real-time linting
2. **Prettier** (`esbenp.prettier-vscode`) - Code formatting
3. **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) - Tailwind class suggestions
4. **Vitest** (`vitest.explorer`) - Test runner UI
5. **TypeScript 5.6** (`ms-vscode.vscode-typescript-next`) - Latest TypeScript features

**Additional Recommended:**

1. **GitLens** (`eamodio.gitlens`) - Git history & blame
2. **GitHub Copilot** (`GitHub.copilot`) - AI code suggestions
3. **EditorConfig** (`EditorConfig.EditorConfig`) - Consistent editor settings
4. **REST Client** (`humao.rest-client`) - Test API requests

### Command-Line Tools

#### Node Version Manager

**macOS/Linux:**

```bash
# Using nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22
nvm alias default 22
```

**Windows:**

```powershell
# Using fnm (Fast Node Manager) - Recommended
scoop install fnm
fnm install 22
fnm use 22

# Or download nvm-windows from:
# https://github.com/coreybutler/nvm-windows/releases
```

#### npm Configuration

Verify npm audit is configured to catch vulnerabilities:

```bash
npm config get audit-level  # Should show "moderate" or higher
npm audit                   # Check current vulnerabilities
npm audit fix              # Auto-fix where possible
```

## Development Workflow

### 1. Start Development Session

```bash
# Navigate to project
cd containment-protocol

# Ensure correct Node.js version
nvm use  # or fnm use

# Install dependencies (if first time or after branch switch)
npm ci

# Start dev server
npm run dev
```

Dev server will be available at [http://localhost:5173](http://localhost:5173)

### 2. Before Each Commit

Run validation checks:

```bash
# Run all checks
npm run lint
npm run format:check
npm run test:run

# Or use npm run format to auto-fix formatting issues
npm run format
```

### 3. TypeScript Type Checking

During development:

```bash
# Type-check while editing
npm run build  # Includes full type checking

# Watch mode is not available for tsc, but:
# - Dev server provides HMR feedback
# - IDE provides real-time diagnostics
# - Run build before committing
```

### 4. Debugging

#### Browser DevTools

1. Start dev server: `npm run dev`
2. Open [http://localhost:5173](http://localhost:5173)
3. Press `F12` or `Ctrl+Shift+I` to open DevTools
4. Use **Sources** tab to set breakpoints

#### VS Code Debugger

**For React Components:**

1. Open `.vscode/launch.json`
2. Select "Launch Chrome via Dev Server" and press `F5`
3. Set breakpoints in TypeScript files
4. Changes will auto-reload

**For Tests:**

```bash
# In VS Code terminal
npm run test -- --inspect-brk

# Then in another terminal, or use VS Code debugger config "Debug Tests"
```

## Best Practices

### Type Safety

1. **Always use `import type` for type-only imports:**

   ```typescript
   // ✅ Correct
   import type { GameState } from './domain/models'

   // ❌ Wrong - causes "export not found" at runtime in Vite
   import { GameState } from './domain/models'
   ```

2. **Strict null checking:**
   - Trust TypeScript strict mode
   - Don't use `!` (non-null assertion) unless absolutely necessary
   - Use type guards instead

### Component Development

1. **Test-driven approach:**

   ```bash
   npm run test -- ComponentName  # Watch tests for this component
   npm run dev                     # Dev server in another terminal
   ```

2. **Use React Router for navigation:**
   - Check `src/features/routes.tsx` for existing routes
   - Follow established patterns

3. **State management with Zustand:**
   - Store is in `src/app/store/gameStore.ts`
   - Avoid mutating state directly
   - Use immer middleware for nested updates if needed

### Testing

```bash
# Watch mode for development
npm run test

# Run specific test file
npm run test -- affiliationPersonStatusMirrorView.test.tsx

# Generate coverage report
npm run coverage
```

**Test conventions:**

- Place test files next to source files with `.test.ts` or `.test.tsx` suffix
- Use `describe` blocks to organize related tests
- Use `it` for individual test cases
- Aim for >80% coverage on new code

### Code Quality

1. **ESLint violations:**

   ```bash
   # View all violations
   npm run lint

   # Some issues can be auto-fixed
   npm run lint -- --fix
   ```

2. **Formatting with Prettier:**

   ```bash
   # Auto-format all files
   npm run format

   # Check without making changes
   npm run format:check
   ```

3. **Keep bundle size small:**
   - Use code splitting for routes
   - Lazy load components with `React.lazy()`
   - Check import sizes before adding dependencies

## Environment Variables Reference

| Variable              | Purpose                        | Default         |
| --------------------- | ------------------------------ | --------------- |
| `NODE_ENV`            | Build environment              | `development`   |
| `VITE_APP_VERSION`    | App version for display        | `1.0.0`         |
| `VITE_BUILD_DATE`     | Build timestamp                | Current date    |
| `PORT`                | Dev server port                | `5173`          |
| `VITE_SOURCE_MAP`     | Enable source maps             | `true`          |
| `VITE_DEV_MODE`       | Enable dev features            | `true`          |
| `DEBUG`               | Debug logging filter           | `containment:*` |
| `STRICT_TEST_CONSOLE` | Fail tests on console warnings | `0` (dev only)  |

To change, edit `.env.local` in the project root.

## Troubleshooting

### Port Already in Use

```bash
# Kill process using port 5173 (macOS/Linux)
lsof -ti:5173 | xargs kill -9

# On Windows, check Task Manager or:
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Node Version Mismatch

```bash
# Check current version
node --version

# Switch to correct version
nvm use 22  # or fnm use 22

# Check .nvmrc is readable
cat .nvmrc  # Should show "22"
```

### Tests Failing with "export not found"

This usually means type-only imports aren't using `import type`:

```typescript
// ❌ Wrong
import { MyInterface } from './types'

// ✅ Correct
import type { MyInterface } from './types'
```

Fix: `npm run lint -- --fix`

### Performance Issues

1. **Slow tests:**

   ```bash
   npm run test:run -- --reporter=verbose
   ```

2. **Slow dev server:**
   - Check file watchers: `cat /proc/sys/fs/inotify/max_user_watches` (Linux)
   - Increase limit if needed: `echo 'fs.inotify.max_user_watches=524288' | sudo tee -a /etc/sysctl.conf`

### IDE Issues

**VS Code not showing type errors:**

- Run: `cmd+shift+p` → "TypeScript: Restart TS Server"
- Or reload window: `cmd+shift+p` → "Developer: Reload Window"

**Extensions not loaded:**

- Install: `cmd+shift+x` → Search each extension
- Or: `code --install-extension <extension-id>`

## Git Workflow

### Before Pushing

```bash
# Ensure all checks pass
npm run lint              # ESLint
npm run format:check      # Prettier formatting
npm run test:run          # All tests
npm run build            # TypeScript compilation

# If any fail, fix them:
npm run format            # Auto-format files
npm run lint -- --fix     # Auto-fix linting issues
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]
[optional footer]
```

Examples:

- `feat(domain): add welfare evidence repair workflow`
- `fix(store): correct property access in action`
- `test(mirror): add new evidence repair tests`
- `docs(setup): update environment guide`

## Performance Tips

1. **Use npm ci instead of npm install** - Ensures reproducible installs
2. **Keep dependencies up to date** - But test before upgrading
3. **Profile bundle size** - Use `npm run build` and check output
4. **Test coverage** - Run `npm run coverage` regularly
5. **Watch for circular dependencies** - ESLint can help detect these

## Additional Resources

- [README.md](../README.md) - Project overview
- [Architecture](../README.md#architecture) - Code organization
- [Contributing](../CONTRIBUTING.md) - Contributing guidelines
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Docs](https://react.dev)
- [Zustand Docs](https://github.com/pmndrs/zustand)

## Getting Help

1. Check this guide's troubleshooting section
2. Review GitHub Issues: [Issues](https://github.com/JamesJedi420/containment-protocol/issues)
3. Check recent commits: `git log --oneline -10`
4. Open a new issue with detailed reproduction steps

---

**Happy coding!** 🚀

For questions or suggestions about this guide, please open an issue or PR.
