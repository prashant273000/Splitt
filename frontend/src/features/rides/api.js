import { get, post, del } from '../../lib/api';

export const getMyRides = () => get('/rides/mine');
export const getRide = (id) => get(`/rides/${id}`);
export const createRide = (data) => post('/rides', data);
export const cancelRide = (id) => del(`/rides/${id}`);
export const joinRide = (id) => post(`/rides/${id}/join`);
export const leaveRide = (id) => del(`/rides/${id}/leave`);
