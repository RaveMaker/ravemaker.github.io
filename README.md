# RaveMaker — Behind the builds

A static developer profile for [RaveMaker](https://github.com/RaveMaker), [ERPXE](https://github.com/ERPXE), and [ITekBlog](https://github.com/ITekBlog). Built with **Astro 7**, CSS, and vanilla browser JavaScript. No React, deployed server, personal access token, or browser requests to GitHub are required.

## Work locally

Use **Node.js 24 LTS** (minimum supported Node version: 22.23.4).

Install the locked dependencies once, then start Astro:

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. Astro provides hot reload for components, scripts, styles, and configuration. Saved snapshot changes also reload the page. No publishing happens. You only need to rerun `npm ci` after dependency changes or in a new checkout.

```sh
npm test                 # Data, filtering, and safe rendering checks
npm run build            # Generate dist/ from saved data; no network access
npm run verify:build     # Verify the static output, data, highlights, and bundled assets
npm run preview          # Serve the exact built output at localhost:4173
npm run refresh-data     # Fetch current public repositories into .cache/repos.json
```

Use another port if necessary: `npm run dev -- --port 5174`.

The checked-in `data/repos.json` is the initial real snapshot for offline development. Manual refreshes write only to ignored `.cache/repos.json`; builds prefer that file when present and otherwise use the checked-in snapshot. Actions refreshes do not modify or commit the checked-in snapshot. The visible timestamp always comes from the data, not the build date.

## Edit the page

| File | Purpose |
| --- | --- |
| `site.config.json` | Identity, intro, links, accounts, and featured account/limit |
| `src/pages/index.astro` | Page composition, hero, statistics, and highlights |
| `src/layouts/PageLayout.astro` | HTML document, metadata, theme initialization, and global styles |
| `src/components/` | Header, featured project, repository directory, and footer components |
| `src/styles.css` | Signal design, dark/light themes, and responsive layouts |
| `src/app.js` | Local filtering, sorting, pagination, URL state, and theme switch |
| `src/repositories.js` | Shared filter defaults, filtering, icons, accessible count labels, and escaped HTML rendering |
| `scripts/snapshot.mjs` | Validated cache/seed loading and script-safe JSON serialization |
| `src/pages/data/repos.json.js` | Emits the public JSON snapshot as a static file |
| `src/pages/robots.txt.js`, `src/pages/sitemap.xml.js` | Static metadata routes |
| `public/` | Favicon and other files copied without processing |
| `src/assets/icons/` | GitHub/GitLab SVG logos bundled through relative CSS mask URLs |
| `astro.config.mjs` | Static output, canonical site URL, dev port, and snapshot live reload |
| `scripts/github.mjs` | Build-time public GitHub data collection with pagination |
| `.github/workflows/pages.yml` | Main-branch push and manual deployments |

Highlights automatically select the two most-starred public repositories owned by **RaveMaker**, using the saved snapshot; ties are sorted by repository name. `featured.account` and `featured.limit` in the configuration control this selection. Cards use GitHub’s repository names and descriptions. Changing collected accounts requires a refresh. GitHub’s primary repository language is shown; repositories with no detected language are labeled **Unspecified**. Original repositories, archived repositories, and forks are distinguishable in the directory. A recent push does not imply a release or a maintained project.

The page contains all repositories in generated HTML, so content and links work without JavaScript. With JavaScript, the directory opens on the **RaveMaker** tab, with separate **ERPXE** and **ITekBlog** tabs and **10 results per page**. Tabs support arrow keys, Home, and End. Changing accounts resets pagination; clearing search/filters keeps the selected account. Search, account tabs, language filtering, and sorting operate entirely on embedded snapshot data. Filter and page state can be shared in the URL. The same public snapshot is also served at `/data/repos.json`.

Both clear buttons explicitly restore empty search/language filters, recent-push sorting, and page 1 without changing the account. The empty-state clear button focuses search. At pagination boundaries, focus moves to the remaining enabled navigation button. Star/fork metrics share accessible SVG icons and singular/plural text labels. The former repository-type filter has been removed from both the UI and filtering logic; archived/fork badges remain.

The theme follows your OS until you choose one with the theme button; that choice is saved locally. Browser theme-color metadata follows the active theme. Small interface text uses at least 11px for readability; only decorative lettering inside the RM graphic is smaller.

## GitHub Pages setup (when ready)

1. Review, commit, and push the source to `main` yourself.
2. In the repository’s **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
3. Run **Build and deploy profile** from the Actions tab if needed after enabling Pages.

The workflow runs on pushes to `main` or manually from the Actions tab. Each run refreshes the repository data before building and deploying. There is no scheduled trigger.

Each run uses Node 24, installs dependencies with `npm ci`, tests the source, fetches a fresh snapshot using the built-in `GITHUB_TOKEN` with read-only repository permissions, builds and verifies `dist/`, and deploys it with the official Pages artifact actions. Astro prerenders all routes, including the JSON snapshot: no server adapter or runtime endpoint is deployed. Only the deploy job gets Pages write permission. No generated commits or deployment branch are used.

The workflow uses current official major releases: [checkout@v7](https://github.com/actions/checkout/releases/latest), [setup-node@v7](https://github.com/actions/setup-node/releases/latest), [upload-pages-artifact@v5](https://github.com/actions/upload-pages-artifact/releases/latest), and [deploy-pages@v5](https://github.com/actions/deploy-pages/releases/latest). These replace the older v4 actions while preserving the same build/deploy jobs, permissions, and triggers.

The initial snapshot needed **4 API calls for 159 repositories**: one page each for RaveMaker and ITekBlog, two for ERPXE. Collection follows GitHub’s pagination links, so this scales beyond 100 repositories per account. There are no per-repository requests. Private repositories are excluded. A failure on any account/page, or any configured account returning zero public owned repositories, fails the refresh before replacing the local snapshot and prevents the workflow from deploying incomplete data. The existing published deployment stays available.

Nothing in the local commands publishes, commits, or pushes. The workflow is only activated on GitHub after you push it.
