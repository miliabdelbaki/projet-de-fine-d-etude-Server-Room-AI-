
const BASE_URL = 'http://localhost:4000';

async function request(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(`${BASE_URL}${path}`, options);
        // fetch with GET + Body throws in some envs, but let's see if node supports it
        // actually node-fetch might throw "Request with GET/HEAD method cannot have body"
        // If so, Postman allows it, but maybe backend framework (Express) handles it poorly?
        const text = await res.text();
        return { status: res.status, data: text };
    } catch (e) {
        return { status: 0, error: e.message };
    }
}

async function run() {
    console.log('🚀 Debugging GET /rooms WITH BODY ...');

    // 1. Login (using previous credentials if possible, or new)
    // For simplicity, just register new
    const email = (`admin_debug_2_${Date.now()}@test.com`);
    const password = 'Password123!';

    // Register
    await request('POST', '/auth/register', {
        email, password, displayName: 'Debug Admin', role: 'admin'
    });

    // Login
    let res = await request('POST', '/auth/login', { email, password });
    const token = JSON.parse(res.data).token;

    if (!token) {
        console.error('Failed to get token');
        return;
    }

    // 2. GET /rooms with BODY (like user's screenshot)
    console.log(`\nTesting GET /rooms with Payload...`);
    // Note: Node's native fetch might reject GET with body.
    // If it does, we know the user's client (Postman) allows it but maybe server doesn't like it.

    try {
        res = await request('GET', '/rooms', {
            "name": "Salle Test",
            "checklist": "dummy_id"
        }, token);
        console.log(`Status: ${res.status}`);
        console.log('Response:', res.data);
    } catch (err) {
        console.log('Client side error sending GET with body:', err);
    }
}

run();
