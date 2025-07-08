import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../src/pages/Login';

test('renders login form and allows user input', () => {
  render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );

  const emailInput = screen.getByTestId('emailInput');
  const passwordInput = screen.getByTestId('passwordInput');
  const loginButton = screen.getByTestId('loginButton');

  fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
  fireEvent.change(passwordInput, { target: { value: 'password123' } });

  expect(emailInput.value).toBe('test@example.com');
  expect(passwordInput.value).toBe('password123');
  expect(loginButton).toBeInTheDocument();
});
