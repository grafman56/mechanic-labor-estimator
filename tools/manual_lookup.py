"""Safe, low-volume LEMON manual lookup primitives for the private service."""
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


class _TitleParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.parts = []
    def handle_starttag(self, tag, attrs):
        self.in_title = tag == 'title'
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
    def handle_data(self, data):
        if self.in_title: self.parts.append(data)


def validate_manual_url(url):
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.netloc != 'lemon-manuals.la' or not parsed.path.endswith('/'):
        return None
    return url


class _LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.href = None
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.href = dict(attrs).get('href')

    def handle_data(self, data):
        if self.href and data.strip():
            self.links.append((data.strip(), self.href))
            self.href = None


class _LaborTableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_labor_table = False
        self.in_cell = False
        self.cell_parts = []
        self.current_row = []
        self.rows = []

    def handle_starttag(self, tag, attrs):
        if tag == 'table' and 'labor-times-table' in dict(attrs).get('class', ''):
            self.in_labor_table = True
        elif self.in_labor_table and tag in ('td', 'th'):
            self.in_cell = True
            self.cell_parts = []

    def handle_data(self, data):
        if self.in_cell:
            self.cell_parts.append(data)

    def handle_endtag(self, tag):
        if self.in_labor_table and tag in ('td', 'th'):
            self.current_row.append(' '.join(''.join(self.cell_parts).split()))
            self.in_cell = False
        elif self.in_labor_table and tag == 'tr':
            if self.current_row:
                self.rows.append(self.current_row)
            self.current_row = []
        elif tag == 'table':
            self.in_labor_table = False


def find_operation_links(html, aliases, base_url):
    parser = _LinkParser()
    parser.feed(html)
    expected = {alias.casefold() for alias in aliases}
    return [
        {'title': title, 'source_url': urljoin(base_url, href)}
        for title, href in parser.links
        if title.casefold() in expected
    ]


def extract_labor_times(html):
    parser = _LaborTableParser()
    parser.feed(html)
    rows = []
    for cells in parser.rows:
        if len(cells) != 5 or cells[1] == 'Standard Hours':
            continue
        try:
            standard_hours = float(cells[1])
            warranty_hours = float(cells[2])
        except ValueError:
            continue
        rows.append({
            'operation': cells[0],
            'standard_hours': standard_hours,
            'warranty_hours': warranty_hours,
            'skill_level': cells[3],
            'notes': cells[4],
        })
    return rows


TIER1_JOB_ALIASES = {
    'front-struts': ('Suspension Strut / Shock Absorber',),
    'rear-struts-shocks': ('Suspension Strut / Shock Absorber',),
    'alternator': ('Alternator',),
    'starter': ('Starter',),
    'radiator': ('Radiator',),
    'wheel-bearing-hub': ('Wheel Bearing',),
    'serpentine-belt': ('Drive Belt',),
    'spark-plugs': ('Spark Plug',),
    'valve-cover-gasket': ('Valve Cover Gasket',),
    'timing-belt': ('Timing Belt',),
    'water-pump': ('Water Pump',),
}


def lookup_job_candidates(manual_url, job_id, fetch_html):
    safe_url = validate_manual_url(manual_url)
    if not safe_url:
        raise ValueError('Unsupported manual URL')
    aliases = TIER1_JOB_ALIASES.get(job_id)
    if not aliases:
        raise ValueError('Unsupported repair job')
    parts_labor_url = urljoin(safe_url, 'Parts%20and%20Labor/')
    return {
        'job_id': job_id,
        'candidates': find_operation_links(fetch_html(parts_labor_url), aliases, parts_labor_url),
    }


def lookup_job_labor(manual_url, job_id, fetch_html):
    safe_url = validate_manual_url(manual_url)
    if not safe_url:
        raise ValueError('Unsupported manual URL')
    aliases = TIER1_JOB_ALIASES.get(job_id)
    if not aliases:
        raise ValueError('Unsupported repair job')
    parts_labor_url = urljoin(safe_url, 'Parts%20and%20Labor/')
    matches = find_operation_links(fetch_html(parts_labor_url), aliases, parts_labor_url)
    if not matches:
        return {'status': 'unavailable', 'job_id': job_id, 'reason': 'No exact source operation found.'}
    if len(matches) != 1:
        return {'status': 'unavailable', 'job_id': job_id, 'reason': 'Multiple exact source operations require review.'}
    labor_url = urljoin(matches[0]['source_url'], 'Labor%20Times/')
    replace_rows = [
        row for row in extract_labor_times(fetch_html(labor_url))
        if row['operation'].casefold() == 'replace'
    ]
    if len(replace_rows) != 1:
        return {'status': 'unavailable', 'job_id': job_id, 'reason': 'No unambiguous source replace time found.'}
    return {
        'status': 'available',
        'job_id': job_id,
        'source_operation': matches[0]['title'],
        'source_url': labor_url,
        'standard_hours': replace_rows[0]['standard_hours'],
    }


def extract_title(html):
    parser = _TitleParser(); parser.feed(html)
    return ''.join(parser.parts).strip()


def fetch_manual_html(url):
    safe_url = validate_manual_url(url)
    if not safe_url:
        raise ValueError('Unsupported manual URL')
    request = Request(safe_url, headers={'User-Agent': 'MechanicLaborPlanner/0.1 personal-use lookup'})
    with urlopen(request, timeout=30) as response:
        return response.read().decode('utf-8')


def fetch_manual_metadata(url):
    safe_url = validate_manual_url(url)
    if not safe_url:
        raise ValueError('Unsupported manual URL')
    return {'source_url': safe_url, 'title': extract_title(fetch_manual_html(safe_url))}
