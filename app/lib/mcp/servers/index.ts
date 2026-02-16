import { registry } from '../registry';
import { eloaServer } from './eloa';
import { notaFiscalServer } from './nota-fiscal';

registry.register(eloaServer);
registry.register(notaFiscalServer);

export { registry };
