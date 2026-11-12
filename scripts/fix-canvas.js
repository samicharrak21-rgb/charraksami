#!/usr/bin/env node

// Fix canvas dependencies for Railway deployment
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing canvas dependencies for Railway...\n');

// Read current package.json
const packagePath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Create backup
fs.writeFileSync(packagePath + '.backup', JSON.stringify(packageJson, null, 2));
console.log('✅ Created backup of package.json');

// Remove canvas from production dependencies
if (packageJson.dependencies && packageJson.dependencies.canvas) {
  delete packageJson.dependencies.canvas;
  console.log('✅ Removed canvas from dependencies');
}

// Add canvas to dev dependencies if not already there
if (!packageJson.devDependencies) {
  packageJson.devDependencies = {};
}
if (!packageJson.devDependencies.canvas) {
  packageJson.devDependencies.canvas = '^2.11.2';
  console.log('✅ Added canvas to dev dependencies');
}

// Write updated package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json');

// Create railway-specific package.json
const railwayPackagePath = path.join(__dirname, '../package-railway.json');
const railwayPackage = { ...packageJson };

// Ensure canvas is not in dependencies for Railway
if (railwayPackage.dependencies && railwayPackage.dependencies.canvas) {
  delete railwayPackage.dependencies.canvas;
}

fs.writeFileSync(railwayPackagePath, JSON.stringify(railwayPackage, null, 2));
console.log('✅ Created package-railway.json');

// Update .dockerignore to exclude canvas from production build
const dockerignorePath = path.join(__dirname, '../.dockerignore');
let dockerignore = '';
if (fs.existsSync(dockerignorePath)) {
  dockerignore = fs.readFileSync(dockerignorePath, 'utf8');
}

if (!dockerignore.includes('node_modules/canvas')) {
  dockerignore += '\nnode_modules/canvas';
  fs.writeFileSync(dockerignorePath, dockerignore);
  console.log('✅ Updated .dockerignore');
}

console.log('\n🎯 Canvas dependencies fixed for Railway deployment!');
console.log('\n📋 Next steps:');
console.log('1. Commit and push the changes');
console.log('2. Railway will use the updated package.json');
console.log('3. Canvas will be excluded from production build');
console.log('\n💡 Note: Canvas-dependent features will be disabled in production');

// Create canvas compatibility check
const canvasCheck = `
// Canvas compatibility check
let canvas;
try {
  canvas = require('canvas');
} catch (err) {
  console.log('⚠️ Canvas not available in production - image features disabled');
  canvas = null;
}

module.exports = { canvas };
`;

fs.writeFileSync(path.join(__dirname, '../src/canvas-check.js'), canvasCheck);
console.log('✅ Created canvas compatibility check');
