import { SubscriptionCanceled } from '../app/lib/email/templates/subscription-canceled';

export default function Preview() {
  return <SubscriptionCanceled name="Lucian" planName="Eloa" />;
}
