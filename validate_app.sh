#!/bin/bash

# Function to check if a file exists and is not empty
check_file() {
    if [ -f "$1" ] && [ -s "$1" ]; then
        echo "✅ $1 exists and is not empty"
        return 0
    else
        echo "❌ $1 is missing or empty"
        return 1
    fi
}

# Check required files
echo "🔍 Validating application files..."
check_file "index.html"
check_file "script.js" 
check_file "styles.css"
check_file "package.json"
check_file "build.js"

# Check if package.json is valid JSON
echo "🔍 Validating package.json..."
if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
    echo "✅ package.json is valid JSON"
else
    echo "❌ package.json is invalid JSON"
    exit 1
fi

echo "✅ Application validation completed successfully!"
