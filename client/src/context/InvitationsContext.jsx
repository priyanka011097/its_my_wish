import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { endpoints } from '../api/client'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const InvitationsContext = createContext({
  pending: [],
  pendingCount: 0,
  loading: false,
  refresh: () => {},
  accept: () => {},
  decline: () => {},
})

export const useInvitations = () => useContext(InvitationsContext)

const POLL_MS = 60_000

/**
 * Invitations addressed to the signed-in account, shared by the notification bell
 * and the dashboard. Polled so an invitation sent while the tab is open shows up
 * without a reload.
 */
export function InvitationsProvider({ children }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(false)
  // Bumped on accept so the dashboard knows to reload its boards.
  const [acceptedAt, setAcceptedAt] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) {
      setPending([])
      return
    }
    setLoading(true)
    try {
      const data = await endpoints.listInvitations()
      setPending(data.pending || [])
    } catch {
      // A failed poll is not worth interrupting anyone over; the next one retries.
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
    if (!user) return undefined
    const timer = setInterval(refresh, POLL_MS)
    // Coming back to the tab is the moment a stale badge is most obvious.
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh, user])

  const respond = useCallback(
    async (invitation, action) => {
      // Drop it from the list straight away; a failure puts it back.
      setPending((list) => list.filter((i) => i.id !== invitation.id))
      try {
        if (action === 'accept') {
          await endpoints.acceptInvitation(invitation.id)
          toast(`"${invitation.board?.title}" is now in Shared with me`)
          setAcceptedAt(Date.now())
        } else {
          await endpoints.declineInvitation(invitation.id)
          toast('Invitation declined')
        }
      } catch (err) {
        toast(err.message, 'error')
        refresh()
      }
    },
    [refresh, toast],
  )

  const value = useMemo(
    () => ({
      pending,
      pendingCount: pending.length,
      loading,
      acceptedAt,
      refresh,
      accept: (invitation) => respond(invitation, 'accept'),
      decline: (invitation) => respond(invitation, 'decline'),
    }),
    [pending, loading, acceptedAt, refresh, respond],
  )

  return <InvitationsContext.Provider value={value}>{children}</InvitationsContext.Provider>
}
