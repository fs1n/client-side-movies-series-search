import { AppwriteException } from "appwrite";

export interface AppwriteError {
  message: string;
  code: number;
  type: string;
  originalError: any;
}

const ERROR_CODE_MAP: Record<number, string> = {
  0: "Network error. Please check your internet connection.",
  400: "Invalid request. Please check your input.",
  401: "Authentication failed. Please check your credentials.",
  403: "Access denied. You do not have permission to perform this action.",
  404: "Resource not found.",
  409: "Conflict error. This resource already exists.",
  429: "Too many requests. Please slow down and try again later.",
  500: "Internal server error. Please try again later.",
  503: "Service unavailable. We're experiencing technical difficulties.",
};

const ERROR_TYPE_MAP: Record<string, string> = {
  'user_invalid_credentials': "The email or password you entered is incorrect.",
  'user_already_exists': "A user with this email address already exists.",
  'password_recently_used': "This password was recently used. Please choose a different one.",
  'password_personal_data': "Password contains personal data and is too weak.",
  'user_password_mismatch': "Passwords do not match.",
  'user_not_found': "Account not found.",
  'user_status_blocked': "This account has been blocked.",
};

/**
 * Parses any error into a standardized AppwriteError object with user-friendly messages.
 * Never exposes sensitive configuration or internal implementation details to the client.
 */
export const parseAppwriteError = (error: any): AppwriteError => {
  let code = 0;
  let type = 'unknown';
  let message = "An unexpected error occurred.";

  // Handle AppwriteException
  if (error instanceof AppwriteException) {
    code = error.code;
    type = error.type;
    // Prefer type-specific messages, then code-specific, then fallback to generic message
    message = ERROR_TYPE_MAP[type] || ERROR_CODE_MAP[code] || "An unexpected error occurred. Please try again.";
  } 
  // Handle Network Errors (fetch failures)
  else if (error instanceof Error && (error.message === 'Network request failed' || error.message.includes('fetch'))) {
    code = 0;
    type = 'network_error';
    message = ERROR_CODE_MAP[0];
  }
  // Handle Generic Errors - don't expose raw error messages
  else if (error instanceof Error) {
    message = "An unexpected error occurred. Please try again.";
  }

  return {
    message,
    code,
    type,
    originalError: error
  };
};

/**
 * Executes an async operation with automatic retries for network errors or 5xx server errors.
 */
export const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Determine if error is retryable (Network error or 5xx)
      let isRetryable = false;
      
      if (error instanceof AppwriteException) {
        isRetryable = error.code >= 500 && error.code < 600;
      } else if (error instanceof Error) {
        isRetryable = error.message === 'Network request failed' || error.message.includes('fetch');
      }

      if (!isRetryable) {
        throw error;
      }

      // Don't wait on the last attempt
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};
