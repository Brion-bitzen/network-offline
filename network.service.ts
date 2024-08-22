import { Injectable } from '@angular/core';
import { Network } from '@ionic-native/network/ngx';
import { Platform } from '@ionic/angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { AlertsService } from '../alerts/alerts.service';


export enum ConnectionStatus {
  Online,
  Offline
}
@Injectable({
  providedIn: 'root',
})
export class NetworkService {

  private status: BehaviorSubject<ConnectionStatus> = new BehaviorSubject(ConnectionStatus.Offline);

  constructor(private network: Network, private alertCtrl: AlertsService, private pltform : Platform) {
    this.pltform.ready().then(()=>{      
      if (this.network.type === 'none')
        this.status.next(ConnectionStatus.Offline);
      else
        this.status.next(ConnectionStatus.Online);

      this.startNetworkListening();
    })
  }

  startNetworkListening() {
    let onChangeListener = this.network.onChange().subscribe(() => {
      setTimeout(() => {
        if (this.network.type === 'none'){
          this.status.next(ConnectionStatus.Offline);
        }
        else {
          this.status.next(ConnectionStatus.Online);
        }
      }, 3000);
    });
  }

  getCurrentStatus(){
    return this.status.getValue();
  }
}