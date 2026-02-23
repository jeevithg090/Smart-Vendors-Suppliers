import { useState, useCallback, useMemo } from 'react';
import { FormValidator } from '../utils/validation';
import type { ValidationSchema, ValidationResult } from '../utils/validation';
import { useErrorHandler } from './useErrorHandler';

interface UseFormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showErrorsImmediately?: boolean;
}

export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  schema: ValidationSchema,
  options: UseFormValidationOptions = {}
) {
  const {
    validateOnChange = false,
    validateOnBlur = true,
    showErrorsImmediately = false
  } = options;

  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>(() => {
    if (!showErrorsImmediately) return {};
    const result = FormValidator.validate(initialData, schema);
    return result.errors.reduce((acc, error) => {
      acc[error.field] = error.message;
      return acc;
    }, {} as Record<string, string>);
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleValidationError } = useErrorHandler({ showNotification: false });

  // Validate specific field
  const validateField = useCallback((field: string, value: any): string | null => {
    const fieldSchema = { [field]: schema[field] };
    const fieldData = { [field]: value };
    const result = FormValidator.validate(fieldData, fieldSchema);
    
    if (result.errors.length > 0) {
      const error = result.errors[0];
      handleValidationError(field, value, error.message, error.constraints);
      return error.message;
    }
    
    return null;
  }, [schema, handleValidationError]);

  // Validate all fields
  const validateAll = useCallback((): ValidationResult => {
    const result = FormValidator.validate(data, schema);
    
    const newErrors: Record<string, string> = {};
    result.errors.forEach(error => {
      newErrors[error.field] = error.message;
    });
    
    setErrors(newErrors);
    return result;
  }, [data, schema]);

  // Update field value
  const updateField = useCallback((field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    
    if (validateOnChange || touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({
        ...prev,
        [field]: error || ''
      }));
    }
  }, [validateOnChange, touched, validateField]);

  // Handle field blur
  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (validateOnBlur) {
      const error = validateField(field, data[field]);
      setErrors(prev => ({
        ...prev,
        [field]: error || ''
      }));
    }
  }, [validateOnBlur, validateField, data]);

  // Handle form submission
  const handleSubmit = useCallback(async (onSubmit: (data: T) => Promise<void> | void) => {
    setIsSubmitting(true);
    
    try {
      const validation = validateAll();
      
      if (!validation.isValid) {
        // Mark all fields as touched to show errors
        const allTouched: Record<string, boolean> = {};
        Object.keys(schema).forEach(field => {
          allTouched[field] = true;
        });
        setTouched(allTouched);
        
        throw new Error('Form validation failed');
      }
      
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [data, schema, validateAll]);

  // Reset form
  const reset = useCallback((newData?: Partial<T>) => {
    const resetData = { ...initialData, ...newData } as T;
    setData(resetData);
    if (showErrorsImmediately) {
      const result = FormValidator.validate(resetData, schema);
      setErrors(result.errors.reduce((acc, error) => {
        acc[error.field] = error.message;
        return acc;
      }, {} as Record<string, string>));
    } else {
      setErrors({});
    }
    setTouched({});
    setIsSubmitting(false);
  }, [initialData, schema, showErrorsImmediately]);

  // Get field props for easy integration with form inputs
  const getFieldProps = useCallback((field: string) => ({
    value: data[field] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      updateField(field, e.target.value);
    },
    onBlur: () => handleBlur(field),
    error: (touched[field] || showErrorsImmediately) ? errors[field] : undefined,
    'aria-invalid': !!errors[field],
    'aria-describedby': errors[field] ? `${field}-error` : undefined
  }), [data, errors, touched, showErrorsImmediately, updateField, handleBlur]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.values(errors).every(error => !error);
  }, [errors]);

  // Check if form has been modified
  const isDirty = useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(initialData);
  }, [data, initialData]);

  return {
    data,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    updateField,
    handleBlur,
    handleSubmit,
    validateField,
    validateAll,
    reset,
    getFieldProps
  };
}
