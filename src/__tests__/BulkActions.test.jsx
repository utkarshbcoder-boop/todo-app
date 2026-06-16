import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BulkActions from '../components/BulkActions'
import { useTodoStore } from '../store/todoStore'

const todos = [
  { id: '1', text: 'Active todo', completed: false, category: 'Work', priority: 'Medium', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
  { id: '2', text: 'Completed todo', completed: true, category: 'Personal', priority: 'Low', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
]

describe('BulkActions', () => {
  beforeEach(() => {
    useTodoStore.setState({
      todos,
      selectedIds: ['1', '2'],
    })
  })

  it('shows bulk actions when items are selected', () => {
    render(<BulkActions />)
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it('does not show when no items selected', () => {
    useTodoStore.setState({ selectedIds: [] })
    const { container } = render(<BulkActions />)
    expect(container.firstChild).toBeNull()
  })

  it('shows Complete Selected button', () => {
    render(<BulkActions />)
    expect(screen.getByRole('button', { name: /complete selected/i })).toBeInTheDocument()
  })

  it('shows Category dropdown button', () => {
    render(<BulkActions />)
    expect(screen.getByRole('button', { name: /categorize selected/i })).toBeInTheDocument()
  })

  it('shows Delete button', () => {
    render(<BulkActions />)
    expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument()
  })

  it('clicking delete shows confirmation modal', async () => {
    render(<BulkActions />)
    await userEvent.click(screen.getByRole('button', { name: /delete selected/i }))
    await waitFor(() => {
      expect(screen.getByText(/delete 2 todos/i)).toBeInTheDocument()
    })
  })

  it('confirmation modal has cancel and confirm buttons', async () => {
    render(<BulkActions />)
    await userEvent.click(screen.getByRole('button', { name: /delete selected/i }))
    await waitFor(() => {
      expect(screen.getByText(/delete 2 todos/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('clicking cancel dismisses the modal', async () => {
    render(<BulkActions />)
    await userEvent.click(screen.getByRole('button', { name: /delete selected/i }))
    await waitFor(() => {
      expect(screen.getByText(/delete 2 todos/i)).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(screen.queryByText(/delete 2 todos/i)).not.toBeInTheDocument()
    })
  })

  it('shows Clear Selection button', () => {
    render(<BulkActions />)
    expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument()
  })
})
