import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TodoItem from '../components/TodoItem'
import { useTodoStore } from '../store/todoStore'

const sampleTodo = {
  id: 'test-1',
  text: 'Test todo',
  completed: false,
  category: 'Work',
  priority: 'High',
  dueDate: null,
  notes: '',
  tags: [],
  subtasks: [],
  recurrence: 'none',
  createdAt: new Date().toISOString(),
}

describe('TodoItem', () => {
  beforeEach(() => {
    useTodoStore.setState({
      todos: [sampleTodo],
      selectedIds: [],
    })
  })

  it('renders todo text', () => {
    render(<TodoItem todo={sampleTodo} onToggle={() => {}} onDelete={() => {}} onUpdate={() => {}} />)
    expect(screen.getByText('Test todo')).toBeInTheDocument()
  })

  it('renders priority badge', () => {
    render(<TodoItem todo={sampleTodo} onToggle={() => {}} onDelete={() => {}} onUpdate={() => {}} />)
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('renders category badge', () => {
    render(<TodoItem todo={sampleTodo} onToggle={() => {}} onDelete={() => {}} onUpdate={() => {}} />)
    expect(screen.getByText('Work')).toBeInTheDocument()
  })

  it('calls onToggle when complete button clicked', async () => {
    const onToggle = vi.fn()
    render(<TodoItem todo={sampleTodo} onToggle={onToggle} onDelete={() => {}} onUpdate={() => {}} />)
    const checkbox = screen.getAllByRole('checkbox')[1]
    await userEvent.click(checkbox)
    expect(onToggle).toHaveBeenCalledWith('test-1')
  })

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = vi.fn()
    render(<TodoItem todo={sampleTodo} onToggle={() => {}} onDelete={onDelete} onUpdate={() => {}} />)
    const deleteBtn = screen.getByLabelText('Delete "Test todo"')
    await userEvent.click(deleteBtn)
    expect(onDelete).toHaveBeenCalledWith('test-1')
  })

  it('shows completed state with line-through', () => {
    const completed = { ...sampleTodo, completed: true }
    render(<TodoItem todo={completed} onToggle={() => {}} onDelete={() => {}} onUpdate={() => {}} />)
    const text = screen.getByText('Test todo')
    expect(text.className).toContain('line-through')
  })

  it('renders tags', () => {
    const withTags = { ...sampleTodo, tags: ['urgent', 'review'] }
    render(<TodoItem todo={withTags} onToggle={() => {}} onDelete={() => {}} onUpdate={() => {}} />)
    expect(screen.getByText('#urgent')).toBeInTheDocument()
    expect(screen.getByText('#review')).toBeInTheDocument()
  })

  it('renders subtask count', () => {
    const withSubs = { ...sampleTodo, subtasks: [
      { id: 's1', text: 'Sub 1', completed: true },
      { id: 's2', text: 'Sub 2', completed: false },
    ]}
    render(<TodoItem todo={withSubs} onToggle={() => {}} onDelete={() => {}} onUpdate={() => {}} />)
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('has proper ARIA on select checkbox', () => {
    render(<TodoItem todo={sampleTodo} onToggle={() => {}} onDelete={() => {}} onUpdate={() => {}} />)
    const selectCheckbox = screen.getByRole('checkbox', { name: /Select todo/i })
    expect(selectCheckbox).toHaveAttribute('aria-checked', 'false')
  })

  it('has proper ARIA on complete checkbox', () => {
    render(<TodoItem todo={sampleTodo} onToggle={() => {}} onDelete={() => {}} onUpdate={() => {}} />)
    const completeCheckbox = screen.getByRole('checkbox', { name: /Mark.*as complete/i })
    expect(completeCheckbox).toHaveAttribute('aria-checked', 'false')
  })
})
