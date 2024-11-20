import { createLogger, format, transports } from 'winston';

const PATH = 'logs';

const { combine, timestamp, printf, splat } = format;

const logger = createLogger({
  format: combine(
    splat(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    printf(({ timestamp: time, level, message }) => `${time} [${level}] ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: `${PATH}/wip-resource-deployer.log` }),
    new transports.File({ level: 'error', filename: `${PATH}/error.log` }),
  ],
});

export default logger;
