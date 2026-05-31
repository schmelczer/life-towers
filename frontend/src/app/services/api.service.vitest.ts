import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import type { TreeDto } from '../models';

describe('ApiService', () => {
  let service: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ApiService],
    });
    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('gets data with a bearer token', async () => {
    const tree: TreeDto = { pages: [] };
    const promise = service.getData('token-1');
    const req = http.expectOne('/api/v1/data');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    req.flush(tree);
    await expect(promise).resolves.toEqual(tree);
  });

  it('puts data with a bearer token', async () => {
    const tree: TreeDto = { pages: [] };
    const promise = service.putData('token-1', tree);
    const req = http.expectOne('/api/v1/data');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    expect(req.request.body).toBe(tree);
    req.flush(null);
    await expect(promise).resolves.toBeUndefined();
  });
});
