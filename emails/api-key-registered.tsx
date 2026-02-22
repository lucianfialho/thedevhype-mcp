import { ApiKeyRegistered } from '../app/lib/email/templates/api-key-registered';

export default function Preview() {
  return (
    <ApiKeyRegistered
      name="Lucian"
      email="lucian@thedevhype.com"
      keyPrefix="pk-a1b2c"
      tier="free"
    />
  );
}
