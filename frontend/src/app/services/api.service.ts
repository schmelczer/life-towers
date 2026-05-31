import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TreeDto } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  health(): Promise<{ status: string }> {
    return firstValueFrom(this.http.get<{ status: string }>('api/v1/health'));
  }

  register(token: string): Promise<{ user_id: string }> {
    return firstValueFrom(
      this.http.post<{ user_id: string }>('api/v1/register', { token }),
    );
  }

  getData(token: string): Promise<TreeDto> {
    return firstValueFrom(
      this.http.get<TreeDto>('api/v1/data', { headers: this.authHeaders(token) }),
    );
  }

  async putData(token: string, tree: TreeDto): Promise<void> {
    await firstValueFrom(
      this.http.put('api/v1/data', tree, { headers: this.authHeaders(token) }),
    );
  }

  private authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
