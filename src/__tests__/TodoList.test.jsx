import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TodoList from '../components/TodoList'
import { useTodoStore } from '../store/todoStore'

const todos = [
  { id: '1', text: 'Active work', completed: false, category: 'Work', priority: 'High', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
  { id: '2', text: 'Done personal', completed: true, category: 'Personal', priority: 'Low', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
  { id: '3', text: 'Another work', completed: false, category: 'Work', priority: 'Medium', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
]

describe('TodoList', () => {
  beforeEach(() => {
    useTodoStore.setState({
      todos,
      selectedIds: [],
      searchQuery: '',
      sortBy: 'createdAt',
      sortAsc: false,
      viewTab: 'all',
      categoryFilter: 'All',
    })
  })

  it('renders all todos in all view', () => {
    render(<TodoList />)
    expect(screen.getByText('Active work')).toBeInTheDocument()
    expect(screen.getByText('Done personal')).toBeInTheDocument()
    expect(screen.getByText('Another work')).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(<TodoList />)
    expect(screen.getByPlaceholderText(/search todos/i)).toBeInTheDocument()
  })

  it('filters by search query', async () => {
    render(<TodoList />)
    await userEvent.type(screen.getByPlaceholderText(/search todos/i), 'personal')
    await waitFor(() => {
      expect(screen.getByText('Done personal')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.queryByText('Active work')).not.toBeInTheDocument()
    })
  })

  it('shows view tabs', () => {
    render(<TodoList />)
    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /active/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /done/i })).toBeInTheDocument()
  })

  it('switches to active tab and filters', async () => {
    render(<TodoList />)
    await userEvent.click(screen.getByRole('tab', { name: /active/i }))
    await waitFor(() => {
      expect(screen.queryByText('Done personal')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Active work')).toBeInTheDocument()
    expect(screen.getByText('Another work')).toBeInTheDocument()
  })

  it('shows category filter buttons in the filter bar', () => {
    render(<TodoList />)
    const filterBar = screen.getByRole('group', { name: /filter by category/i })
    expect(within(filterBar).getByRole('button', { name: /work/i })).toBeInTheDocument()
    expect(within(filterBar).getByRole('button', { name: /personal/i })).toBeInTheDocument()
  })

  it('filters by category', async () => {
    render(<TodoList />)
    const filterBar = screen.getByRole('group', { name: /filter by category/i })
    await userEvent.click(within(filterBar).getByRole('button', { name: /personal/i }))
    await waitFor(() => {
      expect(screen.getByText('Done personal')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.queryByText('Active work')).not.toBeInTheDocument()
    })
  })

  it('shows sort dropdown', () => {
    render(<TodoList />)
    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
  })

  it('shows empty state when no todos', () => {
    useTodoStore.setState({ todos: [] })
    render(<TodoList />)
    expect(screen.getByText(/no todos yet/i)).toBeInTheDocument()
  })

  it('shows select all button when todos exist', () => {
    render(<TodoList />)
    const checkboxes = screen.getAllByRole('checkbox', { name: /select all visible/i })
    expect(checkboxes.length).toBeGreaterThanOrEqual(1)
  })

  it('shows clear completed when completed todos exist', () => {
    render(<TodoList />)
    const buttons = screen.getAllByRole('button', { name: /clear.*completed/i })
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })
})
