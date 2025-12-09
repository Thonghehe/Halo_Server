import EventEmitter from 'events';

const orderEmitter = new EventEmitter();
orderEmitter.setMaxListeners(0);

export default orderEmitter;
