"""Generate bounded static labor records without retaining source manual content."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from typing import Callable

if __package__ is None or __package__ == '':
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools.manual_lookup import TIER1_JOB_ALIASES, fetch_manual_html, lookup_job_labor


def filter_vehicle_catalog(catalog: list[dict], makes: set[str], year_start: int, year_end: int) -> list[dict]:
    return [
        vehicle for vehicle in catalog
        if vehicle.get('make') in makes and year_start <= vehicle.get('year', 0) <= year_end
    ]


def build_static_record(vehicle: dict, job_id: str, result: dict, checked_at: str) -> dict:
    record = {
        'year': vehicle['year'],
        'make': vehicle['make'],
        'model': vehicle['model'],
        'configuration': vehicle['engine'],
        'manual_url': vehicle['manual_url'],
        'job_id': job_id,
        'status': result['status'],
        'checked_at': checked_at,
    }
    if result['status'] == 'available':
        record.update({
            'hours': result['standard_hours'],
            'source_operation': result['source_operation'],
            'source_row': result['source_row'],
            'source_url': result['source_url'],
        })
    else:
        record['reason'] = result['reason']
    return record


def collect_records(vehicles: list[dict], jobs: list[str], lookup: Callable[[str, str], dict], checked_at: str) -> list[dict]:
    return [
        build_static_record(vehicle, job_id, lookup(vehicle['manual_url'], job_id), checked_at)
        for vehicle in vehicles
        for job_id in jobs
    ]


def read_catalog(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding='utf-8'))


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f'{path.suffix}.tmp')
    temporary.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--make', required=True, help='Exact source make name, such as Acura')
    parser.add_argument('--catalog-dir', type=Path, default=Path('data/catalogs'))
    parser.add_argument('--output', type=Path, default=Path('pages/data'))
    parser.add_argument('--year-start', type=int, default=1991)
    parser.add_argument('--year-end', type=int, default=2026)
    parser.add_argument('--limit', type=int, default=1, help='Vehicle configurations to collect; use an explicit larger value for a batch')
    args = parser.parse_args()

    catalog_path = args.catalog_dir / f"{args.make.casefold().replace(' ', '-')}.json"
    vehicles = filter_vehicle_catalog(read_catalog(catalog_path), {args.make}, args.year_start, args.year_end)[:args.limit]
    checked_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    records = collect_records(vehicles, list(TIER1_JOB_ALIASES), lambda url, job: lookup_job_labor(url, job, fetch_manual_html), checked_at)
    output_path = args.output / f"{args.make.casefold().replace(' ', '-')}.json"
    write_json(output_path, records)
    print(f'wrote {len(records)} records to {output_path}')


if __name__ == '__main__':
    main()
