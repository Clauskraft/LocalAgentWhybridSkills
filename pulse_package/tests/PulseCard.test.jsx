/*
 * Frontend test for PulseCard component.
 * Brug React Testing Library til at sikre at elementet render korrekt og
 * callback-funktionerne kaldes.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import PulseCard from '@/components/PulseCard';

test('renders title and summary', () => {
  const insight = {
    id: '1',
    title: 'Forbered dig til demo',
    summary: 'Møde med Alice kl. 09:00',
    priority: 'high',
    actions: [],
  };
  render(<PulseCard insight={insight} onAction={() => {}} onFeedback={() => {}} />);
  expect(screen.getByText('Forbered dig til demo')).toBeInTheDocument();
  expect(screen.getByText('Møde med Alice kl. 09:00')).toBeInTheDocument();
});

test('calls feedback callback', () => {
  const insight = {
    id: '1',
    title: 'Forbered dig',
    summary: '...',
    priority: 'medium',
    actions: [],
  };
  const onFeedback = jest.fn();
  render(<PulseCard insight={insight} onAction={() => {}} onFeedback={onFeedback} />);
  // Klik på første knap (thumbs up)
  fireEvent.click(screen.getAllByRole('button')[0]);
  expect(onFeedback).toHaveBeenCalledWith('1', true);
});
