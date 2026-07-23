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

    def _finish_cell(self):
        if self.in_cell:
            self.current_row.append(' '.join(''.join(self.cell_parts).split()))
            self.in_cell = False

    def _finish_row(self):
        self._finish_cell()
        if self.current_row:
            self.rows.append(self.current_row)
        self.current_row = []

    def handle_starttag(self, tag, attrs):
        if tag == 'table' and 'labor-times-table' in dict(attrs).get('class', ''):
            self.in_labor_table = True
        elif self.in_labor_table and tag == 'tr':
            self._finish_row()
        elif self.in_labor_table and tag in ('td', 'th'):
            self._finish_cell()
            self.in_cell = True
            self.cell_parts = []

    def handle_data(self, data):
        if self.in_cell:
            self.cell_parts.append(data)

    def handle_endtag(self, tag):
        if self.in_labor_table and tag in ('td', 'th'):
            self._finish_cell()
        elif self.in_labor_table and tag == 'tr':
            self._finish_row()
        elif tag == 'table':
            self._finish_row()
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
    service_operation = None
    source_group = None
    for cells in parser.rows:
        if len(cells) == 1:
            if cells[0] in ('Replace', 'Remove and Install', 'Overhaul/Rebuild'):
                service_operation = cells[0]
                source_group = None
            else:
                source_group = cells[0]
            continue
        if len(cells) != 5 or cells[1] == 'Standard Hours':
            continue
        try:
            standard_hours = float(cells[1])
            warranty_hours = float(cells[2])
        except ValueError:
            continue
        operation = ' — '.join(part for part in (service_operation, source_group, cells[0]) if part)
        rows.append({
            'operation': operation,
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
    'starter': ('Starter Motor',),
    'radiator': ('Radiator',),
    'wheel-bearing-hub': ('Wheel Bearing',),
    'serpentine-belt': ('Drive Belt',),
    'spark-plugs': ('Spark Plug',),
    'valve-cover-gasket': ('Valve Cover Gasket',),
    'timing-belt': ('Timing Belt',),
    'water-pump': ('Water Pump',),
}
LABOR_SCOPE_TERMS = {
    'front-struts': {
        'left': (('Front Suspension', 'One Side'),),
        'right': (('Front Suspension', 'One Side'),),
        'both': (('Front Suspension', 'Both Sides'),),
    },
    'rear-struts-shocks': {
        'left': (('Rear Suspension', 'One Side'),),
        'right': (('Rear Suspension', 'One Side'),),
        'both': (('Rear Suspension', 'Both Sides'),),
    },
    'wheel-bearing-hub': {
        'front-one': (('Front Suspension', 'One Side'),),
        'front-both': (('Front Suspension', 'Both Sides'),),
        'hub-one': (('Hub & Bearing Assembly', 'One Side'),),
        'hub-both': (('Hub & Bearing Assembly', 'Both Sides'),),
    },
    'valve-cover-gasket': {
        'front': (('Front Bank',), ('One Bank',)),
        'rear': (('Rear Bank',), ('One Bank',)),
        'both': (('Both Banks',),),
    },
}


def manual_has_parts_labor(manual_url, fetch_html):
    safe_url = validate_manual_url(manual_url)
    if not safe_url:
        raise ValueError('Unsupported manual URL')
    try:
        fetch_html(urljoin(safe_url, 'Parts%20and%20Labor/'))
    except OSError:
        return False
    return True


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


def _select_labor_row(labor_rows, job_id, scope):
    replace_rows = [row for row in labor_rows if row['operation'].casefold().startswith('replace')]
    term_groups = LABOR_SCOPE_TERMS.get(job_id, {}).get(scope) if scope else None
    if term_groups:
        for terms in term_groups:
            scoped_rows = [row for row in replace_rows if all(term.casefold() in row['operation'].casefold() for term in terms)]
            if len(scoped_rows) == 1:
                return scoped_rows[0], 'replace'
        return None, None
    if len(replace_rows) == 1:
        return replace_rows[0], 'replace'
    if not replace_rows and len(labor_rows) == 1:
        return labor_rows[0], 'published-operation'
    return None, None


def lookup_job_labor(manual_url, job_id, fetch_html, scope=None):
    safe_url = validate_manual_url(manual_url)
    if not safe_url:
        raise ValueError('Unsupported manual URL')
    aliases = TIER1_JOB_ALIASES.get(job_id)
    if not aliases:
        raise ValueError('Unsupported repair job')
    parts_labor_url = urljoin(safe_url, 'Parts%20and%20Labor/')
    try:
        parts_labor_html = fetch_html(parts_labor_url)
    except OSError:
        return {'status': 'unavailable', 'job_id': job_id, 'reason': 'Source Parts and Labor page is unavailable.'}
    matches = find_operation_links(parts_labor_html, aliases, parts_labor_url)
    if not matches:
        return {'status': 'unavailable', 'job_id': job_id, 'reason': 'No exact source operation found.'}
    selections = []
    for match in matches:
        labor_url = urljoin(match['source_url'], 'Labor%20Times/')
        selected_row, time_basis = _select_labor_row(extract_labor_times(fetch_html(labor_url)), job_id, scope)
        if selected_row:
            selections.append((match, labor_url, selected_row, time_basis))
    if not selections:
        return {'status': 'unavailable', 'job_id': job_id, 'reason': 'No unambiguous source replace time found.'}
    signatures = {(row['operation'], row['standard_hours'], basis) for _, _, row, basis in selections}
    if len(signatures) != 1:
        return {'status': 'unavailable', 'job_id': job_id, 'reason': 'Multiple exact source operations require review.'}
    match, labor_url, selected_row, time_basis = selections[0]
    return {
        'status': 'available',
        'job_id': job_id,
        'source_operation': match['title'],
        'source_url': labor_url,
        'standard_hours': selected_row['standard_hours'],
        'time_basis': time_basis,
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
