#!/bin/bash

# AI Mind Map Generator - Development Environment Setup Script

set -e  # Exit on any error

echo "🚀 Setting up AI Mind Map Generator development environment..."

# Update package lists
echo "📦 Updating package lists..."
sudo apt-get update

# Install Node.js and npm (using NodeSource repository for latest LTS)
echo "📦 Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python3 (for alternative server option)
echo "🐍 Installing Python3..."
sudo apt-get install -y python3 python3-pip

# Install curl for testing HTTP responses
echo "🌐 Installing curl..."
sudo apt-get install -y curl

# Install additional tools that might be useful
echo "🔧 Installing additional development tools..."
sudo apt-get install -y git wget unzip

# Verify installations
echo "✅ Verifying installations..."
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Python3 version: $(python3 --version)"
echo "curl version: $(curl --version | head -n1)"

# Add Node.js and npm to PATH in user's profile (if not already there)
echo "🔧 Configuring PATH in ~/.profile..."
if ! grep -q "# Node.js PATH" ~/.profile; then
    echo "" >> ~/.profile
    echo "# Node.js PATH" >> ~/.profile
    echo 'export PATH="/usr/bin:$PATH"' >> ~/.profile
fi

# Create a simple validation script for the web application
echo "📝 Creating application validation script..."
cat > validate_app.sh << 'EOF'
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
EOF

chmod +x validate_app.sh

# Source the profile to make sure PATH is updated
source ~/.profile

echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Summary of installed tools:"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)" 
echo "  - Python3: $(python3 --version)"
echo "  - curl: Available for HTTP testing"
echo ""
echo "🚀 Ready to run tests!"