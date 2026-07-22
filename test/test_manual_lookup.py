import unittest

from tools.manual_lookup import extract_title, validate_manual_url


class ManualLookupTests(unittest.TestCase):
    def test_accepts_only_lemon_manual_urls(self):
        self.assertEqual(validate_manual_url('https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'), 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/')
        self.assertIsNone(validate_manual_url('https://example.com/'))

    def test_extracts_page_title_without_returning_manual_body(self):
        self.assertEqual(extract_title('<title>MDX Manual</title><p>private body</p>'), 'MDX Manual')


if __name__ == '__main__':
    unittest.main()
