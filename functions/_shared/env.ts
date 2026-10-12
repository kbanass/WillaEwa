export interface Env {
  ADMIN_PASSWORD_HASH: string;
  JWT_SECRET: string;
  SANITY_PROJECT_ID: string;
  SANITY_DATASET: string;
  SANITY_API_TOKEN: string;
  RESEND_API_KEY: string;
  MAIL_FROM: string;
  OWNER_EMAIL: string;
  DOMAIN_NAME: string;
  CF_PAGES_DEPLOY_HOOK: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  REBUILD_SECRET?: string;
  RATE_LIMIT_KV?: KVNamespace;
}
