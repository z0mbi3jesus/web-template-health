const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
  console.log('🌱 Starting Supabase database seeding...\n');

  try {
    // 1. Create sample users using Supabase Auth
    console.log('👥 Creating sample users...');

    const users = [
      {
        email: 'admin@healthclinic.com',
        password: 'password123',
        first_name: 'Sarah',
        last_name: 'Johnson',
        phone: '555-0101',
        role: 'admin'
      },
      {
        email: 'doctor@example.com',
        password: 'password123',
        first_name: 'Michael',
        last_name: 'Smith',
        phone: '555-0102',
        role: 'staff'
      },
      {
        email: 'therapist@healthclinic.com',
        password: 'password123',
        first_name: 'Emily',
        last_name: 'Davis',
        phone: '555-0103',
        role: 'staff'
      },
      {
        email: 'patient@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-0201',
        role: 'client'
      }
    ];

    const createdUsers = [];

    for (const user of users) {
      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true
        });

        if (authError) {
          if (authError.message.includes('already exists')) {
            console.log(`  ⏭️  User exists: ${user.email}`);
            // Get existing user
            const { data: existingUser } = await supabase
              .from('users')
              .select('*')
              .eq('email', user.email)
              .single();
            if (existingUser) createdUsers.push(existingUser);
          } else {
            throw authError;
          }
        } else {
          // Create user profile in public.users table
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: user.email,
              name: `${user.first_name} ${user.last_name}`,
              role: user.role
            })
            .select()
            .single();

          if (profileError) {
            console.error(`  ❌ Failed to create profile for ${user.email}:`, profileError.message);
          } else {
            createdUsers.push(profileData);
            console.log(`  ✅ Created: ${user.first_name} ${user.last_name} (${user.role})`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Error creating user ${user.email}:`, error.message);
      }
    }

    // 2. Create appointment types
    console.log('\n📋 Creating appointment types...');

    const appointmentTypes = [
      {
        name: 'Mental Health Consultation',
        description: 'Individual therapy session with licensed therapist',
        duration_minutes: 60,
        color: '#3B82F6'
      },
      {
        name: 'Physical Health Checkup',
        description: 'Comprehensive physical examination and health assessment',
        duration_minutes: 45,
        color: '#10B981'
      },
      {
        name: 'Follow-up Appointment',
        description: 'Follow-up visit for ongoing treatment or condition monitoring',
        duration_minutes: 30,
        color: '#8B5CF6'
      },
      {
        name: 'Wellness Consultation',
        description: 'Holistic wellness and lifestyle consultation',
        duration_minutes: 90,
        color: '#F59E0B'
      }
    ];

    const createdTypes = [];

    for (const type of appointmentTypes) {
      const { data: existingType } = await supabase
        .from('appointment_types')
        .select('*')
        .eq('name', type.name)
        .single();

      if (existingType) {
        createdTypes.push(existingType);
        console.log(`  ⏭️  Exists: ${type.name}`);
      } else {
        const { data: newType, error } = await supabase
          .from('appointment_types')
          .insert(type)
          .select()
          .single();

        if (error) {
          console.error(`  ❌ Failed to create ${type.name}:`, error.message);
        } else {
          createdTypes.push(newType);
          console.log(`  ✅ Created: ${type.name}`);
        }
      }
    }

    console.log('\n✅ Database seeding completed successfully!');

    // Print summary
    console.log('\n📊 Seeded Data Summary:');
    console.log(`  👥 Users: ${createdUsers.length}`);
    console.log(`  📋 Appointment Types: ${createdTypes.length}`);
    console.log('\n🔑 Test Credentials (password: password123):');
    console.log('  Admin: admin@healthclinic.com');
    console.log('  Doctor: doctor@example.com');
    console.log('  Therapist: therapist@healthclinic.com');
    console.log('  Patient: patient@example.com');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedDatabase();
