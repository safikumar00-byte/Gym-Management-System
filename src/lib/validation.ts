/**
 * Standardized Strong Password & Form Validation Utilities
 */

export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-_=+]/.test(password);

  const errors: string[] = [];
  if (!hasMinLength) errors.push('Must be at least 8 characters');
  if (!hasUppercase) errors.push('Must contain an uppercase letter (A-Z)');
  if (!hasLowercase) errors.push('Must contain a lowercase letter (a-z)');
  if (!hasNumber) errors.push('Must contain a number (0-9)');
  if (!hasSpecialChar) errors.push('Must contain a special character (!@#$%^&*)');

  return {
    isValid: hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    errors,
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function validatePhone(phone: string): boolean {
  if (!phone.trim()) return true; // Optional in some forms
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  return /^\+?[0-9]{7,15}$/.test(cleanPhone);
}
