import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from '../select';

describe('Custom Select Component', () => {
  it('renders with default option label', () => {
    render(
      <Select aria-label="Department filter" defaultValue="eng">
        <option value="eng">Engineering</option>
        <option value="hr">Human Resources</option>
        <option value="fin">Finance</option>
      </Select>
    );

    expect(screen.getAllByText('Engineering').length).toBeGreaterThan(0);
  });

  it('opens floating popover when trigger button is clicked', () => {
    render(
      <Select aria-label="Department filter" defaultValue="eng">
        <option value="eng">Engineering</option>
        <option value="hr">Human Resources</option>
      </Select>
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByText('Human Resources').length).toBeGreaterThan(0);
  });

  it('selects option on click and calls onChange', () => {
    const handleChange = vi.fn();
    render(
      <Select aria-label="Department filter" defaultValue="eng" onChange={handleChange}>
        <option value="eng">Engineering</option>
        <option value="hr">Human Resources</option>
      </Select>
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    const hrOption = screen.getByRole('option', { name: 'Human Resources' });
    fireEvent.click(hrOption);

    expect(handleChange).toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes popover on Escape key', () => {
    render(
      <Select aria-label="Department filter" defaultValue="eng">
        <option value="eng">Engineering</option>
        <option value="hr">Human Resources</option>
      </Select>
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
