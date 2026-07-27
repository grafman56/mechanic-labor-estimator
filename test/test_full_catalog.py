import json
from pathlib import Path
import unittest


ROOT = Path(__file__).parent.parent


class FullCatalogTests(unittest.TestCase):
    def test_generated_index_references_complete_make_catalogs(self):
        index = json.loads((ROOT / 'data/lemon-catalog-index.json').read_text(encoding='utf-8'))
        self.assertEqual(len(index), 69)
        self.assertEqual(len({entry['make'] for entry in index}), 69)
        total = 0
        empty_makes = []
        for entry in index:
            path = ROOT / entry['path'].removeprefix('./')
            self.assertTrue(path.is_file(), entry['path'])
            records = json.loads(path.read_text(encoding='utf-8'))
            total += len(records)
            if not records:
                empty_makes.append(entry['make'])
            for record in records:
                self.assertEqual(record['make'], entry['make'])
                self.assertTrue(record['manual_url'].startswith('https://lemon-manuals.la/'))
                self.assertIsInstance(record['year'], int)
        self.assertGreater(total, 300_000)
        self.assertEqual(empty_makes, ['General Motors', 'ZAP'])


if __name__ == '__main__':
    unittest.main()
