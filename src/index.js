import IdleTaskQue from './IdleTaskQue';

// Export the methods requestIdleCallback, cancelIdleCallback so the shim can be consumed externally
export { requestIdleCallback, cancelIdleCallback } from './requestIdleCallback';
// Export a create (and createIdleTaskQue which is the same) factory function to not use "new"
export const create = (...args) => new IdleTaskQue(...args);
export const createIdleTaskQue = create;

export default IdleTaskQue;
