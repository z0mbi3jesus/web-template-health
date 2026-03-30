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
        // First check if user profile exists
        const { data: existingUserList, error: checkError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .limit(1);

        const existingUser = existingUserList && existingUserList.length > 0 ? existingUserList[0] : null;

        if (existingUser) {
          console.log(`  ⏭️  User exists: ${user.email}`);
          createdUsers.push(existingUser);
        } else {
          // Create auth user
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true
          });

          if (authError) {
            console.error(`  ⚠️  Auth error for ${user.email}:`, authError.message);
            // Try to find existing user anyway
            const { data: fallbackUserList, error: fallbackError } = await supabase
              .from('users')
              .select('*')
              .eq('email', user.email)
              .limit(1);
            const fallbackUser = fallbackUserList && fallbackUserList.length > 0 ? fallbackUserList[0] : null;
            if (fallbackUser) {
              createdUsers.push(fallbackUser);
              console.log(`  ✅ Found existing user: ${user.email}`);
            } else if (fallbackError) {
              console.error(`  ❌ Could not find user: ${fallbackError.message}`);
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
        }
      } catch (error) {
        console.error(`  ❌ Error processing user ${user.email}:`, error.message);
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

    // 3. Create time slots for staff
    console.log('\n⏰ Creating time slots for staff...');

    // Get all staff members from the database
    const { data: allStaff, error: staffError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'staff');

    if (staffError) {
      console.error('  ❌ Error fetching staff:', staffError.message);
    } else if (allStaff && allStaff.length > 0) {
      console.log(`  Found ${allStaff.length} staff members`);
      
      if (createdTypes.length > 0) {
        const timeSlots = [];
        
        // Create morning, afternoon, and evening slots for each staff member on weekdays
        for (const staff of allStaff) {
          for (const type of createdTypes) {
            // Morning slot
            timeSlots.push({
              staff_id: staff.id,
              appointment_type_id: type.id,
              start_time: '09:00',
              end_time: '12:00',
              day_of_week: 1, // Monday
              is_recurring: true,
              is_active: true
            });

            // Afternoon slot
            timeSlots.push({
              staff_id: staff.id,
              appointment_type_id: type.id,
              start_time: '13:00',
              end_time: '17:00',
              day_of_week: 2, // Tuesday
              is_recurring: true,
              is_active: true
            });

            // Morning slot on Wednesday
            timeSlots.push({
              staff_id: staff.id,
              appointment_type_id: type.id,
              start_time: '10:00',
              end_time: '12:30',
              day_of_week: 3, // Wednesday
              is_recurring: true,
              is_active: true
            });

            // Afternoon slot on Thursday
            timeSlots.push({
              staff_id: staff.id,
              appointment_type_id: type.id,
              start_time: '14:00',
              end_time: '17:00',
              day_of_week: 4, // Thursday
              is_recurring: true,
              is_active: true
            });

            // Morning slot on Friday
            timeSlots.push({
              staff_id: staff.id,
              appointment_type_id: type.id,
              start_time: '09:00',
              end_time: '12:00',
              day_of_week: 5, // Friday
              is_recurring: true,
              is_active: true
            });
          }
        }

        let slotsCreated = 0;
        for (const slot of timeSlots) {
          const { data: existingSlot } = await supabase
            .from('available_slots')
            .select('*')
            .eq('staff_id', slot.staff_id)
            .eq('appointment_type_id', slot.appointment_type_id)
            .eq('day_of_week', slot.day_of_week)
            .eq('start_time', slot.start_time)
            .limit(1);

          if (existingSlot && existingSlot.length > 0) {
            // Slot already exists, skip
          } else {
            const { error: slotError } = await supabase
              .from('available_slots')
              .insert(slot);

            if (!slotError) {
              slotsCreated++;
            }
          }
        }
        console.log(`  ✅ Created/verified ${slotsCreated} time slots`);
      }
    } else {
      console.log('  No staff members found to create time slots for');
    }

    console.log('\n✅ Database seeding completed successfully!');

    // Print summary
    console.log('\n📊 Seeded Data Summary:');
    console.log(`  👥 Users: ${createdUsers.length}`);
    console.log(`  📋 Appointment Types: ${createdTypes.length}`);
    console.log(`  ⏰ Time Slots: Multiple daily slots for each staff member`);
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
