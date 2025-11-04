import React from 'react'
import { ChevronRight, PlusCircle } from 'lucide-react'
import { getInitials } from '../utils/user'

function nameToHue(name) {
  if (!name) return 200
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}

export default function CourseCard({ course, onOpen, instructorName = '', layout = 'grid', instructorId = null, onCreateForInstructor }) {
  if (layout === 'list') {
    const initials = getInitials(instructorName)
    const hue = nameToHue(instructorName)
    const bg = `linear-gradient(135deg, hsl(${hue} 70% 45%) 0%, hsl(${(hue + 40) % 360} 70% 55%) 100%)`

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onOpen && onOpen()
      }
    }

    return (
      <div
        className="rounded-2xl card-surface p-4 hover:shadow-lg transition cursor-pointer flex items-center justify-between"
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label={`Open course ${course.title}`}
      >
        <div className="flex-1 pr-4 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full text-white flex items-center justify-center text-sm font-semibold transform transition-transform hover:scale-105"
            style={{ background: bg }}
            aria-label={`Instructor ${instructorName}`}
            title={instructorName}
          >
            {initials}
          </div>
          <div className="flex-1">
            <div className="text-sm text-bronze font-semibold">{course.code}</div>
            <h3 className="font-bold text-xl text-taupe">{course.title}</h3>
            <div className="text-sm text-gray-400 mt-1">{instructorName}</div>
            <div className="text-xs text-gray-500 mt-1">{course.term} • {course.studentIds?.length || 0} students</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onCreateForInstructor && (
            <button onClick={(e) => { e.stopPropagation(); onCreateForInstructor(instructorId || course.instructorId) }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Create new course for this instructor">
              <PlusCircle size={16} className="text-gray-500" />
            </button>
          )}
          <ChevronRight size={18} className="text-gray-400" aria-hidden="true" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl card-surface p-4 hover:shadow-lg transition cursor-pointer" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-bronze font-semibold">{course.code}</div>
          <h3 className="font-bold text-lg text-taupe">{course.title}</h3>
          <div className="text-xs text-gray-500">{course.term}</div>
        </div>
        <div className="text-sm text-gray-500">{course.studentIds?.length || 0} students</div>
      </div>
    </div>
  )
}
