import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useTodoStore } from '../store/todoStore'

describe('App', () => {
  beforeEach(() => {
    useTodoStore.setState({
      todos: [
        { id: '1', text: 'Test todo', completed: false, category: 'Work', priority: 'Medium', dueDate: null, notes: '', tags: [], subtasks: [], recurrence: 'none', createdAt: new Date().toISOString() },
      ],
      selectedIds: [],
      history: [],
      future: [],
    })
  })

  it('renders todo app heading', async () => {
    render(<App />)
    expect(await screen.findByText('Todo App')).toBeInTheDocument()
  })

  it('renders add new todo button', async () => {
    render(<App />)
    expect(await screen.findByText(/add new todo/i)).toBeInTheDocument()
  })

  it('shows shortcuts panel when ? pressed', async () => {
    render(<App />)
    await screen.findByText('Todo App')
    await userEvent.keyboard('?')
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  it('hides shortcuts panel on Escape', async () => {
    render(<App />)
    await screen.findByText('Todo App')
    await userEvent.keyboard('?')
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
    })
  })

  it('opens form when n pressed', async () => {
    render(<App />)
    await screen.findByText('Todo App')
    await userEvent.keyboard('n')
    expect(await screen.findByPlaceholderText(/what needs to be done/i)).toBeInTheDocument()
  })

  it('closes form on Escape', async () => {
    render(<App />)
    await screen.findByText('Todo App')
    await userEvent.keyboard('n')
    expect(await screen.findByPlaceholderText(/what needs to be done/i)).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/what needs to be done/i)).not.toBeInTheDocument()
    })
  })

  it('shows theme toggle button', async () => {
    render(<App />)
    expect(await screen.findByLabelText(/switch to.*mode/i)).toBeInTheDocument()
  })

  it('shows undo/redo buttons', async () => {
    render(<App />)
    expect(await screen.findByLabelText(/undo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/redo/i)).toBeInTheDocument()
  })

  it('shows keyboard shortcuts button', async () => {
    render(<App />)
    expect(await screen.findByLabelText(/keyboard shortcuts/i)).toBeInTheDocument()
  })

  it('shows import/export button', async () => {
    render(<App />)
    expect(await screen.findByLabelText(/import\/export/i)).toBeInTheDocument()
  })

  it('shows progress ring when todos exist', async () => {
    render(<App />)
    expect(await screen.findByRole('progressbar')).toBeInTheDocument()
  })
})
