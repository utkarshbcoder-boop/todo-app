import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TodoForm from '../components/TodoForm'
import { useTodoStore } from '../store/todoStore'
import { TestWrapper } from './testWrapper'

describe('TodoForm', () => {
  beforeEach(() => {
    useTodoStore.setState({ todos: [] })
  })

  it('renders text input and submit button', () => {
    render(<TodoForm onSubmit={() => {}} onCancel={() => {}} />, { wrapper: TestWrapper })
    expect(screen.getByPlaceholderText(/what needs to be done/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add todo/i })).toBeInTheDocument()
  })

  it('renders cancel button when onCancel provided', () => {
    render(<TodoForm onSubmit={() => {}} onCancel={() => {}} />, { wrapper: TestWrapper })
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls onCancel when cancel clicked', async () => {
    const onCancel = vi.fn()
    render(<TodoForm onSubmit={() => {}} onCancel={onCancel} />, { wrapper: TestWrapper })
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('does not render cancel button when onCancel not provided', () => {
    render(<TodoForm onSubmit={() => {}} />, { wrapper: TestWrapper })
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('shows Advanced toggle', () => {
    render(<TodoForm onSubmit={() => {}} onCancel={() => {}} />, { wrapper: TestWrapper })
    expect(screen.getByText(/advanced/i)).toBeInTheDocument()
  })

  it('shows tags input after clicking Advanced', async () => {
    render(<TodoForm onSubmit={() => {}} onCancel={() => {}} />, { wrapper: TestWrapper })
    await userEvent.click(screen.getByText(/advanced/i))
    expect(screen.getByPlaceholderText(/add tag/i)).toBeInTheDocument()
  })

  it('shows subtasks input after clicking Advanced', async () => {
    render(<TodoForm onSubmit={() => {}} onCancel={() => {}} />, { wrapper: TestWrapper })
    await userEvent.click(screen.getByText(/advanced/i))
    expect(screen.getByPlaceholderText(/add subtask/i)).toBeInTheDocument()
  })

  it('pre-fills date when prefillDate provided', () => {
    render(<TodoForm onSubmit={() => {}} onCancel={() => {}} prefillDate="2026-03-15" />, { wrapper: TestWrapper })
    const dateInput = screen.getByLabelText(/due date/i)
    expect(dateInput.value).toBe('2026-03-15')
  })

  it('submits with text and default values', async () => {
    const onSubmit = vi.fn()
    render(<TodoForm onSubmit={onSubmit} onCancel={() => {}} />, { wrapper: TestWrapper })
    await userEvent.type(screen.getByPlaceholderText(/what needs to be done/i), 'New todo')
    await userEvent.click(screen.getByRole('button', { name: /add todo/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ text: 'New todo' }))
  })

  it('submits with category and priority', async () => {
    const onSubmit = vi.fn()
    render(<TodoForm onSubmit={onSubmit} onCancel={() => {}} />, { wrapper: TestWrapper })
    await userEvent.type(screen.getByPlaceholderText(/what needs to be done/i), 'Test')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'Work')
    await userEvent.selectOptions(screen.getByLabelText(/priority/i), 'High')
    await userEvent.click(screen.getByRole('button', { name: /add todo/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ category: 'Work', priority: 'High' }))
  })

  it('populates initialData when provided', () => {
    render(<TodoForm onSubmit={() => {}} onCancel={() => {}} initialData={{ text: 'Edit me', notes: 'Some notes' }} />, { wrapper: TestWrapper })
    expect(screen.getByDisplayValue('Edit me')).toBeInTheDocument()
  })
})
