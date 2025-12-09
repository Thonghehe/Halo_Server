import EventEmitter from 'events';

const notificationEmitter = new EventEmitter();
notificationEmitter.setMaxListeners(0); // allow many listeners for SSE connections

export default notificationEmitter;

