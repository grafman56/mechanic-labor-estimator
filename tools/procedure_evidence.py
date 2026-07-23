import re
from html.parser import HTMLParser
from urllib.parse import urljoin

from tools.manual_lookup import validate_manual_url


PROCEDURE_INSTALLATION_PATHS = {
    'valve-cover-gasket': (
        'Repair%20and%20Diagnosis/Engine%2C%20Cooling%20and%20Exhaust/Engine/'
        'Cylinder%20Head%20Assembly/Valve%20Cover/Service%20and%20Repair/'
        'Cylinder%20Head%20Cover%20Installation/'
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


def lookup_job_procedure_evidence(manual_url, job_id, fetch_html):
    safe_url = validate_manual_url(manual_url)
    if not safe_url:
        raise ValueError('Unsupported manual URL')
    relative_path = PROCEDURE_INSTALLATION_PATHS.get(job_id)
    if not relative_path:
        return {'status': 'unavailable', 'reason': 'No exact procedure path is configured for this source operation.'}
    source_url = urljoin(safe_url, relative_path)
    items = extract_procedure_evidence(source_url, fetch_html)
    if not items:
        return {'status': 'unavailable', 'reason': 'No explicit procedure evidence was found.'}
    return {'status': 'available', 'items': items}
