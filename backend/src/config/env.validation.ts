import Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGIN: Joi.string().uri().required(),
  AUTH_SESSION_COOKIE_NAME: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .default('magrin_sac_session'),
  AUTH_SESSION_JWT_AUDIENCE: Joi.string().trim().min(1).default('magrin-sac-frontend'),
  AUTH_SESSION_JWT_ISSUER: Joi.string().trim().min(1).default('magrin-sac-api'),
  AUTH_SESSION_JWT_SECRET: Joi.string().min(32).required(),
  AUTH_SESSION_JWT_TTL_SECONDS: Joi.number().integer().min(60).required(),
  DB_DIALECT: Joi.string().valid('mariadb').required(),
  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().required(),
  DB_DATABASE: Joi.string()
    .pattern(/^[a-z0-9_]+$/)
    .required(),
  DB_USERNAME: Joi.string().trim().min(1).required(),
  DB_PASSWORD: Joi.string().allow('').required(),
});
