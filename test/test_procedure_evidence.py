import unittest

from tools.procedure_evidence import extract_procedure_evidence, lookup_job_procedure_evidence


class ProcedureEvidenceTests(unittest.TestCase):
    def test_classifies_only_explicit_inspection_and_replace_if_needed_language(self):
        source_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/Repair%20and%20Diagnosis/Valve%20Cover/Installation/'
        pages = {
            source_url: '''<h1>Cylinder Head Cover Installation</h1>
              <p>Visually check the spark plug seals for damage. Replace if necessary.</p>
              <p>Inspect the cover washer. Replace any washer that is damaged or deteriorated.</p>
              <p>Install the intake manifold.</p>''',
        }
        self.assertEqual(extract_procedure_evidence(source_url, pages.__getitem__), [
            {
                'kind': 'replace-if-removed',
                'label': 'Spark plug seals',
                'reason': 'Visually check the spark plug seals for damage. Replace if necessary.',
                'source_url': source_url,
            },
            {
                'kind': 'inspect',
                'label': 'Cover washer',
                'reason': 'Inspect the cover washer. Replace any washer that is damaged or deteriorated.',
                'source_url': source_url,
            },
        ])

    def test_looks_up_valve_cover_installation_evidence_from_selected_manual_operation(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        operation_url = f'{manual_url}Parts%20and%20Labor/Engine%2C%20Cooling%20and%20Exhaust/Engine/Valve%20Cover%20Gasket/'
        source_url = f'{manual_url}Repair%20and%20Diagnosis/Engine%2C%20Cooling%20and%20Exhaust/Engine/Cylinder%20Head%20Assembly/Valve%20Cover/Service%20and%20Repair/Cylinder%20Head%20Cover%20Installation/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Engine%2C%20Cooling%20and%20Exhaust/Engine/Valve%20Cover%20Gasket/">Valve Cover Gasket</a>',
            source_url: '<p>Visually check the spark plug seals for damage. Replace if necessary.</p>',
        }
        self.assertEqual(lookup_job_procedure_evidence(manual_url, 'valve-cover-gasket', pages.__getitem__, source_operation_url=operation_url), {
            'status': 'available',
            'items': [{
                'kind': 'replace-if-removed',
                'label': 'Spark plug seals',
                'reason': 'Visually check the spark plug seals for damage. Replace if necessary.',
                'source_url': source_url,
            }],
        })

    def test_refuses_procedure_evidence_for_an_unselected_or_unknown_operation(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Engine%2C%20Cooling%20and%20Exhaust/Engine/Valve%20Cover%20Gasket/">Valve Cover Gasket</a>',
        }
        self.assertEqual(lookup_job_procedure_evidence(manual_url, 'valve-cover-gasket', pages.__getitem__), {
            'status': 'unavailable',
            'reason': 'An exact selected source operation is required for procedure evidence.',
        })
        self.assertEqual(lookup_job_procedure_evidence(manual_url, 'valve-cover-gasket', pages.__getitem__, source_operation_url='https://lemon-manuals.la/other/Valve%20Cover%20Gasket/'), {
            'status': 'unavailable',
            'reason': 'Selected source operation is unavailable for this manual.',
        })

    def test_reports_an_explicit_new_water_pump_o_ring_as_required(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        operation_url = f'{manual_url}Parts%20and%20Labor/Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/'
        source_url = f'{manual_url}Repair%20and%20Diagnosis/Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/Service%20and%20Repair/Water%20Pump%20Replacement/'
        pages = {
            f'{manual_url}Parts%20and%20Labor/': '<a href="Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/">Water Pump</a>',
            source_url: '''<p>Drain the engine coolant.</p>
              <p>Remove the timing belt .</p>
              <p>Remove the timing belt adjuster.</p>
              <p>Install the water pump with a new O-ring (B) in the reverse order of removal.</p>
              <p>Install the intake manifold.</p>''',
        }
        self.assertEqual(lookup_job_procedure_evidence(manual_url, 'water-pump', pages.__getitem__, source_operation_url=operation_url), {
            'status': 'available',
            'items': [{
                'kind': 'required',
                'label': 'O-ring (B)',
                'reason': 'Install the water pump with a new O-ring (B) in the reverse order of removal.',
                'source_url': source_url,
            }],
            'context_steps': [
                {'reason': 'Drain the engine coolant.', 'source_url': source_url},
                {'reason': 'Remove the timing belt.', 'source_url': source_url},
                {'reason': 'Remove the timing belt adjuster.', 'source_url': source_url},
            ],
        })

    def test_reports_a_missing_procedure_page_as_unavailable(self):
        manual_url = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/'
        operation_url = f'{manual_url}Parts%20and%20Labor/Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/'
        parts_labor_url = f'{manual_url}Parts%20and%20Labor/'
        def fetch_html(url):
            if url == parts_labor_url:
                return '<a href="Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/">Water Pump</a>'
            raise OSError('source page unavailable')
        self.assertEqual(lookup_job_procedure_evidence(manual_url, 'water-pump', fetch_html, source_operation_url=operation_url), {
            'status': 'unavailable',
            'reason': 'Procedure source page is unavailable.',
        })

    def test_does_not_infer_an_intake_gasket_from_an_install_instruction(self):
        source_url = 'https://lemon-manuals.la/example/'
        pages = {source_url: '<p>Install the intake manifold.</p>'}
        self.assertEqual(extract_procedure_evidence(source_url, pages.__getitem__), [])


if __name__ == '__main__':
    unittest.main()
