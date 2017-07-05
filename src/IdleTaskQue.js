import Task from './Task';
import { requestIdleCallback } from './requestIdleCallback';

class IdleTaskQue {
    /**
     *
     * @param {{requestIdleCallback?: function}?} config
     */
    constructor(config = {}) {
        /**
         * @type {number}
         * @private
         */
        this._id = -1;
        /**
         * @type {Array<Task>}
         * @private
         */
        this._que = [];

        /**
         * @type {Function}
         * @private
         */
        this._runTask = this._runTask.bind(this);

        /**
         * @type {function}
         * @private
         */
        this._idleCallback = this._idleCallback.bind(this);


        /**
         * @type {Function}
         */
        this.run = this.run.bind(this);

        /**
         * @type {Function}
         */
        this.flush = this.flush.bind(this);

        /**
         * @type {Function}
         */
        this.requestIdleCallback = config.requestIdleCallback || requestIdleCallback;
    }

    /**
     * Returns two lists.
     * First list with Task that have no timeout property.
     * Second list is a list of tasks that have timeout, which means they need to be executed in
     * time.
     * @returns {[Array<Task>,Array<Task>]}
     * @private
     */
    _getSeparatedLists() {
        const tasksWithTimeout = [];
        const tasksWithNoTimeout = [];
        this._que.forEach((task) => {
            if (task.timeout) {
                tasksWithTimeout.push(task);
            } else {
                tasksWithNoTimeout.push(task);
            }
        });
        return [tasksWithNoTimeout, tasksWithTimeout];
    }


    /**
     * Runs a task and removes it if it has isRunOnce.
     * @param {Task} task
     * @private
     */
    _runTask(task) {
        task.runTask();
        if (task.isRunOnce) {
            const index = this._que.indexOf(task);
            if (index > -1) {
                this._que.splice(index, 1);
            }
        }
    }

    /**
     * Runs through the tasks and invokes them as long as there is time remaining. When time runs
     * out the remaining tasks are fed to another requestIdleCallback by _runNoTimeoutQue method.
     * @param taskQue
     * @param deadline
     * @private
     */
    _idleCallback(taskQue = [], deadline = {}) {
        // Use any remaining time, or, if timed out, just run through the tasks.
        while ((deadline.timeRemaining() > 0 || deadline.didTimeout) &&
        taskQue.length > 0) {
            this._runTask(taskQue.shift());
        }

        // if time has run out there's a need to request another idle frame (if any tasks remain)
        if (taskQue.length > 0) {
            this._runNoTimeoutQue(taskQue);
        }
    }

    /**
     * Requests an idle frame then fires _idleCallback to run through the tasks
     * @param {Array<Task>} taskQue
     * @private
     */
    _runNoTimeoutQue(taskQue) {
        this.requestIdleCallback((deadline) => {
            this._idleCallback(taskQue, deadline);
        });
    }

    /**
     * Immediately invokes all the tasks in the list.
     * @param taskQue
     * @private
     */
    _runTimeoutQue(taskQue) {
        taskQue.forEach(this._runTask);
    }

    /**
     * Stars the sequence to run all the tasks.
     */
    run() {
        const [tasksWithNoTimeout, tasksWithTimeout] = this._getSeparatedLists();
        if (tasksWithNoTimeout.length) {
            this._runNoTimeoutQue(tasksWithNoTimeout);
        }

        if (tasksWithTimeout.length) {
            this._runTimeoutQue(tasksWithTimeout);
        }
    }


    /**
     * Adds a new task. Returns an id that can be used to remove the task from the list.
     * @param {function} taskFn
     * @param {{context?: *, binding?: *, timeout?: number, isRunOnce?: boolean, isImmediate?:
     *     boolean, requestIdleCallback?: function}?} options
     * @returns {number} Returns an id that can be used to remove a task from the que.
     */
    add(taskFn, options = {}) {
        if (typeof taskFn !== 'function') {
            throw new TypeError('Received taskFn argument is not a function.');
        }
        this._id += 1;
        const taskRequestIdleCB = {
            requestIdleCallback: options.requestIdleCallback || this.requestIdleCallback,
        };
        const task = new Task(taskFn, this._id, Object.assign({}, options, taskRequestIdleCB));
        if (task.isImmediate) {
            task.runTaskOnIdle();
        }
        // add task to que if one of the two conditions apply: 1. it is not an immediate task.
        // 2. It is an immediate task but it's not a run-once task.
        if ((task.isImmediate && !task.isRunOnce) || !task.isImmediate) {
            this._que.push(task);
        }
        return this._id;
    }

    /**
     * Removes all tasks that hold a reference to this function.
     * It is possible to add the same function multiple times (with different options),
     * this method will remove all of them.
     * @param {function} taskFn
     */
    remove(taskFn) {
        this._que.filter(task => task.isTaskFn(taskFn))
            .forEach((task) => {
                const index = this._que.indexOf(task);
                this._que.splice(index, 1);
            });
    }

    /**
     * Removes a task by its id. The method assumes ids are unique.
     * @param {number} taskId
     * @return boolean True if the task was successfully removed. False if it was not found by id.
     */
    removeById(taskId) {
        let taskIndex = null;
        this._que.some((task, index) => {
            if (task.id === taskId) {
                taskIndex = index;
                return true;
            }
            return false;
        });
        if (taskIndex === null) {
            return false;
        }

        this._que.splice(taskIndex, 1);
        return true;
    }

    /**
     * Cleans out the que.
     */
    clear() {
        this._que = [];
    }

    /**
     * Will iterate through all the registered tasks. Make the run only once, and then execute the
     * tasks immediately and not via requestIdleCallback. It will then clear the que.
     */
    flush() {
        this._que.map((task) => {
            task.setRunOnce(true);
            return task;
        }).forEach(task => task.flush());
        this.clear();
    }
}

export default IdleTaskQue;
