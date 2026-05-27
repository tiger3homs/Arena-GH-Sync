# Arena.ai Workspace to GitHub Sync 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform: Tampermonkey](https://img.shields.io/badge/Platform-Tampermonkey-orange)](https://www.tampermonkey.net/)

**Arena-GH-Sync** is a professional browser utility designed for developers using **Arena.ai Agent Mode**. It allows you to synchronize files directly from the Arena workspace to a GitHub repository without needing to expose your GitHub credentials within the Agent's filesystem.

## 🛡️ Why use this?
When working in Agent Mode, adding a `.env` file with a GitHub Token allows the agent (or anyone with access to the workspace) to see your secrets. 

This script runs entirely in your **local browser context**. It reads the files from the Arena UI and pushes them to GitHub using a token stored securely in your browser's local storage (via Tampermonkey), ensuring your secrets never touch the remote server.

## ✨ Features
- **Secure Token Storage**: Tokens are stored in Tampermonkey's internal storage, not in the workspace.
- **Automatic SHA Handling**: Automatically detects if a file exists and updates it, or creates a new one.
- **Security Filter**: Built-in ignore list to prevent accidentally pushing `.env` or `node_modules`.
- **Non-Intrusive UI**: Adds a clean "Sync to GitHub" button to the Arena interface.
- **Rate Limit Protection**: Integrated delays to comply with GitHub API limits.

## 🚀 Installation

1. **Install Tampermonkey**: Install the [Tampermonkey extension](https://www.tampermonkey.net/) for your browser (Chrome, Firefox, Edge).
2. **Add Script**: 
   - Create a new script in Tampermonkey.
   - Copy the contents of `scripts/arena-gh-sync.user.js` and paste them into the editor.
   - Save the script (`Ctrl+S`).
3. **Configure**:
   - Navigate to [Arena.ai](https://arena.ai).
   - Click the Tampermonkey icon in your browser toolbar.
   - Select **Arena.ai Workspace to GitHub Sync** $\rightarrow$ **⚙️ Configure GitHub Sync**.
   - Enter your GitHub Personal Access Token (PAT), Username, and Repository name.

## 🔐 GitHub Token Permissions
For maximum security, create a **Fine-grained Personal Access Token** with the following permissions:
- **Repository permissions**: `Contents` $\rightarrow$ `Read and Write`

## ⚠️ Security Warning
**Never share your `.user.js` file if you have hardcoded your token into it.** This script is designed to use the `GM_setValue` menu to avoid hardcoding. Always use the configuration menu.

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.
