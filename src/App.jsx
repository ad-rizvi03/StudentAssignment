import React, { useEffect, useState } from 'react'
import { users as mockUsers, assignments as mockAssignments } from './data/mockData'
import { loadState, saveState, getDefaultPrefs, clearState } from './utils/storage'
import { normalizeUser, normalizeUsers } from './utils/user'
import LoginView from './views/LoginView'
import LoginPage from './components/Auth/LoginPage'
import StudentView from './views/StudentView'
import AdminView from './views/AdminView'
import Header from './components/Header'
import CoursesView from './views/CoursesView'
import AssignmentPage from './views/AssignmentPage'
import { courses as mockCourses, groups as mockGroups } from './data/mockData'

export default function App() {
  // load persisted or defaults
  const persisted = loadState()

  // normalize helpers moved to src/utils/user

  // make users mutable so new accounts can be created via the login screen
  const [users, setUsers] = useState(normalizeUsers(persisted?.users || mockUsers))
  const [assignments, setAssignments] = useState(persisted?.assignments || mockAssignments)
  // start with persisted user if present, otherwise force explicit login
  const [currentUserId, setCurrentUserId] = useState(persisted?.currentUserId ?? null)

  // per-user preferences map: { [userId]: { dark, layout, sortBy } }
  const [prefsByUser, setPrefsByUser] = useState(persisted?.prefsByUser || {})

  const currentUser = users.find(u => u.id === currentUserId) || users[0]

  // simple local view state: 'dashboard' | 'courses' | 'course'
  const [view, setView] = useState('courses')
  const [selectedCourseId, setSelectedCourseId] = useState(null)

  const [courses, setCourses] = useState(mockCourses)
  const [groups, setGroups] = useState(mockGroups)

  const currentPrefs = prefsByUser[currentUserId] || getDefaultPrefs()
  const [dark, setDark] = useState(currentPrefs.dark)
  const currentLayout = currentPrefs.layout || 'grid'

  // when switching user or when prefsByUser changes, sync dark state to that user's preference
  useEffect(() => {
    const p = prefsByUser[currentUserId] || getDefaultPrefs()
    setDark(p.dark)
  }, [currentUserId, prefsByUser])

  // persist the entire app state including prefsByUser
  useEffect(() => {
    try {
      if (dark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    } catch (e) {}
    saveState({ users, assignments, currentUserId, prefsByUser, courses, groups })
  }, [assignments, currentUserId, users, prefsByUser, dark])

  

  function handleUpdate(newAssignments) {
    setAssignments(newAssignments)
  }

  function handleAddGroup(newGroup) {
    setGroups(prev => {
      const next = [...(prev || []), newGroup]
      return next
    })
  }

  function handleAddCourse(course) {
    const next = {
      id: `c_${Date.now()}`,
      title: course.title || 'Untitled Course',
      code: course.code || 'CXXX',
      term: course.term || 'Fall 2025',
      instructorId: course.instructorId || currentUser.id,
      studentIds: course.studentIds || []
    }
    setCourses(prev => [...(prev || []), next])
    return next
  }

  function handleResetDemoData() {
    // ask user for confirmation before wiping local data
    const ok = window.confirm('Reset demo data? This will clear any local changes and restore seeded demo data.')
    if (!ok) return
    try {
      clearState()
    } catch (e) {}
    // reseed state from mock data
    setUsers(normalizeUsers(mockUsers))
    setAssignments(mockAssignments)
    setCourses(mockCourses)
    setGroups(mockGroups)
    setPrefsByUser({})
    setCurrentUserId(mockUsers[0]?.id ?? null)
    setView('courses')
    setSelectedCourseId(null)
  }

  function updateCurrentUserPrefs(updates) {
    setPrefsByUser(prev => {
      const next = { ...prev }
      next[currentUserId] = { ...(next[currentUserId] || {}), ...updates }
      return next
    })
  }

  function toggleDarkForCurrentUser() {
    const next = !dark
    setDark(next)
    updateCurrentUserPrefs({ dark: next })
  }

  // preview toggle used on the login screen (does not persist until user logs in)
  function toggleDarkPreview() {
    const next = !dark
    setDark(next)
  }

  function toggleLayoutForCurrentUser(target) {
    // if called with a specific layout, set that; otherwise toggle
    const next = target ? target : (currentLayout === 'grid' ? 'list' : 'grid')
    updateCurrentUserPrefs({ layout: next })
  }

  function handleLogin(userId) {
    // set current user
    setCurrentUserId(userId)
    // persist the current preview dark setting into the user's prefs so their choice carries over
    setPrefsByUser(prev => {
      const next = { ...(prev || {}) }
      next[userId] = { ...(next[userId] || {}), dark }
      return next
    })
  }

  function handleCreateUser(newUser) {
    // newUser may be accompanied by an array of courseIds to enroll (for students)
    // signature: handleCreateUser(newUser, enrollCourseIds?)
    return function _createUser(enrollCourseIds) {
      const normalized = normalizeUser(newUser)
      setUsers(prev => {
        const next = [...prev, normalized]
        return next
      })
      setCurrentUserId(newUser.id)

      // if the created account is a student and enrollCourseIds provided, add them to those courses
      if (normalized && normalized.role === 'student' && Array.isArray(enrollCourseIds)) {
        setCourses(prev => (prev || []).map(c => ({
          ...c,
          studentIds: enrollCourseIds.includes(c.id) ? Array.from(new Set([...(c.studentIds || []), normalized.id])) : (c.studentIds || [])
        })))
      }
      return normalized
    }
  }

  function handleDeleteUser(userId) {
    // remove user from users list
    setUsers(prev => (prev || []).filter(u => u.id !== userId))

    // remove from courses student lists
    setCourses(prev => (prev || []).map(c => ({ ...c, studentIds: (c.studentIds || []).filter(sid => sid !== userId) })))

    // remove from groups: remove memberIds, adjust leaderId or remove empty groups
    setGroups(prev => {
      const next = (prev || []).map(g => {
        const members = (g.memberIds || []).filter(m => m !== userId)
        const leader = g.leaderId === userId ? (members[0] || null) : g.leaderId
        return { ...g, memberIds: members, leaderId: leader }
      }).filter(g => (g.memberIds || []).length > 0)
      return next
    })

    // remove from assignments: remove assignedTo entries and submissions keyed by user
    setAssignments(prev => (prev || []).map(a => {
      if (a.submissionType === 'individual') {
        const assigned = (a.assignedTo || []).filter(sid => sid !== userId)
        const subs = { ...(a.submissions || {}) }
        delete subs[userId]
        return { ...a, assignedTo: assigned, submissions: subs }
      }
      // group assignment: no direct user ids here, but submissions keyed by group id may be affected by group removals handled above
      return { ...a }
    }))

    // remove user prefs
    setPrefsByUser(prev => {
      const next = { ...(prev || {}) }
      if (next[userId]) delete next[userId]
      return next
    })

    // if deleted user is currently logged in, clear current user
    setCurrentUserId(prev => prev === userId ? null : prev)
  }

  // if not logged in show login UI
  if (!currentUserId) {
    return (
      <div>
        <LoginPage
          users={users}
          courses={courses}
          onLogin={handleLogin}
          onCreateUser={(newUser, enrollCourseIds) => {
            // handleCreateUser returns a creator function
            const creator = handleCreateUser(newUser)
            if (typeof creator === 'function') creator(enrollCourseIds)
          }}
          onDeleteUser={handleDeleteUser}
          dark={dark}
          onToggleDark={toggleDarkPreview}
        />
      </div>
    )
  }

  function openCourse(id) {
    setSelectedCourseId(id)
    setView('course')
  }

  function handleUpdateAssignment(newAssignments) {
    setAssignments(newAssignments)
  }

  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  return (
    <div className="min-h-screen app-bg bg-gray-50 text-slate-900 dark:text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
  <Header users={users} currentUserId={currentUserId} onSwitchUser={setCurrentUserId} dark={dark} onToggleDark={toggleDarkForCurrentUser} layout={currentLayout} onToggleLayout={toggleLayoutForCurrentUser} onNavigate={(v) => { if (v === 'courses') { setView('courses'); setSelectedCourseId(null) } }} onResetDemo={handleResetDemoData} />

        <main>
          {view === 'courses' && (
            <CoursesView currentUser={currentUser} courses={courses} users={users} onOpenCourse={openCourse} layout={currentLayout} onAddCourse={handleAddCourse} />
          )}

          {view === 'course' && selectedCourse && (
            <AssignmentPage course={selectedCourse} assignments={assignments} users={users} groups={groups} onUpdateAssignment={handleUpdateAssignment} onAddGroup={handleAddGroup} currentUser={currentUser} />
          )}

        </main>

        <footer className="mt-8 text-center text-sm text-gray-500">© 2025 Student Assignment System | Built with ❤️ using React + Tailwind</footer>
      </div>
    </div>
  )
}
