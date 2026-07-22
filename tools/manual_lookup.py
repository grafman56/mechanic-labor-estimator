"""Safe, low-volume LEMON manual lookup primitives for the private service."""
from html.parser import HTMLParser
from urllib.parse import urlparse
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


def extract_title(html):
    parser = _TitleParser(); parser.feed(html)
    return ''.join(parser.parts).strip()


def fetch_manual_metadata(url):
    safe_url = validate_manual_url(url)
    if not safe_url: raise ValueError('Unsupported manual URL')
    request = Request(safe_url, headers={'User-Agent': 'MechanicLaborPlanner/0.1 personal-use lookup'})
    with urlopen(request, timeout=30) as response:
        return {'source_url': safe_url, 'title': extract_title(response.read().decode('utf-8'))}
