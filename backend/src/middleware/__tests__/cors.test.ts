import request from 'supertest';
import app from '../../app';

describe('CORS Middleware Integration Tests', () => {
  it('allows requests from http://localhost:5173 and echoes the origin with credentials config', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not send CORS headers for unauthorized origins', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://malicious.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('handles OPTIONS preflight requests correctly with CORS headers', async () => {
    const res = await request(app)
      .options('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

    expect(res.status).toBe(204); // Standard CORS options preflight status
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-headers'].toLowerCase()).toContain('content-type');
  });
});
