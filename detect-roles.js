async function detectRoles() {
  const base = 'https://capacity-chairman-reserves-pathology.trycloudflare.com';

  // Login first
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email: "admin@gmail.com", password: "admin@1234" })
  });
  const loginJson = await loginRes.json();
  const token = loginJson?.data?.accessToken;
  console.log('Token:', token ? 'obtained' : 'FAILED');

  // Try fetching roles
  const endpoints = ['/api/roles', '/api/admin/roles', '/api/role'];
  for (const ep of endpoints) {
    const res = await fetch(`${base}${ep}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
    const json = await res.json().catch(() => null);
    console.log(`${ep} (${res.status}):`, JSON.stringify(json, null, 2));
  }
}

detectRoles();
