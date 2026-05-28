import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Unique } from '../store/unique';

const API_URI = 'https://store.schmelczer.dev/api/store/';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) {}

  private static getAuthorizationHeader(id: string): HttpHeaders {
    return new HttpHeaders().set('Authorization', `life-towers-v3 ${id}`);
  }

  async track(id: string): Promise<void> {
    await this.http.post(`${API_URI}me`, {}, { headers: ApiService.getAuthorizationHeader(id) }).toPromise();
  }

  async register(id: string): Promise<void> {
    await this.http.post(API_URI, { token: id }).toPromise();
  }

  async getObject(userId: string, objectId: string): Promise<Unique> {
    return await this.http
      .get<Unique>(`${API_URI}me/${objectId}`, { headers: ApiService.getAuthorizationHeader(userId) })
      .toPromise();
  }

  async postObject(userId: string, objectId: string, serializedObject: string): Promise<void> {
    await this.http
      .post(
        `${API_URI}me/${objectId}`,
        { data: serializedObject },
        { headers: ApiService.getAuthorizationHeader(userId) }
      )
      .toPromise();
  }

  async getRootId(userId: string): Promise<string> {
    return await this.http
      // @ts-ignore
      .get<string>(`${API_URI}me/root`, { headers: ApiService.getAuthorizationHeader(userId), responseType: 'text' })
      .toPromise();
  }

  async setRootId(userId: string, rootId: string): Promise<void> {
    await this.http
      .put(`${API_URI}me/root`, { root_id: rootId }, { headers: ApiService.getAuthorizationHeader(userId) })
      .toPromise();
  }
}
