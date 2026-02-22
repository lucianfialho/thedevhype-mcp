import { SubscriptionActive } from '../app/lib/email/templates/subscription-active';

export default function Preview() {
  return (
    <SubscriptionActive
      name="Lucian"
      planName="Eloa"
      planDescription="Content Curator — curate articles, manage sources, and track reading."
      priceMonthly={4}
    />
  );
}
