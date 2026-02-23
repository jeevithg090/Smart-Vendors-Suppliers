import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormField } from '../../components/FormField';

describe('FormField', () => {
  const defaultProps = {
    label: 'Test Field',
    name: 'testField',
    value: '',
    onChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render text input correctly', () => {
    render(<FormField {...defaultProps} />);
    
    expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render required indicator', () => {
    render(<FormField {...defaultProps} required />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<FormField {...defaultProps} error="This field is required" />);
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should handle text input changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    
    render(<FormField {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'test value');
    
    expect(onChange).toHaveBeenCalledTimes(10); // Once for each character
  });

  it('should render textarea when type is textarea', () => {
    render(<FormField {...defaultProps} type="textarea" />);
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
  });

  it('should render select with options', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' }
    ];
    
    render(<FormField {...defaultProps} type="select" options={options} />);
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('should handle select changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' }
    ];
    
    render(<FormField {...defaultProps} type="select" options={options} onChange={onChange} />);
    
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'option1');
    
    expect(onChange).toHaveBeenCalledTimes(1);
    const event = onChange.mock.calls[0][0] as any;
    expect(event.target.name).toBe('testField');
  });

  it('should apply error styling when error is present', () => {
    render(<FormField {...defaultProps} error="Error message" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500', 'bg-red-50');
  });

  it('should apply disabled styling when disabled', () => {
    render(<FormField {...defaultProps} disabled />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('bg-gray-100', 'cursor-not-allowed');
    expect(input).toBeDisabled();
  });

  it('should handle blur events', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    
    render(<FormField {...defaultProps} onBlur={onBlur} />);
    
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.tab();
    
    expect(onBlur).toHaveBeenCalled();
  });

  it('should set correct accessibility attributes', () => {
    render(<FormField {...defaultProps} error="Error message" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'testField-error');
  });

  it('should render with custom test id', () => {
    render(<FormField {...defaultProps} data-testid="custom-field" />);
    
    expect(screen.getByTestId('custom-field')).toBeInTheDocument();
  });

  it('should handle number input with min/max', () => {
    render(<FormField {...defaultProps} type="number" min={0} max={100} />);
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
  });

  it('should handle email input type', () => {
    render(<FormField {...defaultProps} type="email" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should handle password input type', () => {
    render(<FormField {...defaultProps} type="password" />);
    
    const input = screen.getByLabelText('Test Field');
    expect(input).toHaveAttribute('type', 'password');
  });
});
