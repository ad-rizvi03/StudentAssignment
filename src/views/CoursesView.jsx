import React, { useState } from 'react'
import CourseCard from '../components/CourseCard'
import { getDisplayName } from '../utils/user'

// simple inline new-course form in the courses view

export default function CoursesView({ currentUser, courses, users, onOpenCourse, layout = 'grid', onAddCourse }) {
  const [openForm, setOpenForm] = useState(false)
  const [form, setForm] = useState({ title: '', code: '', term: '', instructorId: null })
  // If admin, show courses they teach; if student, show courses they're enrolled in
  const list = (currentUser.role === 'admin')
    ? courses.filter(c => {
      // primary match: instructorId === currentUser.id
      if (c.instructorId === currentUser.id) return true
      // fallback: match by instructor name/displayName in case persisted ids differ
      const instr = users.find(u => u.id === c.instructorId)
      const instrName = instr ? getDisplayName(instr) : ''
      const curName = getDisplayName(currentUser)
      return instrName === curName
    })
    : courses.filter(c => c.studentIds && c.studentIds.includes(currentUser.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Your Courses</h2>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">{list.length} {list.length === 1 ? 'course' : 'courses'}</div>
          {currentUser.role === 'admin' && (
            <button className="px-3 py-2 bg-bronze text-white rounded" onClick={() => setOpenForm(o => !o)}>{openForm ? 'Close' : 'New Course'}</button>
          )}
        </div>
      </div>

      {openForm && currentUser.role === 'admin' && (
        <form className="card-bg-vars p-4 rounded card-shadow border card-border" onSubmit={(e) => {
          e.preventDefault()
          if (!onAddCourse) return
          const created = onAddCourse({ title: form.title, code: form.code, term: form.term, instructorId: form.instructorId || currentUser.id })
          setForm({ title: '', code: '', term: '', instructorId: null })
          setOpenForm(false)
        }}>
          <div className="grid gap-2 md:grid-cols-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Course title" className="border p-2 rounded" required />
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Course code" className="border p-2 rounded" required />
            <input value={form.term} onChange={e => setForm({ ...form, term: e.target.value })} placeholder="Term (e.g., Fall 2025)" className="border p-2 rounded" />
          </div>
          <div className="mt-3 flex justify-end">
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">Create Course</button>
          </div>
        </form>
      )}

      {layout === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map(c => {
            const instr = users.find(u => u.id === c.instructorId)
            const instrName = instr ? getDisplayName(instr) : ''
            return (
              <CourseCard key={c.id} course={c} onOpen={() => onOpenCourse(c.id)} instructorName={instrName} layout={layout} instructorId={c.instructorId} onCreateForInstructor={(iid) => { setForm({ ...form, instructorId: iid || c.instructorId }); setOpenForm(true) }} />
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(c => {
            const instr = users.find(u => u.id === c.instructorId)
            const instrName = instr ? getDisplayName(instr) : ''
            return (
              <div key={c.id} className="w-full">
                <CourseCard course={c} onOpen={() => onOpenCourse(c.id)} instructorName={instrName} layout={layout} instructorId={c.instructorId} onCreateForInstructor={(iid) => { setForm({ ...form, instructorId: iid || c.instructorId }); setOpenForm(true) }} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
