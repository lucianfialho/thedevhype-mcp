import { registry } from '../registry';
import { eloaServer } from './eloa';
import { notaFiscalServer } from './nota-fiscal';
import { ottoServer } from './otto';

registry.register(eloaServer);
registry.register(notaFiscalServer);
registry.register(ottoServer);

export { registry };
