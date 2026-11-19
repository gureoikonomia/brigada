export class ServiceError extends Error {
  constructor(message, statusCode, code) {
    super(message);

    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
