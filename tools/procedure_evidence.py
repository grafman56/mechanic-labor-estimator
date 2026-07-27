import re
from html.parser import HTMLParser
from urllib.parse import urljoin

from tools.manual_lookup import lookup_job_candidates, validate_manual_url


MDX_2006_V6_MANUAL_URL = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
MDX_2006_V6_VALVE_COVER_OPERATION_URL = (
    f'{MDX_2006_V6_MANUAL_URL}Parts%20and%20Labor/Engine%2C%20Cooling%20and%20Exhaust/Engine/Valve%20Cover%20Gasket/'
)
MDX_2006_V6_WATER_PUMP_OPERATION_URL = (
    f'{MDX_2006_V6_MANUAL_URL}Parts%20and%20Labor/Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/'
)
PROCEDURE_INSTALLATION_PATHS = {
    (MDX_2006_V6_MANUAL_URL, 'valve-cover-gasket', MDX_2006_V6_VALVE_COVER_OPERATION_URL): (
        'Repair%20and%20Diagnosis/Engine%2C%20Cooling%20and%20Exhaust/Engine/'
        'Cylinder%20Head%20Assembly/Valve%20Cover/Service%20and%20Repair/'
        'Cylinder%20Head%20Cover%20Installation/'
    ),
    (MDX_2006_V6_MANUAL_URL, 'water-pump', MDX_2006_V6_WATER_PUMP_OPERATION_URL): (
        'Repair%20and%20Diagnosis/Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/'
        'Service%20and%20Repair/Water%20Pump%20Replacement/'
    ),
}
PROCEDURE_CONTEXT_PATHS = {
    (MDX_2006_V6_MANUAL_URL, 'valve-cover-gasket', MDX_2006_V6_VALVE_COVER_OPERATION_URL): (
        'Repair%20and%20Diagnosis/Engine%2C%20Cooling%20and%20Exhaust/Engine/'
        'Cylinder%20Head%20Assembly/Valve%20Cover/Service%20and%20Repair/'
        'Cylinder%20Head%20Cover%20Removal/',
        PROCEDURE_INSTALLATION_PATHS[(MDX_2006_V6_MANUAL_URL, 'valve-cover-gasket', MDX_2006_V6_VALVE_COVER_OPERATION_URL)],
    ),
}
PROCEDURE_CONTEXT_KEYWORDS = {
    (MDX_2006_V6_MANUAL_URL, 'valve-cover-gasket', MDX_2006_V6_VALVE_COVER_OPERATION_URL): (
        ('remove', 'intake manifold'),
        ('remove', 'six ignition coils'),
        ('install', 'six ignition coils'),
        ('install', 'intake manifold'),
    ),
    (MDX_2006_V6_MANUAL_URL, 'water-pump', MDX_2006_V6_WATER_PUMP_OPERATION_URL): (
        ('drain', 'engine coolant'),
        ('remove', 'timing belt'),
        ('remove', 'timing belt adjuster'),
        ('remove', 'water pump'),
    ),
}


class _TextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def _title_case(label):
    return label[:1].upper() + label[1:]


def extract_procedure_evidence(source_url, fetch_html):
    parser = _TextParser()
    parser.feed(fetch_html(source_url))
    text = ' '.join(' '.join(parser.parts).split())
    items = []
    for required in re.finditer(r'install the .+? with a new (.+?) in the reverse order of removal\.', text, re.I):
        items.append({
            'kind': 'required',
            'label': _title_case(required.group(1)),
            'reason': required.group(0),
            'source_url': source_url,
        })
    for check in re.finditer(r'(?:visually )?check the (.+?) for damage\. Replace if necessary\.', text, re.I):
        items.append({
            'kind': 'replace-if-removed',
            'label': _title_case(check.group(1)),
            'reason': check.group(0),
            'source_url': source_url,
        })
    for inspect in re.finditer(r'inspect the (.+?)\. Replace any .+? that is damaged or deteriorated\.', text, re.I):
        items.append({
            'kind': 'inspect',
            'label': _title_case(inspect.group(1)),
            'reason': inspect.group(0),
            'source_url': source_url,
        })
    return items


def _context_kind(keywords):
    keyword_set = {keyword.casefold() for keyword in keywords}
    if 'remove' in keyword_set:
        return 'removal-access'
    if 'install' in keyword_set:
        return 'reinstallation'
    if 'drain' in keyword_set:
        return 'drain-handling'
    return 'other'


def extract_keyword_context(source_url, fetch_html, keyword_rules):
    parser = _TextParser()
    parser.feed(fetch_html(source_url))
    text = re.sub(r'\s+([.,])', r'\1', ' '.join(' '.join(parser.parts).split()))
    sentences = [sentence for sentence in re.split(r'(?<=[.!?])\s+', text) if sentence]
    items = []
    for keywords in keyword_rules:
        match = next((sentence for sentence in sentences if all(keyword.casefold() in sentence.casefold() for keyword in keywords)), None)
        if match:
            items.append({'kind': _context_kind(keywords), 'reason': match, 'source_url': source_url})
    return items


def lookup_job_procedure_evidence(manual_url, job_id, fetch_html, source_operation_url=None):
    safe_url = validate_manual_url(manual_url)
    if not safe_url:
        raise ValueError('Unsupported manual URL')
    if not source_operation_url:
        return {'status': 'unavailable', 'reason': 'An exact selected source operation is required for procedure evidence.'}
    candidates = lookup_job_candidates(safe_url, job_id, fetch_html)['candidates']
    if source_operation_url not in {candidate['source_url'] for candidate in candidates}:
        return {'status': 'unavailable', 'reason': 'Selected source operation is unavailable for this manual.'}
    relative_path = PROCEDURE_INSTALLATION_PATHS.get((safe_url, job_id, source_operation_url))
    if not relative_path:
        return {'status': 'unavailable', 'reason': 'No exact procedure path is configured for this manual operation.'}
    source_url = urljoin(safe_url, relative_path)
    try:
        items = extract_procedure_evidence(source_url, fetch_html)
        context_steps = []
        for context_path in PROCEDURE_CONTEXT_PATHS.get((safe_url, job_id, source_operation_url), (relative_path,)):
            context_steps.extend(extract_keyword_context(
                urljoin(safe_url, context_path),
                fetch_html,
                PROCEDURE_CONTEXT_KEYWORDS.get((safe_url, job_id, source_operation_url), ()),
            ))
    except OSError:
        return {'status': 'unavailable', 'reason': 'Procedure source page is unavailable.'}
    if not items and not context_steps:
        return {'status': 'unavailable', 'reason': 'No explicit procedure evidence was found.'}
    result = {'status': 'available', 'items': items}
    if context_steps:
        result['context_steps'] = context_steps
    return result
