import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Contract, ConsolidadoGeral, Medicao } from '../models/contract.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ContractService {
  private base = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  // Contratos
  getAll(status?: string, search?: string): Observable<Contract[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);
    return this.http.get<Contract[]>(`${this.base}/contracts`, { params });
  }

  getById(id: string): Observable<Contract> {
    return this.http.get<Contract>(`${this.base}/contracts/${id}`);
  }

  getConsolidado(): Observable<ConsolidadoGeral> {
    return this.http.get<ConsolidadoGeral>(`${this.base}/contracts/consolidado`);
  }

  create(data: Partial<Contract>): Observable<any> {
    return this.http.post(`${this.base}/contracts`, data);
  }

  update(id: string, data: Partial<Contract>): Observable<any> {
    return this.http.put(`${this.base}/contracts/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}/contracts/${id}`);
  }

  // Medições
  getMedicoes(contractId?: string): Observable<Medicao[]> {
    let params = new HttpParams();
    if (contractId) params = params.set('contract_id', contractId);
    return this.http.get<Medicao[]>(`${this.base}/medicoes`, { params });
  }

  saveMedicao(data: Medicao): Observable<any> {
    return this.http.post(`${this.base}/medicoes`, data);
  }

  deleteMedicao(id: string): Observable<any> {
    return this.http.delete(`${this.base}/medicoes/${id}`);
  }
}
