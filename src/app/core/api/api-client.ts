import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private http = inject(HttpClient);
  get<T>(path: string, params?: Record<string, string | string[]>) {
    return this.http.get<T>(`${environment.apiBaseUrl}${path}`, {
      params: params ? new HttpParams({ fromObject: params }) : undefined,
    });
  }
  post<T>(path: string, body: unknown) {
    return this.http.post<T>(`${environment.apiBaseUrl}${path}`, body);
  }
  postWithHeaders<T>(path: string, body: unknown, headers: Record<string, string>) {
    return this.http.post<T>(`${environment.apiBaseUrl}${path}`, body, {
      headers: new HttpHeaders(headers),
    });
  }
  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(`${environment.apiBaseUrl}${path}`, body);
  }
  delete<T>(path: string) {
    return this.http.delete<T>(`${environment.apiBaseUrl}${path}`);
  }
}
