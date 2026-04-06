export class BadRequestError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export function parseId(param: string | string[]): number {
  const raw = Array.isArray(param) ? param[0] : param;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id) || id <= 0 || String(id) !== raw) {
    throw new BadRequestError(`Invalid ID parameter: "${raw}"`);
  }
  return id;
}
