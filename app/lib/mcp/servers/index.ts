import { registry } from '../registry';
import { eloaServer } from './eloa';

registry.register(eloaServer);

export { registry };
