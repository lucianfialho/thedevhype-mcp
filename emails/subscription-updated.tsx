import { SubscriptionUpdated } from '../app/lib/email/templates/subscription-updated';

export default function Preview() {
  return (
    <SubscriptionUpdated
      name="Lucian"
      planName="Bundle"
      status="active"
      cancelAtPeriodEnd={true}
      currentPeriodEnd="2026-03-15T00:00:00Z"
    />
  );
}
