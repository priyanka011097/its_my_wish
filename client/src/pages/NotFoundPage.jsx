import { Link as RouterLink } from 'react-router-dom'
import Button from '@mui/material/Button'
import AppShell from '../components/AppShell'
import EmptyState from '../components/EmptyState'

export default function NotFoundPage() {
  return (
    <AppShell maxWidth="sm">
      <EmptyState
        icon="🧭"
        title="This page does not exist"
        description="The link may be broken, or the wishlist may have been deleted."
        action={
          <Button variant="contained" component={RouterLink} to="/">
            Back to my wishlists
          </Button>
        }
      />
    </AppShell>
  )
}
