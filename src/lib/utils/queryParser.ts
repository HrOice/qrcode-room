type QueryValue = string | number | boolean | undefined | null;

export class QueryParser {
  static toInt(value: QueryValue, defaultValue?: number): number | undefined {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    const parsed = parseInt(String(value));
    return isNaN(parsed) ? defaultValue : parsed;
  }

  static toBoolean(value: QueryValue, defaultValue?: boolean): boolean | undefined {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return defaultValue;
  }

  static toString(value: QueryValue, defaultValue?: string): string | undefined {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    return String(value);
  }
}