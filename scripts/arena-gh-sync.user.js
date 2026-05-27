// ==UserScript==
// @name         Arena.ai Workspace to GitHub Sync (Pro)
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Securely synchronize files AND folders from Arena.ai Agent Mode workspace to GitHub.
// @author       YourName
// @match        https://arena.ai/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const IGNORE_LIST = ['.env', '.git', '.gitignore', 'package-lock.json', 'node_modules', '.DS_Store'];
    const API_BASE = "https://api.github.com";

    const getConfig = () => ({
        token: GM_getValue("github_token", ""),
        owner: GM_getValue("github_owner", ""),
        repo: GM_getValue("github_repo", ""),
        branch: GM_getValue("github_branch", "main"),
    });

    const UI = {
        createButton() {
            if (document.getElementById('arena-sync-btn')) return;
            const btn = document.createElement('button');
            btn.id = 'arena-sync-btn';
            btn.innerText = '🚀 Sync to GitHub';
            btn.style.cssText = `
                position: fixed; bottom: 20px; right: 20px; z-index: 100000;
                padding: 12px 20px; background: #238636; color: white;
                border: none; border-radius: 8px; cursor: pointer;
                font-weight: 600; font-family: sans-serif;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            `;
            btn.onclick = startTransfer;
            document.body.appendChild(btn);
        },

        showStatus(text, isError = false) {
            let statusEl = document.getElementById('arena-sync-status');
            if (!statusEl) {
                statusEl = document.createElement('div');
                statusEl.id = 'arena-sync-status';
                statusEl.style.cssText = `
                    position: fixed; bottom: 70px; right: 20px; z-index: 100000;
                    padding: 10px 15px; background: #161b22; color: #c9d1d9;
                    border-radius: 6px; font-size: 13px; font-family: monospace;
                    border: 1px solid #30363d; max-width: 350px;
                `;
                document.body.appendChild(statusEl);
            }
            statusEl.innerText = text;
            statusEl.style.borderColor = isError ? '#f85149' : '#30363d';
            statusEl.style.color = isError ? '#ff7b72' : '#c9d1d9';
        },

        clearStatus() {
            const el = document.getElementById('arena-sync-status');
            if (el) el.remove();
        }
    };

    /**
     * Path Resolver: This function climbs the DOM to find folder names
     */
    function resolveFullPath(element) {
        let pathParts = [];
        let current = element;

        // Climb up the DOM to find parent folder labels
        // Note: We target elements that likely contain folder names in Arena's UI
        while (current && current !== document.body) {
            // Look for elements that look like folder name containers
            // This is a generic approach; if Arena's UI changes, this may need adjusting
            if (current.tagName === 'DIV' && current.innerText && current.children.length === 1) {
                const text = current.innerText.trim();
                if (text && !text.includes(' ') && text.length < 50) {
                    pathParts.unshift(text);
                }
            }
            current = current.parentElement;
        }

        const fileName = element.getAttribute('download') || 'unknown_file';
        // Clean up paths and remove duplicates
        const fullPath = [...pathParts, fileName].join('/').replace(/\/+/g, '/');
        return fullPath;
    }

    /**
     * Secure Download using GM_xmlhttpRequest to avoid 404/CSP issues
     */
    function downloadFile(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "blob",
                onload: (res) => {
                    if (res.status === 200) resolve(res.response);
                    else reject(new Error(`Server responded with ${res.status}`));
                },
                onerror: (err) => reject(err)
            });
        });
    }

    async function uploadToGithub(path, blob, config) {
        const reader = new FileReader();
        const base64Promise = new Promise(res => {
            reader.onloadend = () => res(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
        });
        const content = await base64Promise;

        const url = `${API_BASE}/repos/${config.owner}/${config.repo}/contents/${path}`;

        // 1. Get existing SHA to enable OVERWRITING
        let sha = undefined;
        try {
            const res = await fetch(url, { headers: { "Authorization": `Bearer ${config.token}` } });
            if (res.ok) {
                const data = await res.json();
                sha = data.sha;
            }
        } catch (e) {}

        // 2. PUT the file (Create or Update)
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${config.token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `Sync from Arena.ai: ${path}`,
                content: content,
                branch: config.branch,
                sha: sha // If sha is present, GitHub overwrites the file
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message);
        }
    }

    async function startTransfer() {
        const config = getConfig();
        if (!config.token || !config.owner || !config.repo) {
            alert("Please configure GitHub settings in the Tampermonkey menu!");
            return;
        }

        const fileElements = Array.from(document.querySelectorAll('a[download]'));
        if (fileElements.length === 0) {
            UI.showStatus("❌ No files found. Please open the sidebar!", true);
            return;
        }

        let success = 0, failed = 0;

        for (const link of fileElements) {
            const url = link.getAttribute('href');
            const fileName = link.getAttribute('download');
            if (!url || !fileName || fileName.endsWith('.zip')) continue;
            if (IGNORE_LIST.some(i => fileName.includes(i))) continue;

            const fullPath = resolveFullPath(link);
            UI.showStatus(`Syncing: ${fullPath}...`);

            try {
                const blob = await downloadFile(url);
                await uploadToGithub(fullPath, blob, config);
                success++;
                await new Promise(r => setTimeout(r, 500));
            } catch (err) {
                console.error(`❌ Error syncing ${fullPath}:`, err);
                failed++;
            }
        }

        UI.showStatus(`✅ Finished. Pushed: ${success} | Failed: ${failed}`);
        setTimeout(UI.clearStatus, 6000);
    }

    GM_registerMenuCommand("⚙️ Configure GitHub Sync", () => {
        const token = prompt("GitHub PAT:", GM_getValue("github_token", ""));
        const owner = prompt("Owner:", GM_getValue("github_owner", ""));
        const repo = prompt("Repo:", GM_getValue("github_repo", ""));
        const branch = prompt("Branch:", GM_getValue("github_branch", "main"));
        if (token) GM_setValue("github_token", token);
        if (owner) GM_setValue("github_owner", owner);
        if (repo) GM_setValue("github_repo", repo);
        if (branch) GM_setValue("github_branch", branch);
        alert("Saved!");
    });

    setInterval(() => { if (document.body) UI.createButton(); }, 2000);
})();
