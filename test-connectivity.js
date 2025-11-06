// Simple test to verify admin panel connectivity
console.log('🧪 Testing Admin Panel Connectivity...\n');

// Test the health endpoint first
fetch('http://localhost:3001/health')
  .then(response => response.json())
  .then(data => {
    console.log('✅ Backend Health Check:', data.status);
    console.log('📱 Admin Panel URL: http://localhost:3000');
    console.log('🔐 Login Credentials:');
    console.log('   Email: admin@healthclinic.com');
    console.log('   Password: password123');
    console.log('\n🎯 Steps to test:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Login with the admin credentials (pre-filled)');
    console.log('3. Try creating time slots');
    console.log('4. If you get 409 errors, that means slots conflict (which is good!)');
    console.log('5. Use the existing slots list to see what times are already taken');
  })
  .catch(error => {
    console.log('❌ Backend connection failed:', error.message);
    console.log('💡 Make sure the backend server is running on port 3001');
  });