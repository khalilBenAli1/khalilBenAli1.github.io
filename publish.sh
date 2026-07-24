#!/bin/bash
# Build the site and publish dist/ to the gh-pages branch.
# Usage: ./publish.sh
set -euo pipefail
cd "$(dirname "$0")"

npm run build
SHA=$(git rev-parse --short HEAD)

cd dist
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git -c core.hooksPath=/dev/null commit -q -m "Deploy site @ ${SHA}"
git push -f https://github.com/khalilBenAli1/khalilBenAli1.github.io.git gh-pages
cd ..
rm -rf dist/.git
echo "Published gh-pages @ ${SHA}"
