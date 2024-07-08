import { Component, OnInit } from '@angular/core';
import { BuzzService } from '../buzz.service';

@Component({
  selector: 'app-buzz',
  templateUrl: './buzz.component.html',
  styleUrls: ['./buzz.component.css']
})
export class BuzzComponent implements OnInit {
  newMessage = '';
  messageList: string[] = [];
  users: { key: string; value: string }[] = [];
  buzzerEvents: any[] = [];
  userName = '';

  constructor(private buzzService: BuzzService) {}

  ngOnInit() {
    this.buzzService.getNewMessage().subscribe((message: string) => {
      this.messageList.push(message);
    });

    this.buzzService.getUsers().subscribe((users: { [key: string]: string }) => {
      console.log('Received users:', users); // Debug kro
      this.users = Object.entries(users).map(([key, value]) => ({ key, value }));
    });

    this.buzzService.getBuzzerEvents().subscribe((events: any[]) => {
      this.buzzerEvents = events;
    });
  }

  sendMessage() {
    this.buzzService.sendMessage(this.newMessage);
    this.newMessage = '';
  }

  pressBuzzer() {
    this.buzzService.pressBuzzer();
  }

  setName() {
    if (this.userName.trim()) {
      this.buzzService.setName(this.userName);
    }
  }
}
