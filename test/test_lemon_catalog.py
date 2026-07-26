import unittest

from tools.lemon_catalog import catalog_file_stem, extract_child_links, extract_make_names, make_navigation_url, parse_vehicle_entry


class LemonCatalogTests(unittest.TestCase):
    def test_extracts_relative_child_links_only(self):
        html = '''<a href="2006/">2006</a><a href="/Acura/2006/">absolute</a><a href="https://elsewhere/">skip</a>'''
        self.assertEqual(extract_child_links(html), ['2006/', '/Acura/2006/'])

    def test_extracts_named_makes_without_a_root_placeholder(self):
        html = '''<a href="Acura/">Acura</a><a href="Alfa%20Romeo/">Alfa Romeo</a><a href="/">home</a><a href="2006/">year</a>'''
        self.assertEqual(extract_make_names(html), ['Acura', 'Alfa Romeo'])

    def test_uses_stable_file_stems_for_spaced_make_names(self):
        self.assertEqual(catalog_file_stem('Dodge and Ram'), 'dodge-and-ram')

    def test_builds_an_encoded_navigation_url_for_a_make_name_with_spaces(self):
        self.assertEqual(make_navigation_url('Alfa Romeo'), 'https://lemon-manuals.la/Alfa%20Romeo/')

    def test_parses_model_and_engine_from_manual_path(self):
        entry = parse_vehicle_entry('/Acura/2006/MDX%20V6-3.5L/')
        self.assertEqual(entry, {
            'make': 'Acura', 'year': 2006, 'model': 'MDX', 'engine': 'V6-3.5L',
            'manual_url': 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/',
        })


if __name__ == '__main__':
    unittest.main()
