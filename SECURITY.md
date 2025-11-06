# 🔐 Security Checklist for Healthcare Appointment System

## ⚠️ CRITICAL: Files That Must NEVER Be Committed

### 🚫 **Absolutely Forbidden in Git:**
- [ ] `.env` files (contains Supabase keys, passwords)
- [ ] `config/local.js` or similar local configs
- [ ] Any file containing real patient data
- [ ] Database dumps with real information
- [ ] SSL certificates and private keys
- [ ] API keys hardcoded in source files
- [ ] Real email addresses in test data
- [ ] Production URLs in development code

### 🔍 **Before Every Git Commit:**
- [ ] Run `git status` to check staged files
- [ ] Search code for hardcoded secrets: `grep -r "sk_" .` (Stripe keys)
- [ ] Search for Supabase keys: `grep -r "eyJ" .` (JWT tokens)
- [ ] Check for real emails: `grep -r "@gmail.com\|@yahoo.com" .`
- [ ] Verify no `.env` files are staged
- [ ] Ensure test data is anonymized

## 🏥 Healthcare Compliance (HIPAA)

### 📋 **Patient Data Protection:**
- [ ] No real patient names in code or comments
- [ ] No actual medical information in test data
- [ ] No real phone numbers or addresses
- [ ] No social security numbers anywhere
- [ ] Use placeholder data only: "John Doe", "test@example.com"

### 🔐 **Access Control:**
- [ ] Supabase Row Level Security (RLS) enabled
- [ ] Role-based permissions implemented
- [ ] API endpoints protected with authentication
- [ ] Admin functions restricted to admin role only

### 📊 **Audit Requirements:**
- [ ] All data changes logged in audit_log table
- [ ] User actions tracked with timestamps
- [ ] Failed login attempts monitored
- [ ] Data access logged for compliance

## 🌐 Development Best Practices

### 🔑 **Environment Variables:**
```bash
# ✅ GOOD - Using environment variables
const apiKey = process.env.SUPABASE_ANON_KEY;

# ❌ BAD - Hardcoded secrets
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

### 🗄️ **Database Security:**
- [ ] Use parameterized queries (automatic with Supabase)
- [ ] Validate all user inputs
- [ ] Implement rate limiting on API endpoints
- [ ] Use HTTPS in production
- [ ] Regular security updates for dependencies

### 📱 **Frontend Security:**
- [ ] Validate data on both frontend and backend
- [ ] Sanitize user inputs to prevent XSS
- [ ] Use HTTPS for all API calls
- [ ] Implement proper error handling
- [ ] No sensitive data in localStorage

## 🚀 Production Deployment

### 🔧 **Environment Setup:**
- [ ] Separate `.env` files for dev/staging/production
- [ ] Production Supabase project separate from development
- [ ] SSL certificates configured
- [ ] Domain whitelist configured in Supabase
- [ ] CORS properly configured

### 🔄 **CI/CD Security:**
- [ ] Secrets stored in CI/CD environment variables
- [ ] No `.env` files in Docker images
- [ ] Security scanning in build pipeline
- [ ] Dependency vulnerability checking
- [ ] Automated testing for security issues

## 📋 Git Repository Security

### 🧹 **Repository Cleanup:**
If you accidentally committed sensitive data:

```bash
# Remove file from Git history (USE WITH CAUTION)
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch .env' \
--prune-empty --tag-name-filter cat -- --all

# Alternative: Use BFG Repo-Cleaner
bfg --delete-files .env
```

### 🔍 **Security Scanning:**
```bash
# Check for secrets in repository
git secrets --scan
# or use GitHub's secret scanning

# Scan for vulnerabilities
npm audit
npm audit fix
```

## 📞 Emergency Response

### 🚨 **If Secrets Are Exposed:**
1. **Immediately rotate all exposed credentials:**
   - [ ] Generate new Supabase API keys
   - [ ] Update JWT secrets
   - [ ] Change database passwords
   - [ ] Revoke and recreate Twilio tokens

2. **Update all environments:**
   - [ ] Development
   - [ ] Staging  
   - [ ] Production

3. **Audit access logs:**
   - [ ] Check Supabase analytics for unusual activity
   - [ ] Review API usage patterns
   - [ ] Monitor for unauthorized access

### 📧 **Contact Information:**
- Supabase Security: security@supabase.com
- Your team lead: [Add contact info]
- IT Security: [Add contact info]

## ✅ Daily Development Checklist

### 🌅 **Start of Day:**
- [ ] Pull latest changes from main branch
- [ ] Verify `.env` file is not tracked by Git
- [ ] Check for security updates: `npm audit`

### 🌅 **Before Each Commit:**
- [ ] Review all changed files for sensitive data
- [ ] Run security linter if available
- [ ] Verify test data is anonymized
- [ ] Check commit message doesn't contain secrets

### 🌅 **End of Day:**
- [ ] No `.env` files modified in Git
- [ ] All work commits pushed
- [ ] Development database contains no real patient data

## 🎯 Quick Reference

### 🔧 **Generate Secure JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 🔍 **Check for Committed Secrets:**
```bash
# Search for potential API keys
grep -r "sk_" .
grep -r "pk_" .
grep -r "eyJ" .

# Search for hardcoded URLs
grep -r "supabase.co" .
grep -r "localhost:3001" .
```

### 🧼 **Clean Git Status:**
```bash
git status --ignored  # Show ignored files
git clean -fxd        # Remove untracked files (careful!)
```

---

**🎯 Remember: Security is everyone's responsibility in healthcare applications!**

**🏥 Patient data protection is not just good practice—it's legally required under HIPAA.**