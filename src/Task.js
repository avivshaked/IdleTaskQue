import { requestIdleCallback } from './requestIdleCallback';

class Task {
    /**
     * @param {function} taskFn
     * @param {number} id
     * @param {{ timeout?: number}} options
     */
    static _validateConstructorArguments(taskFn, id, options) {
        if (typeof taskFn !== 'function') {
            throw new TypeError('taskFn argument must be a function.');
        }
        if (typeof id !== 'number') {
            throw new TypeError('id argument must be a number.');
        }
        if (typeof options !== 'object') {
            throw new TypeError('options argument must be an object.');
        }
        if ('timeout' in options && typeof options.timeout !== 'number') {
            throw new TypeError('options.timeout must be a number.');
        }
    }

    /**
     *
     * @param {function} taskFn
     * @param {number} id
     * @param {{context?: *, binding?: *, timeout?: number, isRunOnce?: boolean, isImmediate?:
     *     boolean, requestIdleCallback?: function}?} options
     */
    constructor(taskFn, id, options = {}) {
        Task._validateConstructorArguments(taskFn, id, options);
        const {
            context = {},
            binding = {},
            timeout = 0,
            isRunOnce = true,
            isImmediate = true,
        } = options;
        this._taskFn = taskFn;
        this._id = id;
        this._context = context;
        this._binding = binding;
        this._timeout = timeout;
        this._isRunOnce = isRunOnce;
        this._isImmediate = isImmediate;
        this._fireTaskFn = this._fireTaskFn.bind(this);
        this.requestIdleCallback = options.requestIdleCallback || requestIdleCallback;
    }

    /**
     * Checks if a received task function is the same as the instance's task function.
     * @param {function} taskFn
     * @returns {boolean}
     */
    isTaskFn(taskFn) {
        return this._taskFn === taskFn;
    }

    /**
     * @returns {number}
     */
    get timeout() {
        return this._timeout;
    }

    /**
     * @returns {boolean}
     */
    get isRunOnce() {
        return this._isRunOnce;
    }

    /**
     * Sets the isRunOnce property
     * @param {boolean} state
     */
    setRunOnce(state) {
        this._isRunOnce = state;
    }

    /**
     * @returns {boolean}
     */
    get isImmediate() {
        return this._isImmediate;
    }

    /**
     * @returns {number}
     */
    get id() {
        return this._id;
    }

    /**
     * Invokes the task function.
     * The function is bound to "binding" and "context" is passed as argument.
     */
    _fireTaskFn() {
        if (this._taskFn) {
            this._taskFn.call(this._binding, this._context);
            if (this._isRunOnce) {
                // The owner of the task should make sure the task does not run more then once, but
                // this is a safeguard for race situations on the owner side. This will make sure
                // the task will run only once when isRunOnce is true.
                this._taskFn = null;
            }
        }
    }

    /**
     * Runs the task by passing it through a requestIdleCallback
     */
    runTaskOnIdle() {
        this.requestIdleCallback(this._fireTaskFn, {
            timeout: this._timeout,
        });
    }

    /**
     * Runs the task, either by directly firing the task fn,
     * or by passing it through a requestIdleCallback.
     */
    runTask() {
        if (this._timeout) {
            this.runTaskOnIdle();
        } else {
            this._fireTaskFn();
        }
    }

    /**
     * Sets isRunOnce to true, then fires the task immediately (without running through
     * requestIdleCallback). This will also effectively cause the registered function to nullify.
     */
    flush() {
        this._isRunOnce = true;
        this._fireTaskFn();
    }
}

export default Task;
