import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import StudentView from '../views/StudentView'
import AdminView from '../views/AdminView'
import AssignmentPage from '../views/AssignmentPage'

function renderWithState(ui, { props }) {
  return render(React.createElement(ui, props))
}

test('instructor can create a new project', async () => {
  const instructor = { id: 'u_prof_1', name: 'Dr. Teach', role: 'admin' }
  const students = [
    { id: 'u_student_1', name: 'Alice', role: 'student' },
    { id: 'u_student_2', name: 'Bob', role: 'student' }
  ]
  const users = [instructor, ...students]

  const course = { id: 'c1', title: 'Demo Course', code: 'DC101', term: 'Fall', instructorId: instructor.id, studentIds: students.map(s => s.id) }

  let captured = null
  function onUpdate(next) { captured = next }

  const { getByText, getByPlaceholderText, getByRole, findByText } = render(
    <AssignmentPage course={course} assignments={[]} users={users} groups={[]} onUpdateAssignment={onUpdate} onAddGroup={() => {}} currentUser={instructor} />
  )

  // open form
  const newBtn = getByText(/New Project/i)
  fireEvent.click(newBtn)

  // fill title
  const title = getByPlaceholderText('Title')
  fireEvent.change(title, { target: { value: 'Created by test' } })

  // fill due date (datetime-local format)
  const due = getByPlaceholderText('Due date') || getByRole('textbox', { name: /due date/i })
  // set a valid datetime-local value
  fireEvent.change(due, { target: { value: '2025-11-10T12:00' } })

  // submit
  const create = getByText(/Create Project/i)
  fireEvent.click(create)

  // toast should appear
  const toast = await findByText(/Project created/i)
  expect(toast).toBeTruthy()

  // onUpdate should have been called with new assignment array
  expect(captured).toBeTruthy()
  expect(Array.isArray(captured)).toBe(true)
  expect(captured.length).toBe(1)
  expect(captured[0].title).toBe('Created by test')
})

test('student can mark and unmark an assignment', async () => {
  const currentUser = { id: 'u_student_1', name: 'Alice', role: 'student' }
  const assignments = [
    {
      id: 'a1',
      title: 'Test Assign',
      description: 'desc',
      dueDate: '2025-11-01',
      driveLink: '',
      createdBy: 'u_admin_1',
      assignedTo: ['u_student_1'],
      submissions: { u_student_1: { submitted: false, timestamp: null } }
    }
  ]

  let state = [...assignments]
  function onUpdate(next) { state = next }

  const { rerender } = render(
    <StudentView currentUser={currentUser} assignments={state} onUpdate={(a) => { onUpdate(a); rerender(<StudentView currentUser={currentUser} assignments={state} onUpdate={onUpdate} />) }} />
  )

  // mark as submitted
  const markBtn = screen.getByText(/Mark as submitted/i)
  fireEvent.click(markBtn)

  // first confirm
  const confirm1 = await screen.findByText('Confirm')
  fireEvent.click(confirm1)

  // second modal final confirm
  const final = await screen.findAllByText('Confirm')
  // click the last Confirm (final)
  fireEvent.click(final[final.length - 1])

  await waitFor(() => {
    // assert that the specific assignment card shows the submitted status
    const titleEl = screen.getByText('Test Assign')
    const card = titleEl.closest('[data-assignment-id]')
    expect(card).toBeTruthy()
  expect(within(card).getByText(/^Submitted$/i)).toBeTruthy()
  })

  // now unmark
  const unmarkBtn = screen.getByText(/Mark as not submitted/i)
  fireEvent.click(unmarkBtn)

  const undoConfirm = await screen.findByText(/This will mark the assignment as not submitted again/i)
  // click the final Confirm button in the DOM (modal sequence may render multiple Confirm buttons)
  const allConfirms = await screen.findAllByText('Confirm')
  fireEvent.click(allConfirms[allConfirms.length - 1])

  await waitFor(() => {
    const titleEl2 = screen.getByText('Test Assign')
    const card2 = titleEl2.closest('[data-assignment-id]')
    expect(card2).toBeTruthy()
  expect(within(card2).getByText(/^Not submitted$/i)).toBeTruthy()
  })
})

test('admin can delete and undo', async () => {
  const users = [
    { id: 'u_admin_1', name: 'Prof', role: 'admin' },
    { id: 'u_student_1', name: 'Alice', role: 'student' }
  ]

  const assignments = [
    {
      id: 'a1',
      title: 'DeleteMe',
      description: 'desc',
      dueDate: '2025-11-01',
      driveLink: '',
      createdBy: 'u_admin_1',
      assignedTo: ['u_student_1'],
      submissions: { u_student_1: { submitted: false, timestamp: null } }
    }
  ]

  let state = [...assignments]
  function onUpdate(next) { state = next }

  const { rerender } = render(
    <AdminView currentUser={users[0]} users={users} assignments={state} onUpdate={(a) => { onUpdate(a); rerender(<AdminView currentUser={users[0]} users={users} assignments={state} onUpdate={onUpdate} />) }} />
  )

  // click delete
  const delBtn = screen.getByText('Delete')
  fireEvent.click(delBtn)

  // confirm modal
  const confirm = await screen.findByText('Confirm')
  fireEvent.click(confirm)

  // toast appears
  await waitFor(() => expect(screen.getByText(/Deleted: DeleteMe/i)).toBeTruthy())

  // undo
  const undo = screen.getByText('Undo')
  fireEvent.click(undo)

  // ensure the deleted toast is dismissed after undo (toast should be removed)
  await waitFor(() => expect(screen.queryByText(/Deleted: DeleteMe/i)).toBeNull())
})
