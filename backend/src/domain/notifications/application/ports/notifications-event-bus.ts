import { Injectable } from "@nestjs/common";
import { Subject, Observable } from "rxjs";
import { Notification } from "../../enterprise/entities/notification";

@Injectable()
export class NotificationsEventBus {
  private readonly subject = new Subject<Notification>();
  readonly events$: Observable<Notification> = this.subject.asObservable();

  emit(notification: Notification): void {
    this.subject.next(notification);
  }
}
