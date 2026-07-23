import unittest
from urllib.error import HTTPError

from tools.manual_lookup import extract_labor_times, find_operation_links, lookup_job_candidates, lookup_job_labor, lookup_job_labor_rows, lookup_job_operation_rows, manual_has_parts_labor


class OperationLinkTests(unittest.TestCase):
    def test_finds_only_exact_source_operation_titles(self):
        html = (
            '<a href="Alternator/">Alternator</a>'
            '<a href="Alternator%20Bearing/">Alternator Bearing</a>'
            '<a href="Starter/">Starter</a>'
        )
        self.assertEqual(
            find_operation_links(html, ['Alternator'], 'https://lemon-manuals.la/manual/Parts%20and%20Labor/'),
            [{'title': 'Alternator', 'source_url': 'https://lemon-manuals.la/manual/Parts%20and%20Labor/Alternator/'}],
        )

    def test_extracts_replace_standard_hours_from_a_labor_table(self):
        html = (
            "<table class='data-table labor-times-table'><tr><td><b>Replace</b></td>"
            '<td>1.5</td><td>1.3</td><td>B</td><td></td></tr>'
            '<tr><td><b>Overhaul/Rebuild</b></td><td>2.2</td><td>2.0</td><td>B</td>'
            '<td>Includes: R&I Alternator.</td></tr></table>'
        )
        self.assertEqual(
            extract_labor_times(html),
            [
                {'operation': 'Replace', 'standard_hours': 1.5, 'warranty_hours': 1.3, 'skill_level': 'B', 'notes': ''},
                {'operation': 'Overhaul/Rebuild', 'standard_hours': 2.2, 'warranty_hours': 2.0, 'skill_level': 'B', 'notes': 'Includes: R&I Alternator.'},
            ],
        )
    def test_keeps_source_grouping_for_scoped_labor_rows(self):
        html = (
            "<table class='labor-times-table'><tr><td>Replace</td></tr>"
            '<tr><td>Front Suspension</td></tr><tr><td>Both Sides</td><td>1.9</td><td>1.2</td><td>B</td><td></td></tr>'
            '<tr><td>Rear Suspension</td></tr><tr><td>Both Sides</td><td>0.7</td><td>0.6</td><td>B</td><td></td></tr></table>'
        )
        self.assertEqual(extract_labor_times(html), [
            {'operation': 'Replace — Front Suspension — Both Sides', 'standard_hours': 1.9, 'warranty_hours': 1.2, 'skill_level': 'B', 'notes': ''},
            {'operation': 'Replace — Rear Suspension — Both Sides', 'standard_hours': 0.7, 'warranty_hours': 0.6, 'skill_level': 'B', 'notes': ''},
        ])

    def test_looks_up_one_exact_job_and_returns_its_replace_hours(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Starting/Alternator/">Alternator</a>',
            f'{manual_url}Parts%20and%20Labor/Starting/Alternator/Labor%20Times/': (
                "<table class='labor-times-table'><tr><td>Replace</td><td>1.5</td>"
                '<td>1.3</td><td>B</td><td></td></tr></table>'
            ),
        }
        result = lookup_job_labor(manual_url, 'alternator', pages.__getitem__)
        self.assertEqual(result, {
            'status': 'available',
            'job_id': 'alternator',
            'source_operation': 'Alternator',
            'source_url': f'{manual_url}Parts%20and%20Labor/Starting/Alternator/Labor%20Times/',
            'standard_hours': 1.5,
            'time_basis': 'replace',
        })

    def test_matches_source_starter_motor_title(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Starting/Starter%20Motor/">Starter Motor</a>',
            f'{manual_url}Parts%20and%20Labor/Starting/Starter%20Motor/Labor%20Times/': "<table class='labor-times-table'><tr><td>Replace</td><td>1.2</td><td>1.0</td><td>B</td><td></td></tr></table>",
        }
        self.assertEqual(lookup_job_labor(manual_url, 'starter', pages.__getitem__)['standard_hours'], 1.2)

    def test_matches_a_factory_manual_air_filter_element_title(self):
        manual_url = 'https://lemon-manuals.la/BMW/2006/325Ci%20Convertible%20%28E46%29%20L6-2.5L%20%28M54%29/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Maintenance/Filters/Air%20Filter%20Element/">Air Filter Element</a>',
            f'{manual_url}Parts%20and%20Labor/Maintenance/Filters/Air%20Filter%20Element/Labor%20Times/': "<table class='labor-times-table'><tr><td>Replace</td><td>0.3</td><td>0.2</td><td>C</td><td></td></tr></table>",
        }
        self.assertEqual(lookup_job_labor(manual_url, 'engine-air-filter', pages.__getitem__), {
            'status': 'available',
            'job_id': 'engine-air-filter',
            'source_operation': 'Air Filter Element',
            'source_url': f'{manual_url}Parts%20and%20Labor/Maintenance/Filters/Air%20Filter%20Element/Labor%20Times/',
            'standard_hours': 0.3,
            'time_basis': 'replace',
        })

    def test_matches_a_factory_manual_cabin_air_filter_title(self):
        manual_url = 'https://lemon-manuals.la/BMW/2006/325Ci%20Convertible%20%28E46%29%20L6-2.5L%20%28M54%29/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Maintenance/Filters/Cabin%20Air%20Filter/">Cabin Air Filter / Purifier</a>',
            f'{manual_url}Parts%20and%20Labor/Maintenance/Filters/Cabin%20Air%20Filter/Labor%20Times/': "<table class='labor-times-table'><tr><td>Replace</td><td>0.3</td><td>0.2</td><td>C</td><td></td></tr></table>",
        }
        self.assertEqual(lookup_job_labor(manual_url, 'cabin-air-filter', pages.__getitem__)['standard_hours'], 0.3)

    def test_lists_exact_published_rows_for_scope_selection(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Suspension/Strut/">Suspension Strut / Shock Absorber</a>',
            f'{manual_url}Parts%20and%20Labor/Suspension/Strut/Labor%20Times/': (
                "<table class='labor-times-table'><tr><td>Replace</td></tr>"
                '<tr><td>Left Side</td><td>1.0</td><td>0.6</td><td>B</td><td></td></tr>'
                '<tr><td>Right Side</td><td>1.4</td><td>0.8</td><td>B</td><td></td></tr></table>'
            ),
        }
        self.assertEqual(lookup_job_labor_rows(manual_url, 'front-struts', pages.__getitem__), [
            {'operation': 'Replace — Left Side', 'standard_hours': 1.0},
            {'operation': 'Replace — Right Side', 'standard_hours': 1.4},
        ])

    def test_uses_an_explicit_source_row_without_reinterpreting_side(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Suspension/Strut/">Suspension Strut / Shock Absorber</a>',
            f'{manual_url}Parts%20and%20Labor/Suspension/Strut/Labor%20Times/': (
                "<table class='labor-times-table'><tr><td>Replace</td></tr>"
                '<tr><td>Left Side</td><td>1.0</td><td>0.6</td><td>B</td><td></td></tr>'
                '<tr><td>Right Side</td><td>1.4</td><td>0.8</td><td>B</td><td></td></tr></table>'
            ),
        }
        result = lookup_job_labor(manual_url, 'front-struts', pages.__getitem__, source_row='Replace — Right Side')
        self.assertEqual(result['standard_hours'], 1.4)

    def test_uses_requested_wheel_bearing_variant_and_side(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Suspension/Wheel%20Bearing/">Wheel Bearing</a>',
            f'{manual_url}Parts%20and%20Labor/Suspension/Wheel%20Bearing/Labor%20Times/': (
                "<table class='labor-times-table'><tr><td>Replace</td></tr>"
                '<tr><td>Front Suspension</td></tr><tr><td>One Side</td><td>1.3</td><td>1.1</td><td>B</td><td></td></tr>'
                '<tr><td>Hub &amp; Bearing Assembly</td></tr><tr><td>Both Sides</td><td>5.9</td><td>4.3</td><td>B</td><td></td></tr></table>'
            ),
        }
        self.assertEqual(lookup_job_labor(manual_url, 'wheel-bearing-hub', pages.__getitem__, scope='front-one')['standard_hours'], 1.3)
        self.assertEqual(lookup_job_labor(manual_url, 'wheel-bearing-hub', pages.__getitem__, scope='hub-both')['standard_hours'], 5.9)

    def test_uses_requested_front_strut_scope_from_source_rows(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Suspension/Strut/">Suspension Strut / Shock Absorber</a>',
            f'{manual_url}Parts%20and%20Labor/Suspension/Strut/Labor%20Times/': (
                "<table class='labor-times-table'><tr><td>Replace</td></tr><tr><td>Front Suspension</td></tr>"
                '<tr><td>One Side</td><td>1.0</td><td>0.6</td><td>B</td><td></td></tr>'
                '<tr><td>Both Sides</td><td>1.9</td><td>1.2</td><td>B</td><td></td></tr>'
                '<tr><td>Rear Suspension</td></tr><tr><td>Both Sides</td><td>0.7</td><td>0.6</td><td>B</td><td></td></tr></table>'
            ),
        }
        self.assertEqual(lookup_job_labor(manual_url, 'front-struts', pages.__getitem__, scope='both')['standard_hours'], 1.9)
        self.assertEqual(lookup_job_labor(manual_url, 'front-struts', pages.__getitem__, scope='left')['standard_hours'], 1.0)

    def test_uses_requested_valve_cover_bank_scope_from_source_rows(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Engine/Valve%20Cover%20Gasket/">Valve Cover Gasket</a>',
            f'{manual_url}Parts%20and%20Labor/Engine/Valve%20Cover%20Gasket/Labor%20Times/': (
                "<table class='labor-times-table'><tr><td>Replace</td></tr>"
                '<tr><td>One Bank</td><td>1.3</td><td>0.8</td><td>B</td><td></td></tr>'
                '<tr><td>Both Banks</td><td>2.5</td><td>1.1</td><td>B</td><td></td></tr></table>'
            ),
        }
        self.assertEqual(lookup_job_labor(manual_url, 'valve-cover-gasket', pages.__getitem__, scope='front')['standard_hours'], 1.3)
        self.assertEqual(lookup_job_labor(manual_url, 'valve-cover-gasket', pages.__getitem__, scope='both')['standard_hours'], 2.5)

    def test_prefers_explicit_valve_cover_bank_over_generic_one_bank_row(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Engine/Valve%20Cover%20Gasket/">Valve Cover Gasket</a>',
            f'{manual_url}Parts%20and%20Labor/Engine/Valve%20Cover%20Gasket/Labor%20Times/': (
                "<table class='labor-times-table'><tr><td>Replace</td></tr>"
                '<tr><td>Front Bank</td><td>1.1</td><td>0.8</td><td>B</td><td></td></tr>'
                '<tr><td>Rear Bank</td><td>1.6</td><td>1.0</td><td>B</td><td></td></tr></table>'
            ),
        }
        self.assertEqual(lookup_job_labor(manual_url, 'valve-cover-gasket', pages.__getitem__, scope='front')['standard_hours'], 1.1)
        self.assertEqual(lookup_job_labor(manual_url, 'valve-cover-gasket', pages.__getitem__, scope='rear')['standard_hours'], 1.6)

    def test_accepts_equivalent_duplicate_source_operations(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Engine/Water%20Pump/">Water Pump</a><a href="Cooling/Water%20Pump/">Water Pump</a>',
            f'{manual_url}Parts%20and%20Labor/Engine/Water%20Pump/Labor%20Times/': "<table class='labor-times-table'><tr><td>Replace</td><td>5.1</td><td>3.3</td><td>B</td><td></td></tr></table>",
            f'{manual_url}Parts%20and%20Labor/Cooling/Water%20Pump/Labor%20Times/': "<table class='labor-times-table'><tr><td>Replace</td><td>5.1</td><td>3.3</td><td>B</td><td></td></tr></table>",
        }
        result = lookup_job_labor(manual_url, 'water-pump', pages.__getitem__)
        self.assertEqual(result['status'], 'available')
        self.assertEqual(result['standard_hours'], 5.1)

    def test_refuses_to_choose_between_multiple_source_operations(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': (
                '<a href="Engine/Water%20Pump/">Water Pump</a>'
                '<a href="Cooling/Water%20Pump/">Water Pump</a>'
            ),
            f'{manual_url}Parts%20and%20Labor/Engine/Water%20Pump/Labor%20Times/': "<table class='labor-times-table'><tr><td>Replace</td><td>5.1</td><td>3.3</td><td>B</td><td></td></tr></table>",
            f'{manual_url}Parts%20and%20Labor/Cooling/Water%20Pump/Labor%20Times/': "<table class='labor-times-table'><tr><td>Replace</td><td>0.8</td><td>0.5</td><td>B</td><td></td></tr></table>",
        }
        self.assertEqual(lookup_job_labor(manual_url, 'water-pump', pages.__getitem__), {
            'status': 'unavailable',
            'job_id': 'water-pump',
            'reason': 'Multiple exact source operations require review.',
        })
    def test_detects_when_a_manual_lacks_parts_and_labor(self):
        def missing_page(_):
            raise HTTPError('https://lemon-manuals.la/missing/', 404, 'Not Found', None, None)
        self.assertFalse(manual_has_parts_labor('https://lemon-manuals.la/Acura/2006/MDX%20Base/', missing_page))
        self.assertTrue(manual_has_parts_labor('https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/', lambda _: '<title>Parts</title>'))

    def test_reports_missing_parts_and_labor_as_unavailable(self):
        def missing_page(_):
            raise HTTPError('https://lemon-manuals.la/missing/', 404, 'Not Found', None, None)
        self.assertEqual(lookup_job_labor('https://lemon-manuals.la/Acura/2006/MDX%20Base/', 'front-struts', missing_page), {
            'status': 'unavailable',
            'job_id': 'front-struts',
            'reason': 'Source Parts and Labor page is unavailable.',
        })

    def test_returns_source_paths_for_ambiguous_operations_without_selecting_one(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        index_url = f'{manual_url}Parts%20and%20Labor/'
        html = '<a href="Engine/Water%20Pump/">Water Pump</a><a href="Cooling/Water%20Pump/">Water Pump</a>'
        self.assertEqual(lookup_job_candidates(manual_url, 'water-pump', lambda _: html), {
            'job_id': 'water-pump',
            'candidates': [
                {'title': 'Water Pump', 'source_url': f'{index_url}Engine/Water%20Pump/'},
                {'title': 'Water Pump', 'source_url': f'{index_url}Cooling/Water%20Pump/'},
            ],
        })

    def test_lists_distinct_manual_operations_with_only_their_published_replace_rows(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        index_url = f'{manual_url}Parts%20and%20Labor/'
        pages = {
            index_url: '<a href="Engine/Water%20Pump/">Water Pump</a><a href="Cooling/Water%20Pump/">Water Pump</a>',
            f'{index_url}Engine/Water%20Pump/Labor%20Times/': "<table class='labor-times-table'><tr><td>Replace</td><td>5.1</td><td>3.3</td><td>B</td><td></td></tr><tr><td>Overhaul/Rebuild</td><td>8.0</td><td>5.0</td><td>B</td><td></td></tr></table>",
            f'{index_url}Cooling/Water%20Pump/Labor%20Times/': "<table class='labor-times-table'><tr><td>Replace</td><td>0.8</td><td>0.5</td><td>B</td><td></td></tr></table>",
        }
        self.assertEqual(lookup_job_operation_rows(manual_url, 'water-pump', pages.__getitem__), {
            'job_id': 'water-pump',
            'operations': [
                {
                    'title': 'Water Pump',
                    'source_url': f'{index_url}Engine/Water%20Pump/',
                    'source_path': 'Engine / Water Pump',
                    'rows': [{'operation': 'Replace', 'standard_hours': 5.1}],
                },
                {
                    'title': 'Water Pump',
                    'source_url': f'{index_url}Cooling/Water%20Pump/',
                    'source_path': 'Cooling / Water Pump',
                    'rows': [{'operation': 'Replace', 'standard_hours': 0.8}],
                },
            ],
        })

    def test_deduplicates_only_equivalent_manual_operations(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        index_url = f'{manual_url}Parts%20and%20Labor/'
        pages = {
            index_url: '<a href="Engine/Water%20Pump/">Water Pump</a><a href="Cooling/Water%20Pump/">Water Pump</a>',
            f'{index_url}Engine/Water%20Pump/Labor%20Times/': "<table class='labor-times-table'><tr><td>Replace</td><td>5.1</td><td>3.3</td><td>B</td><td></td></tr></table>",
            f'{index_url}Cooling/Water%20Pump/Labor%20Times/': "<table class='labor-times-table'><tr><td>Replace</td><td>5.1</td><td>3.3</td><td>B</td><td></td></tr></table>",
        }
        self.assertEqual(lookup_job_operation_rows(manual_url, 'water-pump', pages.__getitem__), {
            'job_id': 'water-pump',
            'operations': [{
                'title': 'Water Pump',
                'source_url': f'{index_url}Engine/Water%20Pump/',
                'source_path': 'Engine / Water Pump',
                'rows': [{'operation': 'Replace', 'standard_hours': 5.1}],
            }],
        })

    def test_uses_only_a_rediscovered_selected_operation_url(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        index_url = f'{manual_url}Parts%20and%20Labor/'
        engine_url = f'{index_url}Engine/Water%20Pump/'
        cooling_url = f'{index_url}Cooling/Water%20Pump/'
        pages = {
            index_url: '<a href="Engine/Water%20Pump/">Water Pump</a><a href="Cooling/Water%20Pump/">Water Pump</a>',
            f'{engine_url}Labor%20Times/': "<table class='labor-times-table'><tr><td>Replace</td><td>5.1</td><td>3.3</td><td>B</td><td></td></tr></table>",
            f'{cooling_url}Labor%20Times/': "<table class='labor-times-table'><tr><td>Replace</td><td>0.8</td><td>0.5</td><td>B</td><td></td></tr></table>",
        }
        self.assertEqual(lookup_job_labor(manual_url, 'water-pump', pages.__getitem__, source_row='Replace', source_operation_url=cooling_url)['standard_hours'], 0.8)
        self.assertEqual(lookup_job_labor(manual_url, 'water-pump', pages.__getitem__, source_row='Replace', source_operation_url='https://lemon-manuals.la/other/Water%20Pump/'), {
            'status': 'unavailable',
            'job_id': 'water-pump',
            'reason': 'Selected source operation is unavailable for this manual.',
        })


if __name__ == '__main__':
    unittest.main()
