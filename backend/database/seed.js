const { query, getClient } = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    const client = await getClient();
    await client.query('BEGIN');

    // 1. Create appointment types
    console.log('📋 Creating appointment types...');
    
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
      },
      {
        name: 'Crisis Intervention',
        description: 'Emergency mental health crisis support session',
        duration_minutes: 120,
        color: '#EF4444'
      }
    ];

    const createdAppointmentTypes = [];
    for (const type of appointmentTypes) {
      // Check if appointment type already exists
      const existing = await client.query(
        'SELECT * FROM appointment_types WHERE name = $1',
        [type.name]
      );

      if (existing.rows.length > 0) {
        createdAppointmentTypes.push(existing.rows[0]);
        console.log(`  ⏭️  Exists: ${type.name}`);
      } else {
        const result = await client.query(
          `INSERT INTO appointment_types (name, description, duration_minutes, color) 
           VALUES ($1, $2, $3, $4) 
           RETURNING *`,
          [type.name, type.description, type.duration_minutes, type.color]
        );
        
        createdAppointmentTypes.push(result.rows[0]);
        console.log(`  ✅ Created: ${type.name}`);
      }
    }

    // 2. Create sample users (admin, staff, clients)
    console.log('👥 Creating sample users...');

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const defaultPassword = await bcrypt.hash('password123', saltRounds);

    const users = [
      {
        email: 'admin@healthclinic.com',
        password_hash: defaultPassword,
        first_name: 'Sarah',
        last_name: 'Johnson',
        phone: '555-0101',
        role: 'admin'
      },
      {
        email: 'dr.smith@healthclinic.com',
        password_hash: defaultPassword,
        first_name: 'Michael',
        last_name: 'Smith',
        phone: '555-0102',
        role: 'staff'
      },
      {
        email: 'therapist@healthclinic.com',
        password_hash: defaultPassword,
        first_name: 'Emily',
        last_name: 'Davis',
        phone: '555-0103',
        role: 'staff'
      },
      {
        email: 'client1@example.com',
        password_hash: defaultPassword,
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-0201',
        role: 'client'
      },
      {
        email: 'client2@example.com',
        password_hash: defaultPassword,
        first_name: 'Jane',
        last_name: 'Wilson',
        phone: '555-0202',
        role: 'client'
      }
    ];

    const createdUsers = [];
    for (const user of users) {
      // Check if user already exists
      const existing = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [user.email]
      );

      if (existing.rows.length > 0) {
        createdUsers.push(existing.rows[0]);
        console.log(`  ⏭️  Exists: ${user.first_name} ${user.last_name} (${user.role})`);
      } else {
        const result = await client.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, phone, role) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING *`,
          [user.email, user.password_hash, user.first_name, user.last_name, user.phone, user.role]
        );
        
        createdUsers.push(result.rows[0]);
        console.log(`  ✅ Created: ${user.first_name} ${user.last_name} (${user.role})`);
      }
    }

    // 3. Create profiles for users
    console.log('👤 Creating user profiles...');

    for (const user of createdUsers) {
      if (user.role === 'client') {
        // Check if client profile already exists
        const existingClient = await client.query(
          'SELECT user_id FROM client_profiles WHERE user_id = $1',
          [user.id]
        );

        if (existingClient.rows.length === 0) {
          await client.query(
            `INSERT INTO client_profiles (user_id, preferred_appointment_time, insurance_provider) 
             VALUES ($1, $2, $3)`,
            [user.id, 'morning', 'Blue Cross Blue Shield']
          );
          console.log(`  ✅ Created client profile for: ${user.first_name} ${user.last_name}`);
        } else {
          console.log(`  ⏭️  Client profile exists for: ${user.first_name} ${user.last_name}`);
        }
      } else if (user.role === 'staff' || user.role === 'admin') {
        // Check if staff profile already exists
        const existingStaff = await client.query(
          'SELECT user_id FROM staff_profiles WHERE user_id = $1',
          [user.id]
        );

        if (existingStaff.rows.length === 0) {
          const department = user.email.includes('therapist') ? 'Mental Health' : 'General Medicine';
          const specialization = user.email.includes('therapist') ? 'Clinical Psychology' : 'Family Medicine';
          const isAdmin = user.role === 'admin';
          
          await client.query(
            `INSERT INTO staff_profiles (user_id, department, specialization, is_admin, employee_id) 
             VALUES ($1, $2, $3, $4, $5)`,
            [user.id, department, specialization, isAdmin, `EMP${user.id.substring(0, 8).toUpperCase()}`]
          );
          console.log(`  ✅ Created staff profile for: ${user.first_name} ${user.last_name}`);
        } else {
          console.log(`  ⏭️  Staff profile exists for: ${user.first_name} ${user.last_name}`);
        }
      }
    }

    // 4. Create sample time slots
    console.log('🕐 Creating sample time slots...');

    const staffUsers = createdUsers.filter(u => u.role === 'staff' || u.role === 'admin');
    const mentalHealthType = createdAppointmentTypes.find(t => t.name === 'Mental Health Consultation');
    const physicalHealthType = createdAppointmentTypes.find(t => t.name === 'Physical Health Checkup');
    const followUpType = createdAppointmentTypes.find(t => t.name === 'Follow-up Appointment');

    for (const staff of staffUsers) {
      const appointmentType = staff.email.includes('therapist') ? mentalHealthType : physicalHealthType;
      
      // Create weekly schedule (Monday-Friday, 9 AM - 5 PM)
      for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
        // Morning slots
        // Check if morning slot already exists
        const morningExists = await client.query(
          `SELECT id FROM available_slots 
           WHERE staff_id = $1 AND appointment_type_id = $2 AND start_time = $3 AND day_of_week = $4`,
          [staff.id, appointmentType.id, '09:00', dayOfWeek]
        );

        if (morningExists.rows.length === 0) {
          await client.query(
            `INSERT INTO available_slots (staff_id, appointment_type_id, start_time, end_time, day_of_week, is_recurring) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [staff.id, appointmentType.id, '09:00', '12:00', dayOfWeek, true]
          );
        }

        // Check if afternoon slot already exists
        const afternoonExists = await client.query(
          `SELECT id FROM available_slots 
           WHERE staff_id = $1 AND appointment_type_id = $2 AND start_time = $3 AND day_of_week = $4`,
          [staff.id, appointmentType.id, '13:00', dayOfWeek]
        );

        if (afternoonExists.rows.length === 0) {
          await client.query(
            `INSERT INTO available_slots (staff_id, appointment_type_id, start_time, end_time, day_of_week, is_recurring) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [staff.id, appointmentType.id, '13:00', '17:00', dayOfWeek, true]
          );
        }

        // Check if follow-up slot already exists
        const followupExists = await client.query(
          `SELECT id FROM available_slots 
           WHERE staff_id = $1 AND appointment_type_id = $2 AND start_time = $3 AND day_of_week = $4`,
          [staff.id, followUpType.id, '08:00', dayOfWeek]
        );

        if (followupExists.rows.length === 0) {
          await client.query(
            `INSERT INTO available_slots (staff_id, appointment_type_id, start_time, end_time, day_of_week, is_recurring) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [staff.id, followUpType.id, '08:00', '09:00', dayOfWeek, true]
          );
        }
      }

      console.log(`  ✅ Created schedule for: ${staff.first_name} ${staff.last_name}`);
    }

    await client.query('COMMIT');
    
    console.log('✅ Database seeding completed successfully!');
    
    // Print summary
    console.log('\n📊 Seeded Data Summary:');
    console.log(`  👥 Users: ${createdUsers.length}`);
    console.log(`  📋 Appointment Types: ${createdAppointmentTypes.length}`);
    console.log(`  🕐 Staff Members with Schedules: ${staffUsers.length}`);
    console.log('\n🔑 Test Credentials (password: password123):');
    console.log('  Admin: admin@healthclinic.com');
    console.log('  Staff: dr.smith@healthclinic.com');
    console.log('  Therapist: therapist@healthclinic.com');
    console.log('  Client: client1@example.com');

    client.release();
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };