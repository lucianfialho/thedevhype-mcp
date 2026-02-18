import { registry } from '../registry';
import { eloaServer } from './eloa';
import { notaFiscalServer } from './nota-fiscal';
import { ottoServer } from './otto';
import { familiaServer } from './familia';

registry.register(eloaServer);
registry.register(notaFiscalServer);
registry.register(ottoServer);
registry.register(familiaServer);

export { registry };
