import Joi from 'joi';

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().required(),
  DB_POOL_MAX: Joi.number().integer().min(1).max(50).default(10),
  DB_SSL: Joi.string().valid('require', 'disable').default('require'),
  JWT_SECRET: Joi.string().min(32).required(),
  ACCESS_TOKEN_TTL_S: Joi.number().integer().min(60).default(900),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).default(30),
  DEV_PICKER_PASSWORD: Joi.string().min(10).max(128),
  MAIL_MODE: Joi.string().valid('console').default('console'),
  APP_PUBLIC_URL: Joi.string().uri().default('http://localhost:3000'),
  DEV_AUTH_BYPASS: Joi.boolean().truthy('true').falsy('false').default(false),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(300),
  THROTTLE_DISABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  MAX_BBOX_KM_DETAIL: Joi.number().positive().default(50),
  MAX_BBOX_KM_GROUPED: Joi.number().positive().default(150),
  MAX_BBOX_KM_SNAPSHOT: Joi.number().positive().default(60),
  MIN_REPORTERS_FOR_AVERAGE: Joi.number().integer().min(1).default(3),
}).unknown(true);

interface ValidatedEnvironment extends Record<string, unknown> {
  NODE_ENV: 'development' | 'test' | 'production';
  DEV_AUTH_BYPASS: boolean;
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): ValidatedEnvironment {
  const validation = schema.validate(environment, {
    abortEarly: false,
    convert: true,
  }) as { error?: Joi.ValidationError; value: ValidatedEnvironment };
  const error = validation.error;
  const value = validation.value;
  if (error) {
    throw new Error(`Invalid environment configuration: ${error.message}`);
  }
  if (value.NODE_ENV === 'production' && value.DEV_AUTH_BYPASS === true) {
    throw new Error('DEV_AUTH_BYPASS must be disabled in production.');
  }
  return value;
}
