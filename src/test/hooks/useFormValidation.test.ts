import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '../../hooks/useFormValidation';

describe('useFormValidation', () => {
  const mockSchema = {
    name: { required: true, minLength: 2 },
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    age: { min: 18, max: 100 }
  };

  const initialData = {
    name: '',
    email: '',
    age: 0
  };

  it('should initialize with provided data', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialData, mockSchema)
    );

    expect(result.current.data).toEqual(initialData);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isValid).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  it('should update field values', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialData, mockSchema)
    );

    act(() => {
      result.current.updateField('name', 'John');
    });

    expect(result.current.data.name).toBe('John');
    expect(result.current.isDirty).toBe(true);
  });

  it('should validate fields on blur when validateOnBlur is true', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialData, mockSchema, { validateOnBlur: true })
    );

    act(() => {
      result.current.handleBlur('name');
    });

    expect(result.current.touched.name).toBe(true);
    expect(result.current.errors.name).toBeTruthy();
  });

  it('should validate fields on change when validateOnChange is true', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialData, mockSchema, { validateOnChange: true })
    );

    act(() => {
      result.current.updateField('name', 'J');
    });

    expect(result.current.errors.name).toBeTruthy();
  });

  it('should validate all fields', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialData, mockSchema)
    );

    act(() => {
      const validation = result.current.validateAll();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  it('should handle form submission with validation', async () => {
    const { result } = renderHook(() => 
      useFormValidation(initialData, mockSchema)
    );

    const mockSubmit = vi.fn();

    // Try to submit invalid form
    await act(async () => {
      try {
        await result.current.handleSubmit(mockSubmit);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);

    // Update with valid data
    act(() => {
      result.current.updateField('name', 'John Doe');
      result.current.updateField('email', 'john@example.com');
      result.current.updateField('age', 25);
    });

    // Submit valid form
    await act(async () => {
      await result.current.handleSubmit(mockSubmit);
    });

    expect(mockSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      age: 25
    });
  });

  it('should reset form data', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialData, mockSchema)
    );

    act(() => {
      result.current.updateField('name', 'John');
      result.current.handleBlur('name');
    });

    expect(result.current.data.name).toBe('John');
    expect(result.current.touched.name).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toEqual(initialData);
    expect(result.current.touched).toEqual({});
    expect(result.current.errors).toEqual({});
  });

  it('should provide field props for easy integration', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialData, mockSchema)
    );

    const fieldProps = result.current.getFieldProps('name');

    expect(fieldProps).toHaveProperty('value');
    expect(fieldProps).toHaveProperty('onChange');
    expect(fieldProps).toHaveProperty('onBlur');
    expect(typeof fieldProps.onChange).toBe('function');
    expect(typeof fieldProps.onBlur).toBe('function');
  });

  it('should show errors immediately when showErrorsImmediately is true', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialData, mockSchema, { showErrorsImmediately: true })
    );

    const fieldProps = result.current.getFieldProps('name');
    expect(fieldProps.error).toBeTruthy();
  });
});