# ✅ Supabase Setup Checklist

## 🚀 Step-by-Step Setup Process

### 1. 🌐 **Create Supabase Project**
- [ ] Go to [supabase.com](https://supabase.com) and sign in
- [ ] Click "New Project"
- [ ] Name: `healthcare-appointments` (or your preferred name)
- [ ] Choose a **strong database password** (save it!)
- [ ] Select region closest to your users
- [ ] Wait 2-3 minutes for project creation

### 2. 🗄️ **Set Up Database Schema**
- [ ] Go to **SQL Editor** in your Supabase dashboard
- [ ] Copy **ALL contents** from `database/schema.sql`
- [ ] Paste and click **"Run"**
- [ ] Verify tables appear in **Table Editor**:
  - [ ] users
  - [ ] appointment_types
  - [ ] available_slots
  - [ ] appointments
  - [ ] notifications
  - [ ] audit_log

### 3. 🔑 **Get API Keys**
- [ ] Go to **Settings > API** in Supabase dashboard
- [ ] Copy these values:
  - [ ] **Project URL**: `https://your-project-id.supabase.co`
  - [ ] **anon public key**: `eyJ...` (starts with eyJ)
  - [ ] **service_role secret key**: `eyJ...` (starts with eyJ)

### 4. ⚙️ **Update Environment Variables**
- [ ] Open your `.env` file
- [ ] Replace placeholder values:
```env
SUPABASE_URL=https://your-actual-project-id.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_key_here
```

### 5. 🧪 **Test Connection**
- [ ] Run: `npm run test-supabase`
- [ ] All tests should pass ✅
- [ ] Fix any issues before proceeding

### 6. 🔐 **Enable Authentication**
- [ ] In Supabase dashboard, go to **Authentication > Settings**
- [ ] Verify **Enable email confirmations** is ON
- [ ] Set **Site URL** to: `http://localhost:8081` (for development)

### 7. 🏃‍♂️ **Start Your Application**
- [ ] Backend: `npm start` (runs on port 3001)
- [ ] Frontend: `python -m http.server 8081` (or `npm run frontend`)
- [ ] Visit: `http://localhost:8081`

### 8. 👤 **Create Your Admin User**
- [ ] **Register** on your website with your email
- [ ] Go to Supabase **Table Editor > users**
- [ ] Find your user record
- [ ] Change `role` from `'client'` to `'admin'`
- [ ] **Sign in** on your website
- [ ] Should redirect to admin panel automatically

## 🔧 **Quick Commands Reference**

```bash
# Test Supabase connection
npm run test-supabase

# Start backend server
npm start

# Start frontend server
npm run frontend

# Security check before committing
npm run security-check
```

## 🚨 **Troubleshooting**

### **Common Issues:**

**❌ "Invalid API key"**
- Double-check your SUPABASE_URL and keys in `.env`
- Make sure no extra spaces or quotes

**❌ "Table doesn't exist"**
- Run the complete SQL schema in Supabase SQL Editor
- Check that all tables appear in Table Editor

**❌ "Row Level Security policy violation"**
- Schema includes RLS policies - this is normal
- Unauthenticated users can only see appointment_types

**❌ "Authentication required"**
- For admin features, you need to sign up and promote to admin role
- Check that your user role is set to 'admin' in the database

## 📞 **Need Help?**

1. **Check the logs**: Look at browser console and terminal output
2. **Verify setup**: Run `npm run test-supabase` again
3. **Review documentation**: `SUPABASE_SETUP.md` has detailed instructions
4. **Security check**: Make sure `.env` is not committed to Git

---

**🎯 Once you complete this checklist, your healthcare appointment system will be fully operational with enterprise-grade security and scalability!**