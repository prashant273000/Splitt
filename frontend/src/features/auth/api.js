import { get, post } from '../../lib/api';

export const me = () => get('/auth/me');
export const logout = () => post('/auth/logout');
export const devLogin = (email, name) => post('/auth/dev-login', { email, name });
export const googleToken = (credential) => post('/auth/google/token', { credential });
