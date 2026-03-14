
// reproduce_issues.js
// Run with: node reproduce_issues.js

const BASE_URL = 'http://localhost:4000';

async function request(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
        method,
        headers,
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(`${BASE_URL}${path}`, options);
        const contentType = res.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            data = await res.text();
        }
        return { status: res.status, data };
    } catch (e) {
        return { status: 0, error: e.message };
    }
}

async function run() {
    console.log('🚀 Starting Reproduction Script...');

    const timestamp = Date.now();
    const techEmail = `tech_${timestamp}@test.com`;
    const adminEmail = `admin_${timestamp}@test.com`;
    const password = 'Password123!';

    // 1. Register Technicien
    console.log(`\nTesting Register Technicien (${techEmail})...`);
    let res = await request('POST', '/auth/register', {
        email: techEmail,
        password,
        displayName: 'Tech User',
        role: 'technicien'
    });
    console.log(`Status: ${res.status} (Expected 201)`);
    if (res.status !== 201) console.error('FAILED: Register Technicien');

    // 2. Login Technicien (Unapproved)
    console.log(`\nTesting Login Technicien (Unapproved)...`);
    res = await request('POST', '/auth/login', {
        email: techEmail,
        password
    });
    console.log(`Status: ${res.status} (Expected 403)`);
    console.log('Response:', JSON.stringify(res.data));
    if (res.status !== 403) console.error('FAILED: Login should be forbidden');

    // 3. Register Admin
    console.log(`\nTesting Register Admin (${adminEmail})...`);
    res = await request('POST', '/auth/register', {
        email: adminEmail,
        password,
        displayName: 'Admin User',
        role: 'admin'
    });
    console.log(`Status: ${res.status} (Expected 201)`);

    // 4. Login Admin
    console.log(`\nTesting Login Admin...`);
    res = await request('POST', '/auth/login', {
        email: adminEmail,
        password
    });
    console.log(`Status: ${res.status} (Expected 200)`);
    const adminToken = res.data?.token;

    if (adminToken) {
        // 5. Get Users (Admin)
        console.log(`\nTesting Admin Get Users...`);
        res = await request('GET', '/admin/users', null, adminToken);
        console.log(`Status: ${res.status} (Expected 200)`);
        const techUser = res.data.find(u => u.email === techEmail);

        if (techUser) {
            console.log(`Found Technician User ID: ${techUser._id}`);

            // 6. Approve Technicien
            console.log(`\nTesting Approve Technicien...`);
            res = await request('PUT', `/admin/users/${techUser._id}/approve`, { approved: true }, adminToken);
            console.log(`Status: ${res.status} (Expected 200)`);

            // 7. Login Technicien (Approved)
            console.log(`\nTesting Login Technicien (Approved)...`);
            res = await request('POST', '/auth/login', {
                email: techEmail,
                password
            });
            console.log(`Status: ${res.status} (Expected 200)`);
            const techToken = res.data?.token;
            if (techToken) {
                console.log('Login Successful!');
            } else {
                console.error('FAILED: Login should succeed after approval');
            }
        } else {
            console.error('FAILED: Could not find technician in user list');
        }
    } else {
        console.error('FAILED: Admin login failed');
    }

    // 8. Verify Email (Documented but Missing)
    console.log(`\nTesting Verify Email Endpoint (Documented in TESTS_COMPLETS.md)...`);
    // Trying with a fake token as we can't get one easily without the feature
    res = await request('GET', '/auth/verify?token=fake_token');
    console.log(`Status: ${res.status} (Expected 200 based on docs, but 404 based on code)`);
    if (res.status === 404) {
        console.log('CONFIRMED: /auth/verify endpoint is MISSING.');
    }

    // 9. Resend Verification (Documented but Missing)
    console.log(`\nTesting Resend Verification Endpoint...`);
    res = await request('POST', '/auth/resend-verification', { email: techEmail });
    console.log(`Status: ${res.status} (Expected 200 based on docs, but 404 based on code)`);
    if (res.status === 404) {
        console.log('CONFIRMED: /auth/resend-verification endpoint is MISSING.');
    }

    console.log('\nDone.');
}

run();
