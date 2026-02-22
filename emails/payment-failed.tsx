import { PaymentFailed } from '../app/lib/email/templates/payment-failed';

export default function Preview() {
  return <PaymentFailed name="Lucian" planName="Bundle" />;
}
