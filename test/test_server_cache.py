import http.client
import threading
import unittest

import server


class _QuietPlannerHandler(server.PlannerHandler):
    def log_message(self, format, *args):
        pass


class ManualAvailabilityCacheTests(unittest.TestCase):
    def test_reuses_a_recent_manual_availability_result(self):
        now = [1_000.0]
        calls = []
        cache = server.ManualAvailabilityCache(ttl_seconds=60, now=lambda: now[0])

        first = cache.lookup('https://lemon-manuals.la/BMW/2012/535i/', lambda url: calls.append(url) or True)
        now[0] += 30
        second = cache.lookup('https://lemon-manuals.la/BMW/2012/535i/', lambda url: calls.append(url) or False)

        self.assertEqual(calls, ['https://lemon-manuals.la/BMW/2012/535i/'])
        self.assertEqual(first, {'available': True, 'checked_at': 1_000.0, 'cached': False})
        self.assertEqual(second, {'available': True, 'checked_at': 1_000.0, 'cached': True})

    def test_rechecks_an_expired_manual_availability_result(self):
        now = [1_000.0]
        calls = []
        cache = server.ManualAvailabilityCache(ttl_seconds=60, now=lambda: now[0])

        cache.lookup('https://lemon-manuals.la/BMW/2012/535i/', lambda url: calls.append(url) or False)
        now[0] += 61
        result = cache.lookup('https://lemon-manuals.la/BMW/2012/535i/', lambda url: calls.append(url) or True)

        self.assertEqual(calls, ['https://lemon-manuals.la/BMW/2012/535i/', 'https://lemon-manuals.la/BMW/2012/535i/'])
        self.assertEqual(result, {'available': True, 'checked_at': 1_061.0, 'cached': False})


class ServerCacheTests(unittest.TestCase):
    def setUp(self):
        self.original_lookup = server.lookup_job_procedure_evidence
        server.lookup_job_procedure_evidence = lambda *args: {'status': 'available', 'items': []}
        self.httpd = server.ThreadingHTTPServer(('127.0.0.1', 0), _QuietPlannerHandler)
        self.thread = threading.Thread(target=self.httpd.serve_forever)
        self.thread.start()

    def tearDown(self):
        self.httpd.shutdown()
        self.thread.join()
        self.httpd.server_close()
        server.lookup_job_procedure_evidence = self.original_lookup

    def test_procedure_evidence_response_is_not_cached(self):
        connection = http.client.HTTPConnection('127.0.0.1', self.httpd.server_port)
        connection.request('GET', '/api/procedure-evidence?url=https%3A%2F%2Flemon-manuals.la%2F&job=valve-cover-gasket')
        response = connection.getresponse()
        response.read()

        self.assertEqual(response.status, 200)
        self.assertEqual(response.getheader('Cache-Control'), 'no-store')

    def test_planner_assets_are_not_cached(self):
        connection = http.client.HTTPConnection('127.0.0.1', self.httpd.server_port)
        connection.request('GET', '/app.js')
        response = connection.getresponse()
        response.read()

        self.assertEqual(response.status, 200)
        self.assertEqual(response.getheader('Cache-Control'), 'no-store')


if __name__ == '__main__':
    unittest.main()
