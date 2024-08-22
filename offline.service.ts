import { Injectable } from '@angular/core';
import { Observable, from, of, forkJoin } from 'rxjs';
import { switchMap, finalize, map } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastService } from '../toast/toast.service';
import { environment } from 'src/environments/environment';
import { StorageService } from '../storage/storage.service';
import { ConnectionStatus, NetworkService } from '../network/network.service';
 
interface StoredRequest {
  url: string,
  type: string,
  data: any,
  time: number,
  id: string,
  headers : HttpHeaders,
}
 
@Injectable({
  providedIn: 'root'
})
export class OfflineManagerService {
 
  constructor(private _storage: StorageService, private http: HttpClient, private toastController: ToastService, private _ntwrk: NetworkService) {}
 
  checkForEvents(): Observable<any> {
    if(this._ntwrk.getCurrentStatus() === ConnectionStatus.Online){
      return from(this._storage.getData(environment.API_REQUEST_STORAGE_KEY))
        .pipe(
          switchMap(storedOperations => {
            let storedObj = JSON.parse(storedOperations.value);
            if (storedObj!== null) {
              return this.sendRequests(storedObj).pipe(
                finalize(() => {
                  this._storage.remove(environment.API_REQUEST_STORAGE_KEY);
                })
              );
            } 
            else {
              console.log('no local events to sync');
              return of(false);
            }
          })
        )
    }
    else {
      console.log("Sem internet")
      return of(false)
    }
  }
 
  storeRequest(url, type, data, headers) {

    let action: StoredRequest = {
      url: url,
      type: type,
      data: data,
      time: new Date().getTime(),
      id: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5),
      headers,
    };
 
    return this._storage.getData(environment.API_REQUEST_STORAGE_KEY).then(storedOperations => {
      let storedObj = JSON.parse(storedOperations.value);
 
      if (storedObj) {
        storedObj.push(action);
      } else {
        storedObj = [action];
      }
      // Save old & new local transactions back to Storage
      return this._storage.setData(environment.API_REQUEST_STORAGE_KEY, JSON.stringify(storedObj));
    });
  }
 
  sendRequests(operations: StoredRequest[]) {
    let obs = [];
 
    for (let op of operations) {
      let options={body:op.data,headers:op.headers}
      console.log(op.headers)
      console.log('Make one request: ', op);
      let oneObs = this.http.request(op.type, op.url,options);
      obs.push(oneObs);
    }
 
    // Send out all local events and return once they are finished
    return forkJoin(obs);
  }

  checkConfigs(){
    if(this._ntwrk.getCurrentStatus() === ConnectionStatus.Online){
      return this.http.get(`${environment.API_URL}/config/all-links`)
        .pipe(map((res)=>{
          for(const[key,link] of Object.entries(res)){
            if(key==="data"){
              for(let element of Object.entries(link)){
                this._storage.setData(element[0],Object.values(element[1])[0])
              }
            }
          }
        }))
    }
    else {
      console.log("Offline, nada a atualizar")
    }
  }
}