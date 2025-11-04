import React, { useState, useRef } from 'react'
import ProgressBar from '../components/ProgressBar'
import ConfirmModal from '../components/ConfirmModal'
import Toast from '../components/Toast'
import EditAssignmentModal from '../components/EditAssignmentModal'
import { PlusCircle } from 'lucide-react'

import { isAdmin, canEditAssignment } from '../utils/permissions'
import { getDisplayName } from '../utils/user'

export default function AdminView({ currentUser, users, assignments, onUpdate, layout = 'grid' }) {
  const [openForm, setOpenForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', driveLink: '' })

  const myAssignments = assignments.filter(a => a.createdBy === currentUser.id)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null) // { item, index }
  const pendingTimerRef = useRef(null)
  const [editTarget, setEditTarget] = useState(null)

  function pctForAssignment(a, studentId) {
    const s = a.submissions?.[studentId]
    return s && s.submitted ? 100 : 0
  }

  function createAssignment(e) {
    e.preventDefault()
    const newA = {
      id: `a_${Date.now()}`,
      title: form.title || 'Untitled',
      description: form.description || '',
      dueDate: form.dueDate || '',
      driveLink: form.driveLink || '',
      createdBy: currentUser.id,
      assignedTo: users.filter(u => u.role === 'student').map(s => s.id),
      submissions: Object.fromEntries(users.filter(u => u.role === 'student').map(s => [s.id, { submitted: false, timestamp: null }]))
    }
    onUpdate([...assignments, newA])
    setForm({ title: '', description: '', dueDate: '', driveLink: '' })
    setOpenForm(false)
  }


  function handleDeleteRequest(a) {
    setDeleteTarget(a)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    // find index so we can restore at same position if undone
    const idx = assignments.findIndex(x => x.id === deleteTarget.id)
    const updated = assignments.filter(x => x.id !== deleteTarget.id)
    // update immediately
    onUpdate(updated)

    // clear any existing pending delete timer
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
    }

  // set pending delete info and start timer to finalize
  // store the post-delete snapshot so undo can reliably reconstruct the previous state
  setPendingDelete({ item: deleteTarget, index: idx, prev: updated })
    pendingTimerRef.current = setTimeout(() => {
      setPendingDelete(null)
      pendingTimerRef.current = null
    }, 6000)

    setDeleteTarget(null)
  }

  function undoDelete() {
    if (!pendingDelete) return
    // cancel timer
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
    }

  // restore to original index using the stored post-delete snapshot (prev) if available
  const base = pendingDelete.prev ?? assignments
  const restored = [...base]
    const insertIndex = Math.min(Math.max(0, pendingDelete.index ?? restored.length), restored.length)
    restored.splice(insertIndex, 0, pendingDelete.item)
    onUpdate(restored)
    setPendingDelete(null)
  }

  function handleSaveEdit(updated) {
    // only allow saving if the current user is the creator
    if (!canEditAssignment(currentUser, updated)) {
      console.warn('Attempt to edit an assignment not owned by current user')
      setEditTarget(null)
      return
    }
    const next = assignments.map(a => a.id === updated.id ? updated : a)
    onUpdate(next)
    setEditTarget(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Assignments I created</h2>
        <div>
          {isAdmin(currentUser) ? (
            <button className="px-3 py-2 bg-sky-600 text-white rounded" onClick={() => setOpenForm(o => !o)}>
              {openForm ? 'Close' : 'New Assignment'}
            </button>
          ) : (
            <div className="text-sm text-slate-500">Only admins can create assignments</div>
          )}
        </div>
      </div>

      {openForm && (
        <form className="card-bg-vars p-4 rounded card-shadow border card-border" onSubmit={createAssignment}>
          <div className="grid gap-2 md:grid-cols-2">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" className="border p-2 rounded" />
            <input value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} placeholder="Due date (YYYY-MM-DD)" className="border p-2 rounded" />
            <input value={form.driveLink} onChange={e => setForm({ ...form, driveLink: e.target.value })} placeholder="Drive link" className="border p-2 rounded col-span-2" />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" className="border p-2 rounded col-span-2" />
          </div>
          <div className="mt-3 flex justify-end">
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">Create</button>
          </div>
        </form>
      )}

      {layout === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {myAssignments.map(a => (
            <div key={a.id} className="rounded-2xl card-surface p-4 hover:shadow-lg transition-transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Due {a.dueDate}</p>
                  {a.driveLink && <a href={a.driveLink} target="_blank" rel="noreferrer" className="text-xs text-sky-600">Drive link</a>}
                </div>
                <div className="flex gap-2">
                  {isAdmin(currentUser) ? (
                    <>
                      <button onClick={() => setEditTarget(a)} className="px-2 py-1 text-sm rounded bg-sky-600 text-white">Edit</button>
                      <button onClick={() => handleDeleteRequest(a)} className="px-2 py-1 text-sm rounded bg-rose-600 text-white">Delete</button>
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 px-2 py-1">Admins only</div>
                  )}
                </div>
              </div>
              <div className="mt-3 grid gap-3">
                {users.filter(u => u.role === 'student').map(s => (
                  <div key={s.id} className="flex items-center gap-4">
                    <div className="w-36 text-sm">{getDisplayName(s)}</div>
                    <div className="flex-1">
                      <ProgressBar percent={pctForAssignment(a, s.id)} />
                    </div>
                    <div className="w-24 text-sm text-right">{pctForAssignment(a, s.id) === 100 ? 'Submitted' : 'Not submitted'}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {myAssignments.map(a => (
            <div key={a.id} className="rounded-2xl card-surface p-4 transition-transform duration-150 hover:scale-105">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Due {a.dueDate}</p>
                  {a.driveLink && <a href={a.driveLink} target="_blank" rel="noreferrer" className="text-xs text-sky-600">Drive link</a>}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {isAdmin(currentUser) ? (
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <button onClick={() => setEditTarget(a)} className="px-2 py-1 text-sm rounded bg-sky-600 text-white">Edit</button>
                      <button onClick={() => handleDeleteRequest(a)} className="px-2 py-1 text-sm rounded bg-rose-600 text-white">Delete</button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 px-2 py-1">Admins only</div>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {users.filter(u => u.role === 'student').map(s => (
                  <div key={s.id} className="flex items-center gap-4">
                    <div className="w-36 text-sm">{getDisplayName(s)}</div>
                    <div className="flex-1">
                      <ProgressBar percent={pctForAssignment(a, s.id)} />
                    </div>
                    <div className="w-24 text-sm text-right">{pctForAssignment(a, s.id) === 100 ? 'Submitted' : 'Not submitted'}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating add button for admin */}

      <button className="fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-3 rounded-full shadow-lg hidden md:block" onClick={() => setOpenForm(true)}><PlusCircle size={20} /></button>
      <ConfirmModal open={!!deleteTarget} title="Delete assignment?" onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}>
        This will delete the assignment (only in this demo). You will have a few seconds to undo.
      </ConfirmModal>

      <EditAssignmentModal open={!!editTarget} assignment={editTarget} onClose={() => setEditTarget(null)} onSave={handleSaveEdit} />

      {pendingDelete && (
        <Toast
          message={`Deleted: ${pendingDelete.item.title}`}
          actionLabel="Undo"
          onAction={undoDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
