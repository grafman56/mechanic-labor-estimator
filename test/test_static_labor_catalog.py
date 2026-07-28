import unittest

from tools.static_labor_catalog import build_static_record, filter_vehicle_catalog


class StaticLaborCatalogTests(unittest.TestCase):
    def test_filters_only_requested_makes_and_year_range(self):
        catalog = [
            {'make': 'Acura', 'year': 2006, 'model': 'MDX', 'engine': 'V6-3.5L', 'manual_url': 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'},
            {'make': 'Acura', 'year': 1990, 'model': 'Legend', 'engine': 'V6-2.7L', 'manual_url': 'https://lemon-manuals.la/Acura/1990/Legend%20V6-2.7L/'},
            {'make': 'Tesla', 'year': 2020, 'model': 'Model 3', 'engine': 'Electric', 'manual_url': 'https://lemon-manuals.la/Tesla/2020/Model%203%20Electric/'},
        ]

        self.assertEqual(filter_vehicle_catalog(catalog, {'Acura'}, 1991, 2026), [catalog[0]])

    def test_serializes_an_exact_available_result_without_manual_content(self):
        vehicle = {'make': 'Acura', 'year': 2006, 'model': 'MDX', 'engine': 'V6-3.5L', 'manual_url': 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'}
        result = {
            'status': 'available',
            'source_operation': 'Alternator',
            'source_row': 'Replace',
            'source_url': 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/Parts%20and%20Labor/Alternator/Labor%20Times/',
            'standard_hours': 1.5,
        }

        self.assertEqual(build_static_record(vehicle, 'alternator', result, '2026-07-28T01:41:36Z'), {
            'year': 2006,
            'make': 'Acura',
            'model': 'MDX',
            'configuration': 'V6-3.5L',
            'manual_url': vehicle['manual_url'],
            'job_id': 'alternator',
            'status': 'available',
            'hours': 1.5,
            'source_operation': 'Alternator',
            'source_row': 'Replace',
            'source_url': result['source_url'],
            'checked_at': '2026-07-28T01:41:36Z',
        })

    def test_serializes_an_explicit_unavailable_result_without_a_labor_value(self):
        vehicle = {'make': 'Acura', 'year': 2006, 'model': 'MDX', 'engine': 'V6-3.5L', 'manual_url': 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'}

        record = build_static_record(vehicle, 'alternator', {
            'status': 'unavailable',
            'reason': 'No exact source operation found.',
        }, '2026-07-28T01:41:36Z')

        self.assertEqual(record['status'], 'unavailable')
        self.assertEqual(record['reason'], 'No exact source operation found.')
        self.assertNotIn('hours', record)
        self.assertNotIn('source_url', record)


if __name__ == '__main__':
    unittest.main()
