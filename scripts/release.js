#!/usr/bin/env node
/**
 * Semantic versioning release script
 * Usage: npm run release:patch|minor|major
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const versionType = process.argv[2];
if (!['patch', 'minor', 'major'].includes(versionType)) {
    console.error('❌ Invalid version type. Use: patch, minor, or major');
    process.exit(1);
}

const pkgPath = path.join(__dirname, '..', 'package.json');
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');

// Read current version
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version.split('.');

// Bump version
const [major, minor, patch] = currentVersion.map(Number);
let newVersion;

switch (versionType) {
    case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
    case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
    case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
}

console.log(`📦 Releasing ${pkg.name}`);
console.log(`   ${pkg.version} → ${newVersion}`);

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('✅ Updated package.json');

// Update CHANGELOG.md
const today = new Date().toISOString().split('T')[0];
const changelogContent = fs.readFileSync(changelogPath, 'utf8');
const updatedChangelog = changelogContent
    .replace(
        '## [Unreleased]',
        `## [Unreleased]\n\n## [${newVersion}] - ${today}`
    );
fs.writeFileSync(changelogPath, updatedChangelog);
console.log('✅ Updated CHANGELOG.md');

// Commit changes
try {
    execSync(`git add package.json CHANGELOG.md`, { stdio: 'inherit' });
    execSync(`git commit -m "chore: release v${newVersion}"`, { stdio: 'inherit' });
    console.log('✅ Created commit');

    // Create git tag
    execSync(`git tag -a v${newVersion} -m "Release version ${newVersion}"`, { stdio: 'inherit' });
    console.log(`✅ Created git tag v${newVersion}`);

    // Show next steps
    console.log(`\n🚀 Release ready! Next steps:`);
    console.log(`   git push origin main --tags`);
    console.log(`   Then create a release on GitHub`);
} catch (error) {
    console.error('❌ Error during release:', error.message);
    process.exit(1);
}
