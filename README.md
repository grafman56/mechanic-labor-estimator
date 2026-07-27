# Mechanic Labor Planner

A local, vehicle-specific labor-planning pilot. It does not provide generic estimates.

## Current verified coverage

- VIN `2HNYD18836H516598`: live VIN decoding returns 2006 Acura MDX source-manual candidates; the user must select the exact source configuration before live labor lookup.
- A selected LEMON manual with a Parts and Labor page is an alternative to VIN verification for live labor lookup.
- Live source labor supports these Tier 1 job IDs when the selected manual exposes an exact published `Replace` row: front struts; rear struts/shocks; alternator; starter motor; radiator; wheel bearing/hub; serpentine belt; spark plugs; oil and filter service; engine air filter; cabin air filter; valve-cover gasket; timing belt; and water pump.
- Same-named source operations can require a manual operation-path selection. The tool never selects between conflicting paths automatically.
- Procedure evidence is currently verified only for these exact 2006 MDX V6-3.5L manual operations:
  - valve-cover gasket: spark plug seals (`replace-if-removed`) and cover washer (C) (`inspect`), plus informational source context that the matched removal procedure removes the intake manifold and six ignition coils, and the matched installation procedure installs the six ignition coils and intake manifold. The checked valve-cover procedure pages do not explicitly require a new intake-manifold gasket, so this is not a gasket, parts, or added-labor recommendation.
  - engine-path water pump: new O-ring (B) (`required`) plus informational context that the selected procedure drains engine coolant, removes the timing belt and timing-belt adjuster, and removes the water pump by five bolts. These steps do not establish replacement coolant, belt, adjuster, pump, or bolts, and do not add labor or a timing-service package.
- Any job/manual/operation without exact source support remains unavailable; there is no generic labor, parts, or access fallback.
- When procedure evidence or context exists, the result renders as one expandable **Source-backed job awareness** section. Its closed summary retains the count and first exact source step; its expanded body separates explicit evidence from source removal/access, reinstallation, and drain/handling context. For any exact selected operation without a curated procedure route, the private server follows that operation’s matching Repair and Diagnosis component page and reads only direct `Service and Repair` replacement or removal-and-installation pages. It retains only concise source sentences beginning with remove, disconnect, release, detach, unfasten, support, lower, drain, evacuate, recover, install, or reinstall. Other service pages, including overhauls, are excluded. Discovery returns at most 24 deduplicated source steps; each category initially displays five with an explicit disclosure for the remaining exact source steps. A missing matching source procedure is displayed as unavailable; it never implies that no access work exists.

| Job family | Live labor behavior | Procedure evidence status |
| --- | --- | --- |
| Front/rear struts or shocks; wheel bearing/hub | Exact published rows; generic side wording stays generic | Labor only |
| Alternator; starter; radiator; serpentine belt; spark plugs | Exact published `Replace` row when available | Labor only |
| Engine air filter; cabin air filter | Exact published `Replace` row when available | Labor only |
| Valve-cover gasket | Exact published bank/side wording | Verified for the MDX operation listed above: explicit seal/washer evidence plus intake-manifold and ignition-coil removal/reinstallation context only. The checked procedure pages do not establish a new intake-manifold gasket or added labor. |
| Timing belt | Exact published `Replace` row; no water-pump labor is silently added | Labor only |
| Water pump | Exact operation path and published row required when paths conflict | Verified only for the MDX engine-path operation listed above: O-ring evidence plus informational procedure context, not added timing-belt labor |

Labor values are source-published standard/book times for the selected vehicle/manual operation. Labor tables never establish required parts, disturbed gaskets, or access recommendations; those require explicit procedure evidence.

## Scope and limitations

- This is not a diagnosis or final quote.
- It is a local private service with a small same-origin Python backend; it has no tracking, credentials, or live parts pricing.
- It does not copy or republish LEMON/CHARM manual content. Source links support live selected-manual results and concise derived evidence.
- VIN decoding returns only matching make/year/model source-manual candidates. It does not prove engine, trim, drivetrain, or a labor-capable configuration; the user must select an exact candidate and the server separately checks its Parts and Labor page.
- Source operation, row, and side/bank wording are displayed verbatim. `One Side` and `One Bank` are never represented as a specific left/right or front/rear result.
- Procedure evidence is source-specific, not a generic parts list. An unavailable procedure route creates no recommendation.

## Run locally

```sh
python3 server.py
```

Open `http://127.0.0.1:8099/`. The planner requires this private same-origin server for live manual, labor, and procedure lookups; `python3 -m http.server` is not a supported live-lookup mode.

