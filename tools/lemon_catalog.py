"""Build a compact, resumable vehicle/manual availability catalog from LEMON navigation pages."""

from __future__ import annotations

from html.parser import HTMLParser
from urllib.parse import quote, unquote, urljoin, urlparse
from urllib.request import Request, urlopen
from pathlib import Path
import json
import re
import time

BASE_URL = 'https://lemon-manuals.la'


class _Links(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == 'a':
            href = dict(attrs).get('href')
            if href:
                self.links.append(href)


def extract_child_links(html: str) -> list[str]:
    parser = _Links()
    parser.feed(html)
    return [href for href in parser.links if href.endswith('/') and not urlparse(href).scheme]


def extract_make_names(html: str) -> list[str]:
    makes = []
    for href in extract_child_links(html):
        parts = [part for part in href.strip('/').split('/') if part]
        if len(parts) == 1 and not parts[0].isdigit():
            makes.append(unquote(parts[0]))
    return sorted(set(makes))


def catalog_file_stem(make: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', make.casefold()).strip('-')


def parse_vehicle_entry(path: str) -> dict[str, object] | None:
    parts = [unquote(part) for part in path.strip('/').split('/')]
    if len(parts) != 3 or not parts[1].isdigit():
        return None
    model_engine = parts[2].rsplit(' ', 1)
    if len(model_engine) != 2:
        return None
    make, year, (model, engine) = parts[0], int(parts[1]), model_engine
    return {'make': make, 'year': year, 'model': model, 'engine': engine, 'manual_url': urljoin(BASE_URL, path)}


def fetch(url: str) -> str:
    request = Request(url, headers={'User-Agent': 'MechanicLaborPlannerCatalog/0.1 (+local research)'})
    with urlopen(request, timeout=30) as response:
        return response.read().decode('utf-8')


def make_navigation_url(make: str) -> str:
    return f'{BASE_URL}/{quote(make, safe="")}/'


def crawl_make(make: str, delay_seconds: float = 1.0) -> list[dict[str, object]]:
    make_url = make_navigation_url(make)
    records: list[dict[str, object]] = []
    for year_path in extract_child_links(fetch(make_url)):
        year_url = urljoin(make_url, year_path)
        if not unquote(urlparse(year_url).path).startswith(f'/{make}/'):
            continue
        time.sleep(delay_seconds)
        for vehicle_path in extract_child_links(fetch(year_url)):
            vehicle_url = urljoin(year_url, vehicle_path)
            record = parse_vehicle_entry(urlparse(vehicle_url).path)
            if record and record['make'] == make:
                records.append(record)
    return sorted(records, key=lambda r: (r['year'], r['model'], r['engine']))


def write_catalog(records: list[dict[str, object]], output_path: str) -> None:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as output:
        json.dump(records, output, indent=2)
        output.write('\n')
