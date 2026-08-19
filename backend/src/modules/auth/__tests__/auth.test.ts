/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import request from 'supertest';
import app from '../../../app';
import { query, pool } from '../../../config/db';
import { hashPassword } from '../../../utils/crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

describe('Auth API and Middleware', () => {
  const testEmail = 'hr_test@acme.com';
  const testPassword = 'securepassword123';
  let testUserId = '';

  beforeEach(async () => {
    // Clear relevant tables
    await query('TRUNCATE refresh_tokens, users CASCADE');

    // Create a test user
    testUserId = 'c28c8efd-bb7d-41a6-a36c-9c9891001a1c';
    const passwordHash = hashPassword(testPassword);
    await query(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
      [testUserId, testEmail, passwordHash, 'Test HR Manager', 'hr_manager']
    );
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 200 with access token and user info on successful login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user).toEqual({
        id: testUserId,
        email: testEmail,
        name: 'Test HR Manager',
        role: 'hr_manager',
      });

      // Verify cookie
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/refreshToken=/);
      expect(cookies[0]).toMatch(/HttpOnly/);
      expect(cookies[0]).toMatch(/SameSite=Strict/);
    });

    it('returns 401 for an invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@acme.com', password: testPassword });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
      expect(res.body.details).toBe('Invalid email or password');
    });

    it('returns 401 for an invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
      expect(res.body.details).toBe('Invalid email or password');
    });

    it('returns 400 for missing credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.email).toBeDefined();
      expect(res.body.details.password).toBeDefined();
    });
  });

  describe('GET /api/v1/test-protected', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/test-protected');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
      expect(res.body.details).toMatch(/token missing/);
    });

    it('returns 401 for invalid access token', async () => {
      const res = await request(app)
        .get('/api/v1/test-protected')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
      expect(res.body.details).toMatch(/Invalid or expired/);
    });

    it('returns 200 and matches user payload for valid access token', async () => {
      // Login to get token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/test-protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user).toEqual({
        id: testUserId,
        role: 'hr_manager',
      });
    });

    it('returns 401 for expired access token', async () => {
      // Create expired token manually
      const expiredToken = jwt.sign(
        { userId: testUserId, role: 'hr_manager' },
        env.JWT_SECRET,
        { expiresIn: '-10s' }
      );

      const res = await request(app)
        .get('/api/v1/test-protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
      expect(res.body.details).toMatch(/Invalid or expired/);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('successfully refreshes token and rotates cookie with valid refresh token', async () => {
      // Login first
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword });

      const setCookie = loginRes.headers['set-cookie'] as unknown as string[];
      const originalCookie = setCookie[0];
      const originalToken = originalCookie.split(';')[0].split('=')[1];

      // Wait 10ms to ensure timestamps are different
      await new Promise((resolve) => setTimeout(resolve, 10));

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${originalToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();

      const newSetCookie = res.headers['set-cookie'] as unknown as string[];
      expect(newSetCookie).toBeDefined();
      const newCookie = newSetCookie[0];
      const newToken = newCookie.split(';')[0].split('=')[1];

      // Verify refresh token rotated (different token values)
      expect(newToken).not.toBe(originalToken);

      // Verify old token is deleted and cannot be reused
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${originalToken}`]);
      expect(reuseRes.status).toBe(401);
    });

    it('returns 401 when refresh token is missing', async () => {
      const res = await request(app).post('/api/v1/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
      expect(res.body.details).toMatch(/cookie is missing/);
    });

    it('returns 401 for an invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken=invalid_token']);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
      expect(res.body.details).toMatch(/Invalid or expired/);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('successfully logs out and clears cookie', async () => {
      // Login first
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword });

      const setCookie = loginRes.headers['set-cookie'] as unknown as string[];
      const originalCookie = setCookie[0];
      const originalToken = originalCookie.split(';')[0].split('=')[1];

      // Logout
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [`refreshToken=${originalToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);

      const logoutSetCookie = res.headers['set-cookie'] as unknown as string[];
      expect(logoutSetCookie[0]).toMatch(/refreshToken=;/); // Cookie cleared

      // Verify token is deleted in DB and cannot be used to refresh
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${originalToken}`]);
      expect(refreshRes.status).toBe(401);
    });
  });

  afterAll(async () => {
    await pool.end();
  });
});
