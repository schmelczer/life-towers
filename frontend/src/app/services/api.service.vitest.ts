import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import type { DataResponse, TreeDto } from '../models';

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

  it('gets data with a bearer token and returns the revision', async () => {
    const body: DataResponse = { pages: [], revision: 7 };
    const promise = service.getData('token-1');
    const req = http.expectOne('api/v1/data');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    req.flush(body);
    await expect(promise).resolves.toEqual(body);
  });

  it('puts data with a bearer token + If-Match base revision and returns the new revision', async () => {
    const tree: TreeDto = { pages: [] };
    const promise = service.putData('token-1', tree, 4);
    const req = http.expectOne('api/v1/data');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    expect(req.request.headers.get('If-Match')).toBe('4');
    expect(req.request.body).toBe(tree);
    req.flush({ revision: 5 });
    await expect(promise).resolves.toBe(5);
  });
});
