#!/usr/bin/env python3
"""Private local server: static planner plus same-origin LEMON metadata lookup."""
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from tools.manual_lookup import fetch_manual_html, fetch_manual_metadata, lookup_job_labor, lookup_job_operation_rows, manual_has_parts_labor
from tools.vin_lookup import decode_vin_and_find_manuals, fetch_lemon_html, fetch_vpic_json
from tools.procedure_evidence import lookup_job_procedure_evidence


class PlannerHandler(SimpleHTTPRequestHandler):
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
                payload = {'available': manual_has_parts_labor(url, fetch_manual_html)}
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
        self.send_header('Cache-Control', 'private, max-age=86400')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8099), PlannerHandler).serve_forever()
