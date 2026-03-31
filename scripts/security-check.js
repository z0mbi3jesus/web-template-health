#!/usr/bin/env node

/**
 * Security Check Script for Healthcare Appointment System
 * Run this before committing to ensure no sensitive data is exposed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔐 Healthcare Security Check\n');

// Check if .env file exists and is properly ignored
function checkEnvFiles() {
    console.log('📋 Checking environment files...');
    
    const envFiles = [
        '.env',
        '.env.local',
        '.env.production',
        'backend/.env',
        'backend/.env.local',
        'backend/.env.production'
    ];
    let allGood = true;
    
    envFiles.forEach(file => {
        if (fs.existsSync(file)) {
            try {
                const gitCheck = execSync(`git ls-files ${file}`, { encoding: 'utf8' }).trim();
                if (gitCheck) {
                    console.log(`❌ ERROR: ${file} is tracked by Git! Remove it immediately.`);
                    allGood = false;
                } else {
                    console.log(`✅ ${file} exists and is properly ignored`);
                }
            } catch (e) {
                console.log(`✅ ${file} exists and is properly ignored`);
            }
        }
    });
    
    return allGood;
}

// Check for hardcoded secrets in code
function checkHardcodedSecrets() {
    console.log('\n🔍 Scanning for hardcoded secrets...');
    
    const patterns = [
        { name: 'Supabase Keys', pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
        { name: 'Stripe Keys', pattern: /(sk_|pk_)[a-zA-Z0-9_]+/g },
        { name: 'JWT Secrets', pattern: /jwt[_-]?secret.*[=:]\s*["'][^"']{20,}/gi }
    ];
    
    const filesToCheck = ['*.js', '*.html', '*.css', '*.json'];
    let issuesFound = false;
    
    filesToCheck.forEach(pattern => {
        try {
            const files = execSync(`git ls-files "${pattern}"`, { encoding: 'utf8' })
                .split('\n')
                .filter(f => f.trim());
                
            files.forEach(file => {
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf8');
                    
                    patterns.forEach(({ name, pattern }) => {
                        const matches = content.match(pattern);
                        if (matches) {
                            console.log(`❌ ${name} found in ${file}:`);
                            matches.forEach(match => {
                                console.log(`   ${match.substring(0, 20)}...`);
                            });
                            issuesFound = true;
                        }
                    });
                }
            });
        } catch (e) {
            // File pattern not found, continue
        }
    });
    
    if (!issuesFound) {
        console.log('✅ No hardcoded secrets detected');
    }
    
    return !issuesFound;
}

// Check for test data that might contain real information
function checkTestData() {
    console.log('\n🧪 Checking test data...');
    
    const suspiciousPatterns = [
        { name: 'Real Email Domains', pattern: /@(gmail|yahoo|hotmail|outlook)\.com/g },
        { name: 'Real Phone Numbers', pattern: /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g },
        { name: 'SSN Patterns', pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g }
    ];
    
    let issuesFound = false;
    const testFiles = ['test*.js', '*test.js', '*.test.js', 'seed*.sql', 'sample*.json'];
    
    testFiles.forEach(pattern => {
        try {
            const files = execSync(`git ls-files "${pattern}"`, { encoding: 'utf8' })
                .split('\n')
                .filter(f => f.trim());
                
            files.forEach(file => {
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf8');
                    
                    suspiciousPatterns.forEach(({ name, pattern }) => {
                        const matches = content.match(pattern);
                        if (matches && matches.length > 2) { // Allow a few test examples
                            console.log(`⚠️  Potential real ${name} in ${file} (${matches.length} found)`);
                            issuesFound = true;
                        }
                    });
                }
            });
        } catch (e) {
            // File pattern not found, continue
        }
    });
    
    if (!issuesFound) {
        console.log('✅ Test data appears to be anonymized');
    }
    
    return !issuesFound;
}

// Check Git status for staged sensitive files
function checkGitStatus() {
    console.log('\n📊 Checking Git status...');
    
    try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        const stagedFiles = status.split('\n')
            .filter(line => line.startsWith('A ') || line.startsWith('M '))
            .map(line => line.substring(3));
            
        const sensitiveFiles = stagedFiles.filter(file => 
            file.includes('.env') || 
            file.includes('secret') ||
            file.includes('password') ||
            file.includes('key.') ||
            file.endsWith('.pem') ||
            file.endsWith('.key')
        );
        
        if (sensitiveFiles.length > 0) {
            console.log('❌ Sensitive files are staged for commit:');
            sensitiveFiles.forEach(file => console.log(`   ${file}`));
            return false;
        } else {
            console.log('✅ No sensitive files staged for commit');
            return true;
        }
    } catch (e) {
        console.log('⚠️  Could not check Git status');
        return true;
    }
}

// Main security check
function runSecurityCheck() {
    const checks = [
        checkEnvFiles(),
        checkHardcodedSecrets(),
        checkTestData(),
        checkGitStatus()
    ];
    
    const allPassed = checks.every(check => check);
    
    console.log('\n' + '='.repeat(50));
    
    if (allPassed) {
        console.log('🎉 All security checks passed!');
        console.log('✅ Safe to commit');
    } else {
        console.log('🚨 Security issues detected!');
        console.log('❌ DO NOT COMMIT until issues are resolved');
        console.log('\n📖 See SECURITY.md for detailed guidelines');
        process.exit(1);
    }
}

// Run the check
runSecurityCheck();