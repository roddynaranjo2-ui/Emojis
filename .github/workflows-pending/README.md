# Workflows (pending activation)

These GitHub Actions workflows are complete and tested locally, but the GitHub App
token used by the AI developer lacks the `workflows` permission, so it cannot push
files under `.github/workflows/`.

**To activate (one-time, by a repo admin):**

```bash
git mv .github/workflows-pending/*.yml .github/workflows/
git commit -m "ci: activate workflows" && git push
```

Then in *Settings → Pages* set **Source: GitHub Actions** so `deploy-pwa.yml` can publish.

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | push / PR | lint → typecheck → content validation → vitest → balance sim (strict) → build → upload `dist` |
| `deploy-pwa.yml` | push to `main` | builds and deploys the PWA to GitHub Pages |
| `android.yml` | tag `v*` / manual | Capacitor → Gradle → debug APK artifact |
