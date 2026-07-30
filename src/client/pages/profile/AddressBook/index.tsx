import { useProfile } from '../../../hooks/useProfile.js'
import AddressForm from '../../../components/profile/AddressForm/index.js'

export default function AddressBook() {
  const { data: user, isLoading } = useProfile()

  if (isLoading || !user)
    return <div className="profile-skeleton" style={{ height: 320, borderRadius: 12 }} />

  return <AddressForm user={user} />
}
