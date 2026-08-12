# Tropical Cyclone Database

A hand-built, interactive database of every known tropical cyclone landfall across the Atlantic Basin, 1851–present. Data sourced from NOAA/AOML's HURDAT2, with landfall coordinates manually refined for coastal-scale accuracy.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home page — "On This Day," "Did You Know?," site notes, and links into the rest of the site |
| `hurricane_landfalls.html` | The interactive map — the core of the site |
| `about.html` | Project origin story |
| `data.html` | Methodology — where the data comes from and how it's processed |
| `contact.html` | Social links / how to report an issue |

## Deploying with GitHub Pages

1. Push all the files in this folder to the root of your repository (they all link to each other by relative filename, so they need to stay together in the same folder).
2. In the repo, go to **Settings → Pages**, and set the source branch to the one you pushed to, with the folder set to `/ (root)`.
3. GitHub will publish the site at `https://<username>.github.io/<repo-name>/`, with `index.html` as the default landing page.
4. The `.nojekyll` file in this folder tells GitHub Pages to skip its default Jekyll build step, since this is a plain static site and doesn't need it.

## Updating the data

Landfall coordinates are manually edited in a HURDAT2-format text file and re-ingested; the resulting data is embedded directly into `hurricane_landfalls.html` and `index.html` (no external data files or database — everything needed to run the site is in the HTML files themselves).
