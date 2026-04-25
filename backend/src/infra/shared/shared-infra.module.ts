import { Global, Module } from "@nestjs/common";
import { TranscriberPort } from "./transcriber/transcriber.port";
import { TranscriberService } from "./transcriber/transcriber.service";
import { IPhoneMatcherService, PhoneMatcherService } from "./phone-matcher/phone-matcher.service";
import { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";
import { GoogleDriveService } from "./google-drive/google-drive.service";
import { GoogleDriveDownloadService } from "./google-drive-download/google-drive-download.service";

@Global()
@Module({
  providers: [
    { provide: TranscriberPort, useClass: TranscriberService },
    PhoneMatcherService,
    { provide: IPhoneMatcherService, useExisting: PhoneMatcherService },
    { provide: GoogleDrivePort, useClass: GoogleDriveService },
    GoogleDriveDownloadService,
  ],
  exports: [TranscriberPort, PhoneMatcherService, IPhoneMatcherService, GoogleDrivePort, GoogleDriveDownloadService],
})
export class SharedInfraModule {}
