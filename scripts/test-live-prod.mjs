const PROD_URL = 'https://gym-management-system-umber-nu.vercel.app';

async function testLiveDeployment() {
  console.log(`Checking live Vercel deployment at: ${PROD_URL}`);

  try {
    const healthRes = await fetch(`${PROD_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log(`[Health] Status: ${healthRes.status}`, healthData);

    const dbRes = await fetch(`${PROD_URL}/api/health/db`);
    const dbData = await dbRes.json();
    console.log(`[DB Health] Status: ${dbRes.status}`, dbData);

    const homeRes = await fetch(`${PROD_URL}/`);
    const homeHtml = await homeRes.text();
    console.log(`[Homepage HTML] Status: ${homeRes.status}, Length: ${homeHtml.length}`);
  } catch (err) {
    console.error('Error contacting live deployment:', err);
  }
}

testLiveDeployment();
