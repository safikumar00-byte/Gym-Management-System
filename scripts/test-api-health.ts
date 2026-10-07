async function checkHealth() {
  try {
    console.log('Testing GET http://localhost:3000/api/health:');
    const res1 = await fetch('http://localhost:3000/api/health');
    const data1 = await res1.json();
    console.log('Status:', res1.status, JSON.stringify(data1));

    console.log('\nTesting GET http://localhost:3000/api/health/db:');
    const res2 = await fetch('http://localhost:3000/api/health/db');
    const data2 = await res2.json();
    console.log('Status:', res2.status, JSON.stringify(data2, null, 2));
  } catch (err: any) {
    console.error('Health check failed:', err.message || err);
  }
}

checkHealth();
