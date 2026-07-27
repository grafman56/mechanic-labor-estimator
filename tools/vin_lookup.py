"""On-demand VIN decoding and source-driven LEMON manual discovery."""
import json
import re
from urllib.parse import unquote, urljoin, urlparse
from urllib.request import Request, urlopen

from tools.lemon_catalog import BASE_URL, extract_child_links, parse_vehicle_entry


VIN_PATTERN = re.compile(r'^[A-HJ-NPR-Z0-9]{17}$')


def _clean(value):
    return str(value or '').strip()


def _decoded_vehicle(vin, response):
    normalized_vin = vin.strip().upper()
    if not VIN_PATTERN.fullmatch(normalized_vin):
        raise ValueError('VIN must be 17 characters and cannot contain I, O, or Q.')
    results = response.get('Results', [])
    if not results:
        raise ValueError('VIN decoder returned no result.')
    result = results[0]
    error_code = _clean(result.get('ErrorCode'))
    if error_code != '0':
        raise ValueError(_clean(result.get('ErrorText')) or 'VIN did not decode cleanly.')
    make, model, year = _clean(result.get('Make')), _clean(result.get('Model')), _clean(result.get('ModelYear'))
    if not make or not model or not year.isdigit():
        raise ValueError('VIN decoder did not identify make, model, and year.')
    displacement = _clean(result.get('DisplacementL'))
    return {
        'vin': normalized_vin,
        'make': make,
        'model': model,
        'year': int(year),
        'trim': _clean(result.get('Trim')),
        'engine_code': _clean(result.get('EngineModel')),
        'displacement_l': float(displacement) if displacement else None,
    }


def fetch_vpic_json(url):
    request = Request(url, headers={'User-Agent': 'MechanicLaborPlanner/0.1 personal-use lookup'})
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode('utf-8'))


def fetch_lemon_html(url):
    request = Request(url, headers={'User-Agent': 'MechanicLaborPlanner/0.1 personal-use lookup'})
    with urlopen(request, timeout=30) as response:
        return response.read().decode('utf-8')


def _source_make_url(decoded_make, fetch_html):
    root_url = f'{BASE_URL}/'
    for href in extract_child_links(fetch_html(root_url)):
        candidate_url = urljoin(root_url, href)
        candidate_make = unquote(urlparse(candidate_url).path.strip('/'))
        if candidate_make.casefold() == decoded_make.casefold():
            return candidate_make, candidate_url
    return None, None


def find_lemon_manuals(vehicle, fetch_html):
    source_make, make_url = _source_make_url(vehicle['make'], fetch_html)
    if not make_url or not source_make:
        return [], vehicle
    vehicle = {**vehicle, 'make': source_make}
    year_url = urljoin(make_url, f"{vehicle['year']}/")
    candidates = []
    for href in extract_child_links(fetch_html(year_url)):
        entry = parse_vehicle_entry(urlparse(urljoin(year_url, href)).path)
        if entry:
            entry_make = str(entry['make'])
            entry_model = str(entry['model'])
            if entry_make.casefold() == source_make.casefold() and entry_model.casefold() == vehicle['model'].casefold():
                candidates.append(entry)
    return candidates, vehicle


def decode_vin_and_find_manuals(vin, fetch_json, fetch_html):
    response = fetch_json(f'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/{vin.strip().upper()}?format=json')
    vehicle = _decoded_vehicle(vin, response)
    candidates, vehicle = find_lemon_manuals(vehicle, fetch_html)
    return {'vehicle': vehicle, 'manual_candidates': candidates}
