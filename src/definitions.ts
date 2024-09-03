export interface SocialLoginPlugin {
  echo(options: { value: string }): Promise<{ value: string }>;
}
