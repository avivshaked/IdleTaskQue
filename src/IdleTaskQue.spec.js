import test from 'ava';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import Task from './Task';

const mockIdleFn = sinon.stub();
const IdleTaskQue = proxyquire.noCallThru()(
    './IdleTaskQue',
    {
        './requestIdleCallback': { requestIdleCallback: mockIdleFn },
    },
).default;

test('Constructor should create an instance', (t) => {
    const que = new IdleTaskQue();
    t.is(que._id, -1);
    t.deepEqual(que._que, []);
    t.true(que.hasOwnProperty('_runTask')); // eslint-disable-line
    t.true(que.hasOwnProperty('_idleCallback')); // eslint-disable-line
});

test('add should create Tasks and add them to _que', (t) => {
    const que = new IdleTaskQue();
    const fn1 = () => {};
    const fn2 = () => {};
    const fn3 = () => {};
    const fn4 = () => {};
    que.add(fn1, { timeout: 100, isImmediate: false });
    que.add(fn2, { isImmediate: false });
    que.add(fn3, { isImmediate: false });
    que.add(fn4, { timeout: 100, isImmediate: false });
    t.is(que._que.length, 4);
    t.true(que._que[0].isTaskFn(fn1));
    t.true(que._que[1].isTaskFn(fn2));
    t.true(que._que[2].isTaskFn(fn3));
    t.true(que._que[3].isTaskFn(fn4));
});

test('add should invoke runTaskOnIdle if task.isImmediate is true', (t) => {
    sinon.stub(Task.prototype, 'runTaskOnIdle');
    const que = new IdleTaskQue();
    t.false(Task.prototype.runTaskOnIdle.called);
    que.add(() => {}, { isImmediate: true });
    t.true(Task.prototype.runTaskOnIdle.called);
    Task.prototype.runTaskOnIdle.restore();
});

test('add should not add the task to the que if it is immediate, unless it is also not run once',
    (t) => {
        const que = new IdleTaskQue();
        que.add(() => {}, { isImmediate: true });
        t.is(que._que.length, 0);
        que.add(() => {}, { isImmediate: true, isRunOnce: false });
        t.is(que._que.length, 1);
    });

test('remove should remove all tasks that use that task function', (t) => {
    const que = new IdleTaskQue();
    const fn1 = () => {};
    const fn2 = () => {};
    que.add(fn1, { isImmediate: false });
    que.add(fn2, { isImmediate: false });
    que.add(fn1, { isImmediate: false });
    que.add(fn2, { isImmediate: false });
    que.remove(fn1);
    t.is(que._que.length, 2);
    t.true(que._que[0].isTaskFn(fn2));
    t.true(que._que[1].isTaskFn(fn2));
});

test('removeById should remove a task by id', (t) => {
    const que = new IdleTaskQue();
    const fn1 = () => {};
    const fn2 = () => {};
    const fn3 = () => {};
    const fn4 = () => {};
    const id1 = que.add(fn1, { isImmediate: false });
    const id2 = que.add(fn2, { isImmediate: true, isRunOnce: false });
    const id3 = que.add(fn3, { isImmediate: false });
    const id4 = que.add(fn4, { isImmediate: false });
    t.is(que._que.length, 4);
    t.true(que._que[0].isTaskFn(fn1));
    t.true(que._que[1].isTaskFn(fn2));
    t.true(que._que[2].isTaskFn(fn3));
    t.true(que._que[3].isTaskFn(fn4));
    que.removeById(id3);
    t.is(que._que.length, 3);
    t.false(que._que[0].isTaskFn(fn3));
    t.false(que._que[1].isTaskFn(fn3));
    t.false(que._que[2].isTaskFn(fn3));
    que.removeById(id2);
    t.is(que._que.length, 2);
    t.false(que._que[0].isTaskFn(fn2));
    t.false(que._que[1].isTaskFn(fn2));
    que.removeById(id4);
    t.is(que._que.length, 1);
    t.false(que._que[0].isTaskFn(fn4));
    que.removeById(id1);
    t.is(que._que.length, 0);
});

test('_getSeparatedLists should return an array of two task arrays based on task.timeout', (t) => {
    const que = new IdleTaskQue();
    const fn1 = () => {};
    const fn2 = () => {};
    const fn3 = () => {};
    const fn4 = () => {};
    que.add(fn1, { timeout: 100, isImmediate: false });
    que.add(fn2, { isImmediate: true, isRunOnce: false });
    que.add(fn3, { isImmediate: false });
    que.add(fn4, { timeout: 100, isImmediate: false });
    const lists = que._getSeparatedLists();
    t.true(lists[0][0].isTaskFn(fn2));
    t.true(lists[0][1].isTaskFn(fn3));
    t.true(lists[1][0].isTaskFn(fn1));
    t.true(lists[1][1].isTaskFn(fn4));
});

