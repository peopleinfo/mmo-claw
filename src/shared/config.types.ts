export interface AppConfig {
  homeDir: string
  telegramBotToken: string
  telegramAllowedUserId: string
  defaultProxy: string
  maxConcurrentActors: number
  theme: 'dark' | 'light'
}

export const DEFAULT_CONFIG: AppConfig = {
  homeDir: '~/.MMO Claw',
  telegramBotToken: '',
  telegramAllowedUserId: '',
  defaultProxy: '',
  maxConcurrentActors: 3,
  theme: 'dark',
}
