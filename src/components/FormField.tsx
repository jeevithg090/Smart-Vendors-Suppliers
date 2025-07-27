import React, { forwardRef } from 'react';
// import type { ValidationError } from '../types/errors';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'textarea' | 'select';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  'data-testid'?: string;
}

export const FormField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  FormFieldProps
>(({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  required,
  disabled,
  placeholder,
  options,
  rows = 3,
  min,
  max,
  step,
  className = '',
  'data-testid': testId,
  ...props
}, ref) => {
  const baseClasses = `
    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    ${className}
  `.trim();

  const renderInput = () => {
    if (type === 'textarea') {
      return (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          rows={rows}
          className={baseClasses}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          data-testid={testId || `input-${name}`}
          {...props}
        />
      );
    }

    if (type === 'select' && options) {
      return (
        <select
          ref={ref as React.Ref<HTMLSelectElement>}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          className={baseClasses}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          data-testid={testId || `select-${name}`}
          {...props}
        >
          <option value="">{placeholder || `Select ${label}`}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={baseClasses}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        data-testid={testId || `input-${name}`}
        {...props}
      />
    );
  };

  return (
    <div className="mb-4">
      <label
        htmlFor={name}
        className={`block text-sm font-medium mb-1 ${
          error ? 'text-red-700' : 'text-gray-700'
        }`}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {renderInput()}
      
      {error && (
        <p
          id={`${name}-error`}
          className="mt-1 text-sm text-red-600"
          role="alert"
          data-testid={`error-${name}`}
        >
          {error}
        </p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';