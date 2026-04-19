export abstract class GoToTokenPort {
  abstract getValidAccessToken(): Promise<string>;
}
