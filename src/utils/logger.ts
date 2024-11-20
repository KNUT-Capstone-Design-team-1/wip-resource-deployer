import { createLogger, format, transports } from "winston";

const logDirectoryName = "log";

const { combine, timestamp, printf, splat } = format;

const logger = createLogger({
  format: combine(
    splat(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    printf(
      ({ timestamp: time, level, message }) => `${time} [${level}] ${message}`
    )
  ),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: `${logDirectoryName}/wip-resource-deployer.log`,
    }),
    new transports.File({
      level: "error",
      filename: `${logDirectoryName}/error.log`,
    }),
  ],
});

export default logger;
