# Mechanic Labor Planner

A static, vehicle-specific labor-planning pilot. It does not provide generic estimates.

## Current verified coverage

- VIN `2HNYD18836H516598`: 2006 Acura MDX Touring, J35A5 3.5L V6.
- Reviewed jobs: front struts, valve-cover gaskets, and the full timing-belt service package.
- Other VINs and unsupported jobs show `No verified estimate available`; they do not fall back to generic labor, parts, or access assumptions.

Labor values are source-published standard/book times for the matched vehicle. Shop-policy packages, required disturbed gaskets, and access-aware recommendations are stored separately from source labor evidence.

## Scope and limitations

- This is not a diagnosis or final quote.
- It has no backend, tracking, credentials, live parts pricing, or visitor-triggered manual scraping.
- It does not copy or republish LEMON/CHARM manual content. Source links support reviewed vehicle/job records.
- VIN matching is presently against the reviewed static records only. A VIN can be decoded elsewhere without having verified estimate coverage here.

## Run locally

```sh
python3 -m http.server 8099 --bind 127.0.0.1
```

Open `http://127.0.0.1:8099/`.

## Test

```sh
npm test
```

## Deploy to Hostinger

Upload `index.html`, `app.js`, `styles.css`, and the `src/` directory together. No build step is required.

## Data maintenance

Vehicle/job records live in `src/mdx.js`. Add a record only after matching the exact vehicle/engine, source labor operation, procedure evidence, required disturbed parts, shop policy, and scope rules. If any of that is missing, leave the vehicle/job unavailable.
