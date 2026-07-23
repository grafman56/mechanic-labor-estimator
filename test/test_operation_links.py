import unittest

from tools.manual_lookup import extract_labor_times, find_operation_links, lookup_job_labor


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
        })

    def test_refuses_to_choose_between_multiple_source_operations(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': (
                '<a href="Engine/Water%20Pump/">Water Pump</a>'
                '<a href="Cooling/Water%20Pump/">Water Pump</a>'
            ),
        }
        self.assertEqual(lookup_job_labor(manual_url, 'water-pump', pages.__getitem__), {
            'status': 'unavailable',
            'job_id': 'water-pump',
            'reason': 'Multiple exact source operations require review.',
        })


if __name__ == '__main__':
    unittest.main()
