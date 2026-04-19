import { Global, Module } from "@nestjs/common";
import { TranscriberPort } from "./transcriber/transcriber.port";
import { TranscriberService } from "./transcriber/transcriber.service";
import { PhoneMatcherService } from "./phone-matcher/phone-matcher.service";

@Global()
@Module({
  providers: [
    { provide: TranscriberPort, useClass: TranscriberService },
    PhoneMatcherService,
  ],
  exports: [TranscriberPort, PhoneMatcherService],
})
export class SharedInfraModule {}
