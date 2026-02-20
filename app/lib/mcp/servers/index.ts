import { registry } from '../registry';
import { eloaServer } from './eloa';
import { notaFiscalServer } from './nota-fiscal';
import { ottoServer } from './otto';
import { familiaServer } from './familia';
import { rayssaServer } from './rayssa';

registry.register(eloaServer);
registry.register(notaFiscalServer);
registry.register(ottoServer);
registry.register(familiaServer);
registry.register(rayssaServer);

export { registry };
