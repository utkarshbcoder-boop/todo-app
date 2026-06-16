import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DashboardView from '../components/DashboardView'
import { useTodoStore } from '../store/todoStore'

describe('DashboardView', () => {
  beforeEach(() => {
    useTodoStore.setState({
      todos: [
        { id: '1', text: 'Work todo', completed: false, category: 'Work', priority: 'High', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
        { id: '2', text: 'Personal todo', completed: true, category: 'Personal', priority: 'Low', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
        { id: '3', text: 'Another work', completed: false, category: 'Work', priority: 'Medium', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
      ],
    })
  })

  it('renders summary cards', async () => {
    render(<DashboardView />)
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument()
    })
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('displays correct total count', async () => {
    render(<DashboardView />)
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('displays correct completed count', async () => {
    render(<DashboardView />)
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  it('shows chart headings', async () => {
    render(<DashboardView />)
    await waitFor(() => {
      expect(screen.getByText('By Category')).toBeInTheDocument()
    })
    expect(screen.getByText('By Priority')).toBeInTheDocument()
  })

  it('shows completion stats', async () => {
    render(<DashboardView />)
    await waitFor(() => {
      expect(screen.getByText(/completion rate/i)).toBeInTheDocument()
    })
  })

  it('shows no completed message when zero completed', async () => {
    useTodoStore.setState({
      todos: [
        { id: '1', text: 'Active', completed: false, category: 'Work', priority: 'High', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
      ],
    })
    render(<DashboardView />)
    await waitFor(() => {
      expect(screen.getByText(/0\s*total completions tracked/)).toBeInTheDocument()
    })
  })
})
