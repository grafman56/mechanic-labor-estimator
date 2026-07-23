import unittest

from tools.vin_lookup import decode_vin_and_find_manuals


class VinLookupTests(unittest.TestCase):
    def test_returns_decoded_identity_and_only_exact_model_manual_candidates(self):
        vin = '2HNYD18836H516598'
        decoded = {
            'Results': [{
                'ErrorCode': '0', 'Make': 'ACURA', 'Model': 'MDX', 'ModelYear': '2006',
                'Trim': 'Touring', 'EngineModel': 'J35A5', 'DisplacementL': '3.474057568',
            }],
        }
        pages = {
            'https://lemon-manuals.la/': '<a href="Acura/">Acura</a>',
            'https://lemon-manuals.la/Acura/2006/': (
                '<a href="MDX%20V6-3.5L/">MDX V6-3.5L</a>'
                '<a href="TL%20V6-3.2L/">TL V6-3.2L</a>'
            ),
        }
        result = decode_vin_and_find_manuals(vin, lambda _: decoded, pages.__getitem__)
        self.assertEqual(result, {
            'vehicle': {
                'vin': vin, 'make': 'Acura', 'model': 'MDX', 'year': 2006,
                'trim': 'Touring', 'engine_code': 'J35A5', 'displacement_l': 3.474057568,
            },
            'manual_candidates': [{
                'make': 'Acura', 'year': 2006, 'model': 'MDX', 'engine': 'V6-3.5L',
                'manual_url': 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/',
            }],
        })

    def test_rejects_a_vin_that_does_not_decode_cleanly(self):
        bad = {'Results': [{'ErrorCode': '1', 'ErrorText': 'Invalid VIN'}]}
        with self.assertRaisesRegex(ValueError, 'Invalid VIN'):
            decode_vin_and_find_manuals('1HGCM82633A004352', lambda _: bad, lambda _: '')


if __name__ == '__main__':
    unittest.main()
