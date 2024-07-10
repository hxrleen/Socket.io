import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class BuzzService {
  public message$: BehaviorSubject<string> = new BehaviorSubject('');
  public users$: BehaviorSubject<{ [key: string]: string }> =
    new BehaviorSubject({});
  public buzzerEvents$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  public room$: BehaviorSubject<string> = new BehaviorSubject('');

  socket = io('http://localhost:3000');

  constructor() {
    this.socket.on('message', (message: string) => {
      this.message$.next(message);
    });

    this.socket.on('users', (users: { [key: string]: string }) => {
      this.users$.next(users);
    });

    this.socket.on('buzzer', (event: any) => {
      const events = this.buzzerEvents$.value;
      this.buzzerEvents$.next([...events, event]);
    });

    this.socket.on('roomCreated', (roomId: string) => {
      this.room$.next(roomId);
      console.log('instatiionnmbdj');
    });
  }

  public sendMessage(message: any) {
    this.socket.emit('message', message);
  }

  public createRoom() {
    this.socket.emit('createRoom');
  }

  public joinRoom(roomId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.socket.emit('joinRoom', roomId, (success: boolean) => {
        if (success) {
          resolve(success);
        } else {
          reject('Failed to join room');
        }
      });
    });
  }

  public pressBuzzer() {
    this.socket.emit('buzzer');
  }

  public setName(name: string) {
    this.socket.emit('setName', name);
  }

  public getNewMessage(): Observable<string> {
    return this.message$.asObservable();
  }

  public getUsers(): Observable<{ [key: string]: string }> {
    return this.users$.asObservable();
  }

  public getBuzzerEvents(): Observable<any[]> {
    return this.buzzerEvents$.asObservable();
  }

  public getRoom(): Observable<string> {
    return this.room$.asObservable();
  }
}
