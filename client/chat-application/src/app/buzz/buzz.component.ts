import { Component, OnInit } from '@angular/core';
import { BuzzService } from '../buzz.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-buzz',
  templateUrl: './buzz.component.html',
  styleUrls: ['./buzz.component.css'],
})
export class BuzzComponent implements OnInit {
  newMessage = '';
  messageList: string[] = [];
  users: { key: string; value: string }[] = [];
  buzzerEvents: any[] = [];
  userName = '';
  roomId = '';

  constructor(
    private buzzService: BuzzService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const roomId = params['id'];
      if (roomId) {
        this.roomId = roomId;
        this.buzzService
          .joinRoom(this.roomId)
          .then((success) => {
            if (success) {
              console.log(this.roomId);

              console.log('Successfully joined the room', this.roomId);
            } else {
              console.log('Failed to join the room');
            }
          })
          .catch((err) => {
            console.error(err);
          });
      }
    });

    this.buzzService.getNewMessage().subscribe((message: string) => {
      this.messageList.push(message);
    });

    this.buzzService
      .getUsers()
      .subscribe((users: { [key: string]: string }) => {
        console.log('Received users:', users); // Debug kro
        this.users = Object.entries(users).map(([key, value]) => ({
          key,
          value,
        }));
      });

    this.buzzService.getBuzzerEvents().subscribe((events: any[]) => {
      this.buzzerEvents = events;
    });

    this.buzzService.getRoom().subscribe((roomId: string) => {
      this.roomId = roomId;
      if (this.route.snapshot.paramMap.get('roomId') !== roomId) {
        if (roomId) {
          this.router.navigate(['buzz', 'room', roomId]);
        }
      }
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

  createRoom() {
    this.buzzService.createRoom();
  }

  joinRoom() {
    this.buzzService.joinRoom(this.roomId);
    if (this.roomId.trim()) {
      this.buzzService
        .joinRoom(this.roomId)
        .then((success) => {
          if (success) {
            console.log('should navigate');
            console.log(this.roomId);
            this.router.navigate(['buzz', 'room', this.roomId]);
          } else {
            console.log('Failed to join the room');
          }
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }
}
