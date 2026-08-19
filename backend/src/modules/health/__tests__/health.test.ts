import request from 'supertest';
import app from '../../../app';

interface HealthResponse {
  status: string;
  timestamp: string;
}

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('includes a valid ISO 8601 timestamp', async () => {
    const res = await request(app).get('/health');
    const body = res.body as HealthResponse;

    expect(res.status).toBe(200);
    expect(typeof body.timestamp).toBe('string');

    const parsed = new Date(body.timestamp);
    expect(parsed.toISOString()).toBe(body.timestamp);
  });

  it('returns Content-Type application/json', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
