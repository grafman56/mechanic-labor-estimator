#!/usr/bin/env python3
"""Private local server: static planner plus same-origin LEMON metadata lookup."""
import json
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from tools.manual_lookup import fetch_manual_html, fetch_manual_metadata, lookup_job_labor, lookup_job_operation_rows, manual_has_parts_labor
from tools.vin_lookup import decode_vin_and_find_manuals, fetch_lemon_html, fetch_vpic_json
from tools.procedure_evidence import lookup_job_procedure_evidence


MANUAL_AVAILABILITY_TTL_SECONDS = 900


class ManualAvailabilityCache:
    def __init__(self, ttl_seconds=MANUAL_AVAILABILITY_TTL_SECONDS, now=time.time):
        self.ttl_seconds = ttl_seconds
        self.now = now
        self.entries = {}
        self.lock = threading.Lock()

    def lookup(self, manual_url, probe):
        now = self.now()
        with self.lock:
            cached = self.entries.get(manual_url)
            if cached and now - cached['checked_at'] < self.ttl_seconds:
                return {**cached, 'cached': True}
        available = probe(manual_url)
        result = {'available': available, 'checked_at': self.now(), 'cached': False}
        with self.lock:
            self.entries[manual_url] = {key: result[key] for key in ('available', 'checked_at')}
        return result


manual_availability_cache = ManualAvailabilityCache()


class PlannerHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path not in ('/api/manual-metadata', '/api/manual-availability', '/api/live-job-rows', '/api/live-job-labor', '/api/procedure-evidence', '/api/vin-manuals'):
            return super().do_GET()
        query = parse_qs(parsed.query)
        url = query.get('url', [''])[0]
        try:
            if parsed.path == '/api/manual-metadata':
                payload = fetch_manual_metadata(url)
            elif parsed.path == '/api/manual-availability':
                payload = manual_availability_cache.lookup(url, lambda manual_url: manual_has_parts_labor(manual_url, fetch_manual_html))
            elif parsed.path == '/api/live-job-rows':
                payload = lookup_job_operation_rows(url, query.get('job', [''])[0], fetch_manual_html)
            elif parsed.path == '/api/procedure-evidence':
                payload = lookup_job_procedure_evidence(url, query.get('job', [''])[0], fetch_manual_html, query.get('source_operation_url', [''])[0] or None)
            elif parsed.path == '/api/live-job-labor':
                payload = lookup_job_labor(url, query.get('job', [''])[0], fetch_manual_html, query.get('scope', [''])[0] or None, query.get('source_row', [''])[0] or None, query.get('source_operation_url', [''])[0] or None)
            else:
                payload = decode_vin_and_find_manuals(query.get('vin', [''])[0], fetch_vpic_json, fetch_lemon_html)
            status = 200
        except (ValueError, OSError) as error:
            payload, status = {'error': str(error)}, 400
        encoded = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8099), PlannerHandler).serve_forever()
