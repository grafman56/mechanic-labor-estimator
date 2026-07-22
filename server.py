#!/usr/bin/env python3
"""Private local server: static planner plus same-origin LEMON metadata lookup."""
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from tools.manual_lookup import fetch_manual_metadata


class PlannerHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path != '/api/manual-metadata':
            return super().do_GET()
        url = parse_qs(parsed.query).get('url', [''])[0]
        try:
            payload, status = fetch_manual_metadata(url), 200
        except (ValueError, OSError) as error:
            payload, status = {'error': str(error)}, 400
        encoded = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'private, max-age=86400')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8099), PlannerHandler).serve_forever()
