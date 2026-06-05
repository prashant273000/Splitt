import { get, post, del } from '../../lib/api';

export const getMatches = () => get('/matches');
export const confirmMatch = (id) => post(`/matches/${id}/confirm`);
export const rejectMatch = (id) => del(`/matches/${id}`);
