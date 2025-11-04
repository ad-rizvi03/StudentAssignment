import React from 'react'
import ProgressBar from './ProgressBar'
import { Check, Paperclip, Calendar, XCircle } from 'lucide-react'

export default function AssignmentCard({ assignment, studentId, onMark, onUnmark, onOpen }) {
  const submission = assignment.submissions?.[studentId] || { submitted: false, timestamp: null }
  const statusBadge = submission.submitted ? (
    <span className="px-2 py-1 text-xs rounded-full bg-pine/10 text-pine flex items-center gap-2"><Check size={14} />Submitted</span>
  ) : (
    <span className="px-2 py-1 text-xs rounded-full bg-bronze/10 text-bronze flex items-center gap-2"><XCircle size={14} />Not submitted</span>
  )

  return (
  <div data-assignment-id={assignment.id} className="rounded-2xl card-surface p-4 hover:shadow-lg transition-transform hover:-translate-y-1 flex flex-col justify-between h-full" role="article">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h4 className="font-semibold cursor-pointer text-taupe" onClick={() => onOpen && onOpen(assignment)}>{assignment.title}</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">{assignment.description}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2"><Calendar size={14} className="inline-block mr-1" />Due: {assignment.dueDate}</p>
        </div>
        <div className="w-44 text-right">
            <div className="text-sm">Status</div>
          <div className="text-sm font-medium mt-1" title={submission.timestamp ? `Submitted at ${submission.timestamp}` : ''}>
            {statusBadge}
          </div>
            <div className="mt-3">
              <ProgressBar percent={submission.submitted ? 100 : 0} />
            </div>
        </div>
      </div>

  <div className="mt-4 flex gap-2 items-end">
            {!submission.submitted ? (
          <>
                <button
                  onClick={() => onMark && onMark(assignment)}
                  className="px-3 py-1.5 bg-pine text-white rounded text-sm flex items-center gap-2 hover:bg-bronze transition-transform hover:scale-[1.02]"
                >
                  <Check size={14} />Mark as submitted
                </button>
            {assignment.driveLink && (
              <a className="px-3 py-1.5 border border-bronze rounded text-sm flex items-center gap-2 text-taupe" href={assignment.driveLink} target="_blank" rel="noreferrer"><Paperclip size={14} />Submit via Drive</a>
            )}
          </>
        ) : (
          <>
            <div className="flex-1" />
            <button
              onClick={() => onUnmark && onUnmark(assignment)}
              className="px-3 py-1.5 bg-rose-600 text-white rounded text-sm"
            >
              Mark as not submitted
            </button>
          </>
        )}
      </div>
    </div>
  )
}
