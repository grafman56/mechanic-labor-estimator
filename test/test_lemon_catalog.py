import unittest

from tools.lemon_catalog import extract_child_links, parse_vehicle_entry


class LemonCatalogTests(unittest.TestCase):
    def test_extracts_relative_child_links_only(self):
        html = '''<a href="2006/">2006</a><a href="/Acura/2006/">absolute</a><a href="https://elsewhere/">skip</a>'''
        self.assertEqual(extract_child_links(html), ['2006/', '/Acura/2006/'])

    def test_parses_model_and_engine_from_manual_path(self):
        entry = parse_vehicle_entry('/Acura/2006/MDX%20V6-3.5L/')
        self.assertEqual(entry, {
            'make': 'Acura', 'year': 2006, 'model': 'MDX', 'engine': 'V6-3.5L',
            'manual_url': 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/',
        })


if __name__ == '__main__':
    unittest.main()
