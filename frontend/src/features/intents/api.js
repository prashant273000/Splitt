import { get, post, del } from '../../lib/api';

export const getIntents = () => get('/intents');
export const createIntent = (data) => post('/intents', data);
export const cancelIntent = (id) => del(`/intents/${id}`);
