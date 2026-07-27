#!/bin/sh
set -eu

python3 -m unittest discover -s test -p 'test_*.py' -v
npm test
node --check app.js
node --check src/procedure-evidence.js
python3 -m py_compile server.py tools/procedure_evidence.py
git diff --check
