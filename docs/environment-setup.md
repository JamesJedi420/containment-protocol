# Environment Setup Guide

This guide helps you set up your local development environment for **Containment Protocol** development.

## Prerequisites

### Node.js Version Management (Recommended)

To ensure all developers use the same Node.js version, we recommend installing a Node.js version manager:

#### macOS/Linux: nvm (Node Version Manager)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Load nvm
source ~/.bashrc  # or ~/.zshrc for zsh

# Install Node.js 22
nvm install 22

# Set it as the default
nvm alias default 22
```

#### Windows: fnm or nvm-windows

##### Option A: fnm (Fast Node Manager - Recommended for Windows)

```powershell
# Install fnm via Scoop or Chocolatey
scoop install fnm

# Install Node.js 22
fnm install 22
fnm use 22

# Set as default
fnm default 22
```

##### Option B: nvm-windows

Download from: [nvm-windows releases](https://github.com/coreybutler/nvm-windows/releases)

```cmd
nvm install 22.0.0
nvm use 22.0.0
```

### Node.js Direct Installation

If you prefer not to use a version manager, download Node.js 22 LTS from [nodejs.org](https://nodejs.org/).

**Verify installation:**

```bash
node --version  # Should show v22.x.x
npm --version   # Should show 10.x.x or higher
```

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/JamesJedi420/containment-protocol.git
cd containment-protocol
```

### 2. Use Correct Node.js Version

If using nvm/fnm:

```bash
# Automatically uses version from .nvmrc
nvm use
# or
fnm use
```

### 3. Install Dependencies

```bash
npm ci  # Prefer 'ci' over 'install' in CI/local setup for reproducibility
```

### 4. Configure Environment Variables

The `.env.local` file is already created with recommended defaults. No additional configuration needed for basic local development.

**To customize**, edit `.env.local`:

```bash
# Optional: Edit environment variables
# PORT=5173 (default)
# DEBUG=containment:* (debugging logs)
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## VS Code Configuration

### 1. Install Recommended Extensions

When you open the workspace in VS Code, you'll see a notification to "Install recommended extensions". Click to install, or manually install:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension vitest.explorer
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension eamodio.gitlens
code --install-extension GitHub.copilot
code --install-extension GitHub.copilot-chat
```

### 2. Workspace Settings (Auto-applied)

The workspace automatically applies these settings from `.vscode/settings.json`:

- **Prettier** as default formatter with format-on-save
- **ESLint** configured to auto-fix on save
- **Tailwind CSS** IntelliSense enabled
- **TypeScript** using workspace version
- **Python** environment file support

### 3. Debugging Configuration

VS Code launch configurations are pre-configured in `.vscode/launch.json`:

- **Debug Dev Server** - Attach to running browser
- **Launch Chrome via Dev Server** - Start fresh browser session
- **Debug Tests** - Run tests in debugger

To start debugging:

1. Press `F5` to launch Chrome via dev server
2. Or use "Debug Dev Server" to attach to existing dev server
3. Set breakpoints in TypeScript/React code

## Common Development Commands

| Command                | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Start Vite dev server with HMR              |
| `npm run build`        | Production build (type checking + bundling) |
| `npm run lint`         | Run ESLint                                  |
| `npm run format`       | Auto-format with Prettier                   |
| `npm run format:check` | Check formatting without changes            |
| `npm run test`         | Run tests in watch mode                     |
| `npm run test:run`     | Run all tests once                          |
| `npm run coverage`     | Generate coverage report                    |
| `npm run preview`      | Preview production build                    |

## EditorConfig

This project uses `.editorconfig` to maintain consistent formatting across different editors:

- **Charset**: UTF-8
- **Line endings**: LF (Unix)
- **Tab size**: 2 spaces
- **Trim trailing whitespace**: Yes (except markdown)
- **Insert final newline**: Yes

Most editors automatically respect `.editorconfig`. For VS Code, install the [EditorConfig extension](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig).

## Environment Variables Explained

| Variable                 | Purpose                                  | Default                 |
| ------------------------ | ---------------------------------------- | ----------------------- |
| `NODE_ENV`               | Build target environment                 | `development`           |
| `PORT`                   | Dev server port                          | `5173`                  |
| `VITE_SOURCE_MAP`        | Enable source maps for debugging         | `true`                  |
| `VITE_SOURCE_MAP_INLINE` | Inline source maps in bundle             | `false`                 |
| `STRICT_TEST_CONSOLE`    | Fail tests on console warnings (CI mode) | `1` (dev: `0`)          |
| `DEBUG`                  | Debug logging filter                     | `containment:*`         |
| `VITE_DEV_MODE`          | Enable development features              | `true`                  |
| `VITE_ENABLE_DEVTOOLS`   | Enable devtools integration              | `true`                  |
| `VITE_API_URL`           | Backend API endpoint (future)            | `http://localhost:3000` |

## Troubleshooting

### "Node version mismatch" error

Ensure you're using Node.js 22:

```bash
node --version  # Should show v22.x.x

# If using nvm:
nvm use 22
nvm alias default 22

# If using fnm:
fnm use 22
fnm default 22
```

### "npm: command not found"

Node.js wasn't properly installed or npm isn't in your PATH. Reinstall Node.js from [nodejs.org](https://nodejs.org/).

### Dev server won't start

1. Check if port 5173 is already in use
2. Kill existing process: `lsof -ti:5173 | xargs kill -9` (macOS/Linux) or check Task Manager (Windows)
3. Check `.env.local` for port conflicts
4. Try: `npm run dev -- --port 5174`

### Tests failing with "SyntaxError"

This usually means type-only imports aren't using `import type`:

```typescript
// ❌ Wrong
import { MyType } from './types'

// ✅ Correct
import type { MyType } from './types'
```

Run `npm run lint` to auto-fix ESLint violations.

### Extensions not showing recommendations

Reload VS Code window: `Cmd+Shift+P` → "Developer: Reload Window"

## Git Hooks (Optional)

Consider setting up pre-commit hooks to automatically lint and format code:

```bash
# Install Husky
npm install husky --save-dev

# Initialize Husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run format:check"

# Add pre-push hook
npx husky add .husky/pre-push "npm run test:run"
```

## Next Steps

1. ✅ Install Node.js 22
2. ✅ Run `npm ci` to install dependencies
3. ✅ Install VS Code recommended extensions
4. ✅ Run `npm run dev` to start development
5. Open http://localhost:5173

For more details, see:

- [README.md](../README.md) - Project overview
- [Contributing Guide](../CONTRIBUTING.md) - Development standards
- [Architecture](../README.md#architecture) - Code organization

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review the [README.md](../README.md)
3. Check GitHub Issues: [Issues](https://github.com/JamesJedi420/containment-protocol/issues)
4. Ask in discussions or open a new issue

Happy coding! 🚀
