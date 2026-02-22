import { WaitlistConfirmation } from '../app/lib/email/templates/waitlist-confirmation';

export default function Preview() {
  return <WaitlistConfirmation name="Lucian" position={42} />;
}
