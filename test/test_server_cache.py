import http.client
import threading
import unittest

import server


class _QuietPlannerHandler(server.PlannerHandler):
    def log_message(self, format, *args):
        pass


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


if __name__ == '__main__':
    unittest.main()