test('_runTask should invoke runTask on received task', (t) => {
    const task = new Task(() => {}, 0);
    const q = new IdleTaskQue();
    q._que.push(task);
    sinon.stub(task, 'runTask');
    q._runTask(task);
    t.true(task.runTask.called);
});

test('_runTask should remove the task from the que if task.isRunOnce', (t) => {
    const task = new Task(() => {}, 0, { isRunOnce: true });
    const q = new IdleTaskQue();
    q._que.push(task);
    t.is(q._que.length, 1);
    q._runTask(task);
    t.is(q._que.length, 0);
});

test('_runTask should not remove the task from the que if not task.isRunOnce', (t) => {
    const task = new Task(() => {}, 0, { isRunOnce: false });
    const q = new IdleTaskQue();
    q._que.push(task);
    t.is(q._que.length, 1);
    q._runTask(task);
    t.is(q._que.length, 1);
});

test(
    '_idleCallback should invoke _runTask with the first task as long as there are tasks, deadline has timeRemaining and not didTimeout',
    (t) => {
        const deadline = {
            timeRemaining: () => 10,
            didTimeout: false,
        };
        const task1 = new Task(() => {}, 0, { isImmediate: false, isRunOnce: false });
        const task2 = new Task(() => {}, 0, { isImmediate: false, isRunOnce: false });
        const task3 = new Task(() => {}, 0, { isImmediate: false, isRunOnce: false });
        const q = new IdleTaskQue();
        sinon.stub(q, '_runTask');
        q._que.push(task1);
        q._que.push(task2);
        q._que.push(task3);
        t.is(q._runTask.callCount, 0);
        q._idleCallback(q._que, deadline);
        t.is(q._runTask.callCount, 3);
        t.is(q._runTask.args[0][0], task1);
        t.is(q._runTask.args[1][0], task2);
        t.is(q._runTask.args[2][0], task3);
    });

test(
    '_idleCallback should invoke _runNoTimeoutQue with remaining tasks once timeRemaining is not greater than zero',
    (t) => {
        const deadline = {
            timeRemaining: () => 10,
            didTimeout: false,
        };
        const task1 = new Task(() => {
            deadline.timeRemaining = () => 0;
        }, 0, { isImmediate: false, isRunOnce: false });
        const task2 = new Task(() => {}, 0, { isImmediate: false, isRunOnce: false });
        const task3 = new Task(() => {}, 0, { isImmediate: false, isRunOnce: false });
        const q = new IdleTaskQue();
        sinon.stub(q, '_runTask').callsFake(task => task._taskFn());
        sinon.stub(q, '_runNoTimeoutQue');
        q._que.push(task1);
        q._que.push(task2);
        q._que.push(task3);
        t.is(q._runTask.callCount, 0);
        q._idleCallback(q._que, deadline);
        t.is(q._runTask.callCount, 1);
        t.is(q._runTask.args[0][0], task1);
        t.true(q._runNoTimeoutQue.calledWith([task2, task3]));
    });

test(
    '_idleCallback should run through all tasks if didTimeout is true even if timeRemaining returns 0',
    (t) => {
        const deadline = {
            timeRemaining: () => 0,
            didTimeout: true,
        };
        const task1 = new Task(() => {}, 0, { isImmediate: false, isRunOnce: false });
        const task2 = new Task(() => {}, 0, { isImmediate: false, isRunOnce: false });
        const task3 = new Task(() => {}, 0, { isImmediate: false, isRunOnce: false });
        const q = new IdleTaskQue();
        sinon.stub(q, '_runTask').callsFake(task => task._taskFn());
        sinon.stub(q, '_runNoTimeoutQue');
        q._que.push(task1);
        q._que.push(task2);
        q._que.push(task3);
        t.is(q._runTask.callCount, 0);
        q._idleCallback(q._que, deadline);
        t.is(q._runTask.callCount, 3);
        t.false(q._runNoTimeoutQue.called);
    });