## Test

```sh
./verify.sh
```

## Static deployment

A static host such as Hostinger can serve the user interface and generated catalog files, but it cannot provide the private `/api/` source-lookup endpoints. Do not deploy this planner publicly. Keep it on localhost unless authentication, rate limiting, and a reviewed persistent-cache policy are added.

## Vehicle/manual catalog

`tools/lemon_catalog.py` crawls only LEMON's public navigation pages (make → year → model/engine); it does not fetch procedure pages or download manual archives. The full generated catalog currently contains 69 discovered make roots, 303,014 year/model/engine manual-navigation records, and two roots with no model records (`General Motors`, `ZAP`). It means `manual navigation available`, not `verified estimate available`.

The selector starts with the compact generated `data/lemon-catalog-index.json` and fetches only the selected make’s file under `data/catalogs/`. This avoids loading the 76 MB source catalog at startup. The user still must select an exact year/model/engine, and the app checks the selected manual’s live Parts and Labor availability before enabling labor lookup. The previously reviewed makes/models remain regression samples, not the only catalog coverage. Generated navigation records do not establish a published labor row, procedure awareness, parts, labor recommendation, or a source-backed estimate.

Refresh one generated make catalog with:

```sh
python3 -c "from tools.lemon_catalog import crawl_make, write_catalog; write_catalog(crawl_make('Acura'), 'data/catalogs/acura.json')"
```

## Private on-demand source lookup

For the personal on-demand workflow, run the same-origin private server instead of a static host:

```sh
python3 server.py
```

It listens only on `127.0.0.1:8099`, serves the planner, and exposes restricted JSON endpoints. Live-source endpoint responses are marked `no-store`, and the browser requests procedure evidence with `cache: 'no-store'`, so a previous procedure lookup cannot hide newly available source context after a local restart. The server keeps a private, in-memory 15-minute cache only for successful exact-manual Parts-and-Labor availability probes. It returns `checked_at` and `cached` with that availability response, but this cache never establishes an operation, labor value, procedure, part, or recommendation.

The selector keeps complete source navigation data. After an exact make/year/model/configuration selection, it probes only that selection's candidate manual roots. A missing Parts-and-Labor page is displayed as source-configuration availability, not as a missing repair job. User-facing source-configuration wording is decoded directly from the selected manual URL; it does not reinterpret a navigation label as a confirmed engine, drivetrain, body style, or trim.

- `GET /api/manual-metadata` verifies the selected manual and returns only its source URL/title.
- `GET /api/vin-manuals` decodes a 17-character VIN through NHTSA vPIC, then checks LEMON’s make/year navigation live and returns only exact model manual candidates. It does not assume an engine match from a similarly named candidate; the caller must select the matching source configuration.
- `GET /api/live-job-labor` accepts a normalized Tier 1 job ID, an exact source operation path, and an exact source row, then returns only that published `Replace` standard-hour value.
- `GET /api/live-job-rows` lists each distinct selected-manual operation path with its exact published replacement rows. Equivalent duplicate paths are collapsed only when every displayed row and hour agrees; conflicting paths require a manual operation choice.
- `GET /api/procedure-evidence` accepts the same exact source operation and returns only explicit installation/removal evidence for specifically verified manual/operation pairs. It distinguishes `required`, `replace-if-removed`, and `inspect`; it classifies reviewed informational sentences as source removal/access, reinstallation, or drain/handling context. If no curated route exists, it derives the exact selected operation’s Repair and Diagnosis component page, follows at most three direct replacement or removal-and-installation procedure links, and returns at most 24 deduplicated sentences beginning with `remove`, `disconnect`, `release`, `detach`, `unfasten`, `support`, `lower`, `drain`, `evacuate`, `recover`, `install`, or `reinstall`. It excludes overhauls and never searches another manual or operation. Missing source context creates no recommendation and is displayed as unavailable, not as proof that no preparatory work exists. Context never establishes a replacement part, labor increase, or package recommendation.

The live selector currently supports the small Tier 1 job catalog. It does not copy manual text, infer missing operations, automatically choose between conflicting duplicate source operations, or create an estimate when the required source page is absent. Do not expose this service publicly without adding authentication, request rate limits, and a persistent cache.

## Data maintenance

Vehicle/job records live in `src/mdx.js`. Add a record only after matching the exact vehicle/engine, source labor operation, procedure evidence, required disturbed parts, shop policy, and scope rules. If any of that is missing, leave the vehicle/job unavailable.
