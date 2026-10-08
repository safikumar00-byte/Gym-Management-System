import https from 'https';

const PROD_URL = 'https://gym-management-system-umber-nu.vercel.app';

function getUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function verifyDeploymentAssets() {
  console.log('Fetching index.html...');
  const index = await getUrl(`${PROD_URL}/`);
  console.log(`Index status: ${index.status}, length: ${index.body.length}`);

  const jsMatch = index.body.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
  const cssMatch = index.body.match(/\/assets\/index-[A-Za-z0-9_-]+\.css/);

  if (!jsMatch || !cssMatch) {
    console.error('Failed to match asset URLs in index.html');
    return;
  }

  const jsUrl = `${PROD_URL}${jsMatch[0]}`;
  const cssUrl = `${PROD_URL}${cssMatch[0]}`;

  console.log(`Fetching JS bundle: ${jsUrl}`);
  const jsRes = await getUrl(jsUrl);
  console.log(`JS status: ${jsRes.status}, size: ${(jsRes.body.length / 1024).toFixed(1)} KB`);

  console.log(`Fetching CSS bundle: ${cssUrl}`);
  const cssRes = await getUrl(cssUrl);
  console.log(`CSS status: ${cssRes.status}, size: ${(cssRes.body.length / 1024).toFixed(1)} KB`);

  // Assert absence of mock tokens or fake credentials
  const forbiddenPatterns = [
    'admin123',
    'manager123',
    'trainer123',
    'DEFAULT_REGISTERED_ACCOUNTS',
    'gym_manager_registered_accounts_v2',
    'test-token-demo-member',
    'uid-demo-member-alex'
  ];

  console.log('\nChecking production JS bundle for forbidden credentials:');
  let hasLeak = false;
  for (const pattern of forbiddenPatterns) {
    const found = jsRes.body.includes(pattern);
    console.log(` - Pattern "${pattern}": ${found ? '❌ FOUND (LEAK)' : '✅ CLEAN (NOT PRESENT)'}`);
    if (found) hasLeak = true;
  }

  if (!hasLeak) {
    console.log('\n🎉 PRODUCTION BUNDLE IS COMPLETELY CLEAN OF HARDCODED CREDENTIALS & DEMO TOKENS.');
  }
}

verifyDeploymentAssets().catch(console.error);