test(
    '_runNoTimeoutQue should invoke requestIdleCallback and in the callback call this._idleCallback',
    (t) => {
        const task = new Task(() => {}, 0, { isImmediate: false, isRunOnce: false });
        const q = new IdleTaskQue();
        sinon.stub(q, '_idleCallback');
        t.false(mockIdleFn.called);
        q._runNoTimeoutQue([task, task, task]);
        t.true(mockIdleFn.called);
        const cb = mockIdleFn.args[0][0];
        const deadline = {};
        cb(deadline);
        t.true(q._idleCallback.calledWith([task, task, task], deadline));
    });

test('_runTimeoutQue should invoke _runTask for each task', (t) => {
    const task = new Task(() => {}, 0, { isImmediate: false, isRunOnce: false });
    const task2 = new Task(() => {}, 0, { isImmediate: false, isRunOnce: false });
    const q = new IdleTaskQue();
    sinon.stub(q, '_runTask');
    q._runTimeoutQue([task, task, task2, task2]);
    t.is(q._runTask.callCount, 4);
    t.is(q._runTask.args[0][0], task);
    t.is(q._runTask.args[1][0], task);
    t.is(q._runTask.args[2][0], task2);
    t.is(q._runTask.args[3][0], task2);
});

test('run should invoke _getSeparatedLists', (t) => {
    const q = new IdleTaskQue();
    sinon.stub(q, '_getSeparatedLists').returns([[], []]);
    sinon.stub(q, '_runNoTimeoutQue');
    sinon.stub(q, '_runTimeoutQue');
    t.false(q._getSeparatedLists.called);
    q.run();
    t.true(q._getSeparatedLists.called);
});

test(
    'run should invoke _runNoTimeoutQue if _getSeparatedLists returns a list of tasks without timeout',
    (t) => {
        const q = new IdleTaskQue();
        sinon.stub(q, '_getSeparatedLists').returns([[1, 2], []]);
        sinon.stub(q, '_runNoTimeoutQue');
        sinon.stub(q, '_runTimeoutQue');
        t.false(q._runNoTimeoutQue.called);
        q.run();
        t.false(q._runTimeoutQue.called);
        t.true(q._runNoTimeoutQue.calledWith([1, 2]));
    });

test(
    'run should invoke _runTimeoutQue if _getSeparatedLists returns a list of tasks with timeout',
    (t) => {
        const q = new IdleTaskQue();
        sinon.stub(q, '_getSeparatedLists').returns([[], [1, 2]]);
        sinon.stub(q, '_runNoTimeoutQue');
        sinon.stub(q, '_runTimeoutQue');
        t.false(q._runTimeoutQue.called);
        q.run();
        t.false(q._runNoTimeoutQue.called);
        t.true(q._runTimeoutQue.calledWith([1, 2]));
    });

test('integration: all immediate tasks should run', async (t) => {
    let count = 0;
    const fn = () => count += 1;
    const q = new IdleTaskQue();
    // Default is isImmediate so they should all run without q.run();
    q.add(fn);
    q.add(fn);
    q.add(fn);
    t.plan(2);
    t.is(count, 0);
    function wait() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 100);
        });
    }

    await wait();
    t.is(count, 3);
});

test('integration: all immediate tasks should run', async (t) => {
    const fn = () => t.pass();
    const q = new IdleTaskQue();
    // Default is isImmediate so they should all run without q.run();
    q.add(fn);
    q.add(fn);
    q.add(fn);
    t.plan(4);
    function wait() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 100);
        });
    }

    await wait();
    t.pass();
});

test('integration: all immediate tasks should not be placed in que', async (t) => {
    let count = 0;
    const fn = () => count += 1;
    const q = new IdleTaskQue();
    // Default is isImmediate so they should all run without q.run();
    q.add(fn);
    q.add(fn);
    q.add(fn);
    t.is(q._que.length, 0);
});

test('integration: all tasks should run', async (t) => {
    mockIdleFn.callsFake((cb) => {
        cb({ timeRemaining: () => 10 });
    });
    let count = 0;
    const fn = () => count += 1;
    const q = new IdleTaskQue();
    // Default is isImmediate so they should all run without q.run();
    q.add(fn);
    q.add(fn, { timeout: 10, isRunOnce: true });
    q.add(fn, { isRunOnce: false, isImmediate: false });
    q.add(fn, { isRunOnce: false, isImmediate: false });
    q.add(fn, { isRunOnce: false, isImmediate: false });
    q.add(fn, { timeout: 40, isRunOnce: false, isImmediate: false });
    q.run();
    function wait() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 100);
        });
    }

    await wait();
    t.is(count, 6);
});