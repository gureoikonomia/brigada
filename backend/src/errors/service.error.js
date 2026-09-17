export class ServiceError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.name = 'ServiceError';
    this.statusCode = statusCode;
  }
}