export class ApiResponse {
  static success(data: any, message?: string) {
    return {
      success: true,
      data,
      message: message || 'Success'
    };
  }

  static error(message: string, statusCode: number = 500, details?: any) {
    return {
      success: false,
      error: message,
      statusCode,
      details
    };
  }
}