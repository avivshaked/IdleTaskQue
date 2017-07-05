import test from 'ava';
import proxyquire from 'proxyquire';
import sinon from 'sinon';

const mockIdleFn = sinon.stub();
const Task = proxyquire.noCallThru()(
    './Task',
    {
        './requestIdleCallback': { requestIdleCallback: mockIdleFn },
    },
).default;

test('constructor should create an instance', (t) => {
    const someFn = () => {};
    const context = { some: 'context' };
    const binding = { some: 'binding' };
    const someOptions = {
        context,
        binding,
        isRunOnce: false,
    };
    const task = new Task(someFn, 3, someOptions);
    t.true(task instanceof Task);
    t.is(task._taskFn, someFn);
    t.is(task._id, 3);
    t.is(task._context, context);
    t.is(task._binding, binding);
});

test('contructor should invoke _validateConstructorArguments', (t) => {
    const someFn = () => {};
    const context = { some: 'context' };
    const binding = { some: 'binding' };
    const someOptions = {
        context,
        binding,
        isRunOnce: false,
    };
    sinon.stub(Task, '_validateConstructorArguments');
    new Task(someFn, 3, someOptions); // eslint-disable-line
    t.true(Task._validateConstructorArguments.calledWith(someFn, 3, someOptions));
    Task._validateConstructorArguments.restore();
});

test('_validateConstructorArguments should throw if taskFn arg is not a function', (t) => {
    const fn = () => {
        Task._validateConstructorArguments('not a function', 0, {});
    };

    const error = t.throws(fn, TypeError);
    t.is(error.message, 'taskFn argument must be a function.');
});

test('_validateConstructorArguments should throw if id arg is not a number', (t) => {
    const fn = () => {
        Task._validateConstructorArguments(() => {}, 'not a number', {});
    };

    const error = t.throws(fn, TypeError);
    t.is(error.message, 'id argument must be a number.');
});

test('_validateConstructorArguments should throw if options arg is not a n object', (t) => {
    const fn = () => {
        Task._validateConstructorArguments(() => {}, 0, 'not an object');
    };

    const error = t.throws(fn, TypeError);
    t.is(error.message, 'options argument must be an object.');
});

test(
    '_validateConstructorArguments should throw if timeout property exists in options arg but is not a number',
    (t) => {
        const fn = () => {
            Task._validateConstructorArguments(() => {}, 0, { timeout: 'not a number' });
        };

        const error = t.throws(fn, TypeError);
        t.is(error.message, 'options.timeout must be a number.');
    });

test('_validateConstructorArguments should not throw if all arguments are the right type', (t) => {
    const fn = () => {
        Task._validateConstructorArguments(() => {}, 0, { timeout: 500 });
    };

    t.notThrows(fn);
});

test('_fireTaskFn should invoke _taskFn with _context as argument and _binding as calling site',
    (t) => {
        const taskFn = sinon.spy(); // eslint-disable-line func-names
        const binding = { some: 'object to bind' };
        const context = { some: 'object as context' };
        const task = new Task(taskFn, 0, { context, binding, timeout: 500, isRunOnce: true });
        task._fireTaskFn();
        t.true(taskFn.calledWith(context));
        t.is(taskFn.thisValues[0], binding);
    });

test('_fireTaskFn should nullify _taskFn if isRunOnce is true',
    (t) => {
        const taskFn = sinon.spy(); // eslint-disable-line func-names
        const binding = { some: 'object to bind' };
        const context = { some: 'object as context' };
        const task = new Task(taskFn, 0, { context, binding, timeout: 500, isRunOnce: true });
        task._fireTaskFn();
        t.is(task._taskFn, null);
    });

test('runTask should invoke _fireTaskFn if the task has no timeout', (t) => {
    const task = new Task(() => {}, 0);
    sinon.stub(task, '_fireTaskFn');
    task.runTask();
    t.true(task._fireTaskFn.called);
});

test('runTask should not invoke requestIdleCallback if the task has no timeout', (t) => {
    const task = new Task(() => {}, 0);
    task.runTask();
    t.true(mockIdleFn.notCalled);
});

test('runTask should not invoke _fireTaskFn if the task has no timeout', (t) => {
    const task = new Task(() => {}, 0, { timeout: 1000 });
    sinon.stub(task, '_fireTaskFn');
    task.runTask();
    t.true(task._fireTaskFn.notCalled);
});

test('runTask should invoke requestIdleCallback if the task has no timeout', (t) => {
    const task = new Task(() => {}, 0, { timeout: 1000, isRunOnce: false });
    task.runTask();
    t.true(mockIdleFn.calledWith(task._fireTaskFn));
    t.deepEqual(mockIdleFn.args[0][1], { timeout: 1000 });
});

test('runTaskOnIdle should use the instance\'s requestIdleCallback', (t) => {
    const cbMock = sinon.stub();
    const task1 = new Task(() => {}, 0,
        { timeout: 1000, isRunOnce: false, requestIdleCallback: cbMock });
    mockIdleFn.reset();
    t.false(cbMock.called);
    t.false(mockIdleFn.called);
    task1.runTaskOnIdle();
    t.true(cbMock.called);
    t.false(mockIdleFn.called);

    cbMock.reset();
    mockIdleFn.reset();
    const task2 = new Task(() => {}, 0,
        { timeout: 1000, isRunOnce: false });
    t.false(cbMock.called);
    t.false(mockIdleFn.called);
    task2.runTaskOnIdle();
    t.false(cbMock.called);
    t.true(mockIdleFn.called);
});