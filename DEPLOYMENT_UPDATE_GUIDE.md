# Jattkart POS - Auto-Update Deployment Guide

This guide explains how to build, publish, and distribute automatic updates to the remote POS clients using GitHub Releases.

## 1. Prerequisites (One-Time Setup)

To allow `electron-builder` to securely upload your application releases to GitHub, you need a **Personal Access Token**.

1. Go to [GitHub Settings -> Developer settings -> Personal access tokens -> Tokens (classic)](https://github.com/settings/tokens).
2. Click **Generate new token (classic)**.
3. Name it "Jattkart POS Updater" and securely select the `repo` scope.
4. Generate the token and **copy it** securely.
5. On your build machine (where you run the build commands), set it as an environment variable:
   - **Windows PowerShell:** `[Environment]::SetEnvironmentVariable("GH_TOKEN", "your_copied_token", "User")` (Restart your terminal for it to take effect)
   - **Git Bash / Linux / Mac:** `export GH_TOKEN="your_copied_token"`

*(Ensure your GitHub repository URL matches what's under `build.publish` in `package.json`.)*

## 2. Releasing a New Version

When you have made code changes and are ready to deploy an update to all cashier apps:

### Step 1: Bump the Version Number
Update the `version` field in your `package.json` to the new version (e.g., from `"1.0.0"` to `"1.0.1"`). The update system uses Semantic Versioning to trigger updates only when the version number strictly increases. 
**Do not skip this step**, otherwise, clients will not detect the update!

```json
  "name": "jattkart-pos",
  "version": "1.0.1",
```

### Step 2: Build and Publish
Run the new publish script (or the standard build script appending the publish flag). Note: GitHub treats draft releases as invisible to the auto-updater.

Run the standard build command, appending the publish argument:
```bash
npm run electron:build -- -p always
```
*(The `-p always` flag forces `electron-builder` to automatically generate the `.exe` alongside `latest.yml` and publish them straight to GitHub Releases).*

### Step 3: Verify GitHub Release
1. Go to your GitHub Repository -> **Releases**.
2. You should see a draft release created for `v1.0.1`.
3. Check that the release contains:
   - `Jattkart POS Setup 1.0.1.exe`
   - `latest.yml`
   - `Jattkart POS Setup 1.0.1.exe.blockmap`
4. **Important:** Edit the release draft and click **Publish Release** to make it active. The `autoUpdater` only detects published public/private releases (if the repo is private, you would need to bundle a token in the app, hence public repositories are simpler for compiled binaries).

## 3. How the Client App Updates (The Workflow)

1. The cashier opens the **Jattkart POS** application.
2. `5` seconds after launch, the app silently pings the `latest.yml` file from the remote GitHub Release endpoint.
3. If it detects version `1.0.1` and the local app is currently running `1.0.0`, the frontend shows: **"Update available! Downloading..."** in the bottom right corner overlay.
4. The `.exe` patch is silently downloaded in the background (`latest.yml` ensures only the necessary blockmap delta is fetched when possible).
5. Once complete, the React UI updates to: **"Update ready to install!"** with **Restart Now** and **Later** buttons.
6. If the user clicks **Restart Now**, the app immediately quits, silently replaces the executable on disk, and launches the new `1.0.1` version. If they click **Later**, the update remains cached and will automatically be applied the next time they normally close and reopen the POS app.

## Security & Diagnostics
- **Tampering Prevention:** `electron-updater` internally parses `latest.yml` and validates sha512 hashes against the downloaded blocks.
- **Failures/No Internet:** If the network is down or the download aborts, it silently fails and gracefully cleans up to try again on the next restart.
- **Troubleshooting Logging:** If a cashier reports that an update isn't working, guide them to check their local update log file located at: `C:\Users\<User>\AppData\Roaming\jattkart-pos\logs\main.log` (managed by `electron-log`).
