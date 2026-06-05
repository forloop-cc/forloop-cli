export enum ExitCode {
  SUCCESS = 0,
  GENERAL = 1,
  USAGE = 2,
  AUTH = 3,
  QUOTA = 4,
  TIMEOUT = 5,
  NETWORK = 6,
  API = 7,
  CONTENT_FILTER = 10,
  INTERRUPTED = 130,
}
