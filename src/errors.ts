import { Params } from './i18n';

// message guarda a chave de tradução; o tratador de erros traduz pelo idioma do pedido
export class HttpError extends Error {
  constructor(public status: number, key: string, public params: Params = {}) { super(key); }
}
