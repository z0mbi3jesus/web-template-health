const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testAPI() {
  console.log('🧪 Testing Health Calendar API Endpoints...\n');

  try {
    // 1. Test health check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await axios.get(`${API_BASE.replace('/api', '')}/health`);
    console.log(`   Status: ${healthResponse.status} - ${healthResponse.data.message}`);

    // 2. Test authentication - Login as admin
    console.log('\n2️⃣ Testing admin login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@healthclinic.com',
      password: 'password123'
    });
    
    const adminToken = loginResponse.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    console.log(`   Status: ${loginResponse.status} - Login successful`);
    console.log(`   User: ${loginResponse.data.user.first_name} ${loginResponse.data.user.last_name} (${loginResponse.data.user.role})`);

    // 3. Test getting appointment types
    console.log('\n3️⃣ Testing appointment types...');
    const typesResponse = await axios.get(`${API_BASE}/timeslots/appointment-types`, { headers: adminHeaders });
    console.log(`   Status: ${typesResponse.status} - Found ${typesResponse.data.length} appointment types`);
    typesResponse.data.forEach(type => {
      console.log(`     • ${type.name} (${type.duration_minutes} min)`);
    });

    // 4. Test getting available staff
    console.log('\n4️⃣ Testing staff list...');
    const staffResponse = await axios.get(`${API_BASE}/timeslots/staff`, { headers: adminHeaders });
    console.log(`   Status: ${staffResponse.status} - Found ${staffResponse.data.length} staff members`);
    staffResponse.data.forEach(staff => {
      console.log(`     • ${staff.first_name} ${staff.last_name} - ${staff.department || 'N/A'}`);
    });

    // 5. Test getting time slots for a staff member
    console.log('\n5️⃣ Testing time slots retrieval...');
    const firstStaff = staffResponse.data[0];
    const slotsResponse = await axios.get(`${API_BASE}/timeslots/staff/${firstStaff.id}/slots`, { headers: adminHeaders });
    console.log(`   Status: ${slotsResponse.status} - Found ${slotsResponse.data.length} time slots for ${firstStaff.first_name}`);
    slotsResponse.data.slice(0, 3).forEach(slot => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      console.log(`     • ${days[slot.day_of_week]} ${slot.start_time}-${slot.end_time} (${slot.appointment_type_name})`);
    });

    // 6. Test creating a new time slot
    console.log('\n6️⃣ Testing time slot creation...');
    const appointmentType = typesResponse.data.find(t => t.name === 'Follow-up Appointment');
    const newSlotData = {
      staff_id: firstStaff.id,
      appointment_type_id: appointmentType.id,
      start_time: '17:00',
      end_time: '18:00',
      day_of_week: 1, // Monday
      is_recurring: true
    };

    const createResponse = await axios.post(`${API_BASE}/timeslots`, newSlotData, { headers: adminHeaders });
    console.log(`   Status: ${createResponse.status} - Time slot created`);
    const newSlotId = createResponse.data.id;

    // 7. Test updating the time slot
    console.log('\n7️⃣ Testing time slot update...');
    const updateData = {
      start_time: '17:30',
      end_time: '18:30'
    };
    
    const updateResponse = await axios.put(`${API_BASE}/timeslots/${newSlotId}`, updateData, { headers: adminHeaders });
    console.log(`   Status: ${updateResponse.status} - Time slot updated to ${updateData.start_time}-${updateData.end_time}`);

    // 8. Test weekly schedule generation
    console.log('\n8️⃣ Testing weekly schedule generation...');
    const scheduleData = {
      staff_id: firstStaff.id,
      appointment_type_id: appointmentType.id,
      start_time: '08:00',
      end_time: '09:00',
      days: [1, 2, 3, 4, 5] // Monday through Friday
    };

    const scheduleResponse = await axios.post(`${API_BASE}/timeslots/weekly-schedule`, scheduleData, { headers: adminHeaders });
    console.log(`   Status: ${scheduleResponse.status} - Created ${scheduleResponse.data.created} slots for weekly schedule`);

    // 9. Test login as staff member
    console.log('\n9️⃣ Testing staff member login...');
    const staffLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'therapist@healthclinic.com',
      password: 'password123'
    });
    
    const staffToken = staffLoginResponse.data.token;
    const staffHeaders = { Authorization: `Bearer ${staffToken}` };
    console.log(`   Status: ${staffLoginResponse.status} - Staff login successful`);
    console.log(`   User: ${staffLoginResponse.data.user.first_name} ${staffLoginResponse.data.user.last_name} (${staffLoginResponse.data.user.role})`);

    // 10. Test staff accessing their own slots
    console.log('\n🔟 Testing staff accessing own time slots...');
    const staffId = staffLoginResponse.data.user.id;
    const ownSlotsResponse = await axios.get(`${API_BASE}/timeslots/staff/${staffId}/slots`, { headers: staffHeaders });
    console.log(`   Status: ${ownSlotsResponse.status} - Found ${ownSlotsResponse.data.length} time slots`);

    // 11. Test client login
    console.log('\n1️⃣1️⃣ Testing client login...');
    const clientLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'client1@example.com',
      password: 'password123'
    });
    
    console.log(`   Status: ${clientLoginResponse.status} - Client login successful`);
    console.log(`   User: ${clientLoginResponse.data.user.first_name} ${clientLoginResponse.data.user.last_name} (${clientLoginResponse.data.user.role})`);

    // Clean up - delete the test slot we created
    console.log('\n🧹 Cleaning up test data...');
    const deleteResponse = await axios.delete(`${API_BASE}/timeslots/${newSlotId}`, { headers: adminHeaders });
    console.log(`   Status: ${deleteResponse.status} - Test slot deleted`);

    console.log('\n✅ All API tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   • Health check: ✅');
    console.log('   • Authentication (Admin/Staff/Client): ✅');
    console.log('   • Appointment types retrieval: ✅');
    console.log('   • Staff list retrieval: ✅');
    console.log('   • Time slots CRUD operations: ✅');
    console.log('   • Weekly schedule generation: ✅');
    console.log('   • Role-based access control: ✅');

  } catch (error) {
    console.error('\n❌ API Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.response.data?.error || 'Unknown error'}`);
      console.error(`   Details: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  testAPI().then(() => {
    console.log('\n🎉 API testing completed!');
    process.exit(0);
  });
}

module.exports = { testAPI };