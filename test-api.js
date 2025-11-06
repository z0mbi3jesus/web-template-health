const axios = require('axios');

async function testAPI() {
  try {
    console.log('🔐 Testing login...');
    const login = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@healthclinic.com',
      password: 'password123'
    });
    
    console.log('✅ Login successful');
    const token = login.data.token;
    
    console.log('📋 Testing appointment types...');
    const types = await axios.get('http://localhost:3001/api/timeslots/appointment-types', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Found ${types.data.length} appointment types:`);
    types.data.forEach(type => console.log(`  • ${type.name} (${type.duration_minutes} min)`));
    
    console.log('\n👥 Testing staff endpoint...');
    const staff = await axios.get('http://localhost:3001/api/timeslots/staff', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Found ${staff.data.length} staff members:`);
    staff.data.forEach(member => console.log(`  • ${member.first_name} ${member.last_name} - ${member.department || 'N/A'}`));
    
    console.log('\n🎉 All API endpoints working correctly!');
    console.log('\n📱 Admin panel is ready at: http://localhost:3000');
    console.log('🔑 Use admin@healthclinic.com / password123 to login');
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data?.message || error.message);
  }
}

testAPI();