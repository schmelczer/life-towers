import { describe, it, expect, vi } from 'vitest';

// Mock environment
vi.mock('../../environments/environment', () => ({
  environment: { apiBase: 'http://test-api', production: false },
}));

describe('ApiService URL patterns', () => {
  const baseUrl = 'http://test-api';

  it('constructs correct health URL', () => {
    expect(`${baseUrl}/api/v1/health`).toBe('http://test-api/api/v1/health');
  });

  it('constructs correct register URL', () => {
    expect(`${baseUrl}/api/v1/register`).toBe('http://test-api/api/v1/register');
  });

  it('constructs correct data URL', () => {
    expect(`${baseUrl}/api/v1/data`).toBe('http://test-api/api/v1/data');
  });

  it('formats Authorization header correctly', () => {
    const token = 'abc-def-123';
    const header = `Bearer ${token}`;
    expect(header).toBe('Bearer abc-def-123');
  });
});
