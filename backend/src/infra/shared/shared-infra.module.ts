import { Global, Module } from "@nestjs/common";
import { TranscriberPort } from "./transcriber/transcriber.port";
import { TranscriberService } from "./transcriber/transcriber.service";
import { PhoneMatcherService } from "./phone-matcher/phone-matcher.service";
import { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";
import { GoogleDriveService } from "./google-drive/google-drive.service";

@Global()
@Module({
  providers: [
    { provide: TranscriberPort, useClass: TranscriberService },
    PhoneMatcherService,
    { provide: GoogleDrivePort, useClass: GoogleDriveService },
  ],
  exports: [TranscriberPort, PhoneMatcherService, GoogleDrivePort],
})
export class SharedInfraModule {}
