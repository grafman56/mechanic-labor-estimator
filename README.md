# Mechanic Labor Planner

A static, mobile-friendly planning tool for common automotive repairs. It shows a configurable labor-only range plus generic required, recommended, and inspection-only parts lists.

## What it is

- A first public version with 15 common repair-planning templates, searchable by job or category.
- Plain HTML, CSS, and browser JavaScript; no backend, tracking, credentials, or third-party runtime calls.
- Ready to upload directly to a Hostinger document root.

## What it is not

- Not a diagnostic tool or final quote.
- Not vehicle-specific fitment, live parts pricing, or a replacement for a service manual.
- It does not copy or republish LEMON/CHARM manual content. Those sites can inform future, curated job templates after vehicle/procedure verification.

## Run locally

Open `index.html` in a modern browser, or serve the directory with any static web server.

## Test

```sh
npm test
```

## Deploy to Hostinger

Upload `index.html`, `app.js`, `styles.css`, and the `src/` directory together to the desired web directory. No build step is required.

## Data maintenance

Jobs live in `src/estimator.js`. Keep each template's labor range, lists, and scope note concise and review it against the exact vehicle service information before presenting it as a quote.
