import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private http = inject(HttpClient);
  get<T>(path: string, params?: Record<string, string | string[] | null | undefined>) {
    const query = params
      ? Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== null && value !== undefined),
        ) as Record<string, string | string[]>
      : undefined;
    return this.http.get<T>(`${environment.apiBaseUrl}${path}`, {
      params: query ? new HttpParams({ fromObject: query }) : undefined,
    });
  }
  getBlob(path: string) {
    return this.http.get(`${environment.apiBaseUrl}${path}`, { responseType: 'blob' });
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
  put<T>(path: string, body: unknown) {
    return this.http.put<T>(`${environment.apiBaseUrl}${path}`, body);
  }
  delete<T>(path: string) {
    return this.http.delete<T>(`${environment.apiBaseUrl}${path}`);
  }
}
