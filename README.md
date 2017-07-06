# IdleTaskQue
A task manager that utilizes requestIdleCallback api to run tasks safely on the browser.

[![Build Status](https://travis-ci.org/avivshaked/IdleTaskQue.svg?branch=master)](https://travis-ci.org/avivshaked/IdleTaskQue)


From [Using requestIdleCallback](https://developers.google.com/web/updates/2015/08/using-requestidlecallback) by [Paul Lewis](https://developers.google.com/web/resources/contributors#paullewis):

>Many sites and apps have a lot of scripts to execute. Your JavaScript often needs to be run as soon as possible, but at the same time you don’t want it to get in the user’s way. If you send analytics data when the user is scrolling the page, or you append elements to the DOM while they happen to be tapping on the button, your web app can become unresponsive, resulting in a poor user experience.

IdleTaskQue uses requestIdleCallback api to mitigate the issues mentioned above. It also provides a shim fallback for agents that do not have that api. It is a list of tasks, that executes the tasks with ideally minimal impact to the user experience,

## Contents
- [How to include](#how-to-include)
  - [Include script](#include-script)
  - [Include with commonjs](#include-with-commonjs)
- [How to use](#how-to-use)
  - [Adding Tasks](#adding-tasks)
  - [Adding immediate tasks](#adding-immediate-tasks)
  - [Adding non immediate tasks](#adding-non-immediate-tasks)
  - [Executing the que](#executing-the-que)
  - [Removing a task](#removing-a-task)
  - [Clearing the que](#clearing-the-que)
  - [Flushing the que](#flushing-the-que)
  - [Different requestIdleCallback implementation](#different-requestidlecallback-implementation)
- [API](#api)
  - [Task](#task)
  - [IdleTaskQue](#idletaskque)
  - [Module](#module)
## How to include
First you need to install.
```bash
npm install --save idle-task-que
```
<br>

You can include in one of two ways:
### Include script
Use a script tag. Including as a script tag will place `IdleTaskQue` object on the window object.
 ```html
  <script src="/node_modules/idle-task-que/dist/inde.min.js"></script>
 ```
Make sure to include the min file, as it is the one that exposes `IdleTaskQue` on the window object. Referencing the unminified file requires commonjs support.

To create a new instance of the que:
```js
const que = IdleTaskQue.create();
```
If you want to access the constructor directly, you can use it like this (though you shouldn't)
```js
const que = new IdleTaskQue.default();
```
<br/>

### Include with commonjs
Use commonjs pattern to include.
```js
import IdleTaskQue from 'idle-task-que';

const que = new IdleTaskQue();
```
Or
```js
import { createIdleTaskQue } from 'idle-task-que';

const que = createIdleTaskQue();
```
## How to use
### Adding tasks
Import the que factory (you can import the constructor and use the new keyword as well), create a new que, and use the **add** method.
Under the hood, a new Task instance is created and either directly executed via **runTaskOnIdle** method on the instance, or it is added to the que and executed later.
```js
import { createIdleTaskQue } from 'idle-task-que';

const que = createIdleTaskQue();

que.add(taskFunction1, options1);
que.add(taskFunction2, options2);
que.add(taskFunction3);
```
The **add** method returns an integer that is the id of the task for that que. It can be later used to remove the task from the que.

The **add** method accepts two arguments. The first argument is a function. The second argument is an optional options object.

The *options* object contains:
* *context*: [optional] anything. defaults to empty literal object. This value is passed as the first (and only) argument to the task function when it is invoked.
* *binding*: [optional] anything. defaults to empty literal object. This value will be used as the calling site for the task function. If the task function is unbound, and `this` reference will refer to this value.
* *timeout*: [optional] number. Defaults to 0. This value is passed to requestIdleCallback api. When the value is greater then 0, the api will try and fire the task function before the timeout expires.
* *isRunOnce*: [optional] boolean. Defaults to true. If this value is true, once the task function is executed, it will be removed from the que. If the value is false, the task function will be executed every time **run** method is executed.
* *isImmediate*: [optional] boolean. Defaults to true. If this value is true, the task will go directly to execution on idle frame. This is useful for ad hoc tasks that can be deferred to later. A good example for this is tracking.
 If the value is false, the task will be added to a que that will only be executed when the **run** method is called. This is useful for example for listeners callbacks.
* *requestIdleCallback*: [optional] function. Defaults to native requestIdleCallback or the provided shim. This property should be populated if you want to supply a different shim for requestIdleCallback.
### Adding immediate tasks
Immediate tasks are function that should be executed as soon as there's an idle frame.
```js
import { createIdleTaskQue } from 'idle-task-que';

const que = createIdleTaskQue();

// Because of the defaults, isImmediate and isRunOnce are set to true.
// The taskFunction will be executed as soon as there's an idle frame.
que.add(taskFunction);
```
### Adding non immediate tasks
Non immediate tasks are functions that should be executed at a later stage, when there's an idle frame. A good example for this is scroll listener callbacks.
The functions will be executed when **run** method is called.
```js
import { createIdleTaskQue } from 'idle-task-que';

const que = createIdleTaskQue();

que.add(taskFunction1, { isImmediate: false, isRunOnce: false });
que.add(taskFunction2, { isImmediate: false, isRunOnce: false });
que.add(taskFunction3, { isImmediate: false, isRunOnce: false });

window.addEventListener('scroll', que.run);
```
Is is worth mentioning that scroll listeners should be throttled, even when using IdleTaskQue.
### Executing the que
To execute the tasks registered in a que, simply call **run** method.
```js
import { createIdleTaskQue } from 'idle-task-que';

const que = createIdleTaskQue();

que.add(taskFunction1, { isImmediate: false, isRunOnce: false });
que.add(taskFunction2, { isImmediate: false, isRunOnce: false });
que.add(taskFunction3, { isImmediate: false, isRunOnce: false });

que.run();
```
The run method is bound to the instance, so it can be passed safely as a callback.
```js
import { createIdleTaskQue } from 'idle-task-que';

const que = createIdleTaskQue();

que.add(taskFunction1, { isImmediate: false, isRunOnce: false });
que.add(taskFunction2, { isImmediate: false, isRunOnce: false });
que.add(taskFunction3, { isImmediate: false, isRunOnce: false });

window.addEventListener('scroll', que.run);
```

### Removing a task
There are two ways to remove a task. The first way is to use the task function as an identifier.
```js
import { createIdleTaskQue } from 'idle-task-que';

const que = createIdleTaskQue();

que.add(taskFunction1, { isImmediate: false, isRunOnce: false });
que.add(taskFunction2, { isImmediate: false, isRunOnce: false });
que.add(taskFunction3, { isImmediate: false, isRunOnce: false });

que.remove(taskFunction2);
```
The remove method goes through all the registered tasks, and removes all tasks that use that task function.
Another caveat worth mentioning is that it is not possible to remove immediate tasks, because they are not registered to the que for later execution.

The second way to remove a task function from the que is to use the id that is returned when you add a task.
```js
import { createIdleTaskQue } from 'idle-task-que';

const que = createIdleTaskQue();

const id = que.add(taskFunction, { isImmediate: false, isRunOnce: false });

que.removeById(id);
```
### Clearing the que
If for some reason you need to remove all the tasks from the que, use the **clear** method.
```js
import { createIdleTaskQue } from 'idle-task-que';

const que = createIdleTaskQue();

que.add(taskFunction1, { isImmediate: false, isRunOnce: false });
que.add(taskFunction2, { isImmediate: false, isRunOnce: false });
que.add(taskFunction3, { isImmediate: false, isRunOnce: false });

que.clear();
que.run(); // <- nothing happens because all tasks have been cleared.
```
### Flushing the que
If you need to execute all the tasks immediately and do not want to wait for an idle frame, use the **flush** method.
```js
import { createIdleTaskQue } from 'idle-task-que';

const que = createIdleTaskQue();

que.add(taskFunction1, { isImmediate: false, isRunOnce: false });
que.add(taskFunction2, { isImmediate: false, isRunOnce: false });
que.add(taskFunction3, { isImmediate: false, isRunOnce: false });

que.flush();
```
The flush method will run all the tasks immediately, and clear the que. A good use case for this might be on beforeunload event.
The flush method is bound to the instance, so it can be passed safely as a callback.
### Different requestIdleCallback implementation
You might want to provide a different shim than the one shipped with this library. The current shim does very little and is mostly there to prevent the library from breaking in agents that do not support requestIdleCallback.
A good example of a more complicated shim is [PixelsCommander/requestIdleCallback-polyfill](https://github.com/PixelsCommander/requestIdleCallback-polyfill). This library does much more and prevents operation from being executed while user performing some actions on interface.
To Use this polyfill you can consume it before consuming IdleTaskQue. The library will place the polyfill on the global object, and that will be used by IdleTaskQue.
Make sure to place it before consuming IdleTaskQue, otherwise the polyfill will not take effect.

Another way to set a different implementation of requestIdleCallback is to provide your own function to the constructor.
```js
import { createIdleTaskQue } from 'idle-task-que';

const que = new IdleTaskQue({ requestIdleCallback: yourOwnImplementation });
```

There's a third way of providing your own implementation. It can be done when adding a new task.
```js
import { createIdleTaskQue } from 'idle-task-que';

const que = createIdleTaskQue();

que.add(taskFunction, { requestIdleCallback: yourOwnImplementation });
```
The alternate implementation will only take effect in the execution of that particular task.

Don't forget to bind your implementation if it has internal references to `this`.

# API
## Task
Ideally you should not use Task directly. IdleTaskQue will create a new task every time an **add** is being called on an instance.
If however you find you want to use Task directly, this is it's api.
### new Task(taskFn, id[, options])
Creates a new instance.

**Arguments:**
* taskFn: Function. This is the function that will be executed by the Task.
* id: number. There are no restrictions on the number.
* options: Object [optional].
  * *context*: [optional] anything. defaults to empty literal object. This value is passed as the first (and only) argument to the task function when it is invoked.
  * *binding*: [optional] anything. defaults to empty literal object. This value will be used as the calling site for the task function. If the task function is unbound, and `this` reference will refer to this value.
  * *timeout*: [optional] number. Defaults to 0. This value is passed to requestIdleCallback api. When the value is greater then 0, the api will try and fire the task function before the timeout expires.
  * *isRunOnce*: [optional] boolean. Defaults to true. If this value is true, once the task function is executed, the registered task function will be nullified. If the value is false, the task function will be executed every time **runTask** method is executed.
  * *isImmediate*: [optional] boolean. Defaults to true. This property is irrelevant for the Task instance.
  * *requestIdleCallback*: [optional] function. Defaults to native requestIdleCallback or the provided shim. This property should be populated if you want to supply a different shim for requestIdleCallback.

**returns:**
An instance of Task.

### runTask()
Executes the registered function. The task will either be executed using requestIdleCallback if the instance has timeout that is greater than zero, or executed directly if timeout is zero.
The task function will be executed with the the instance's binding as the calling site, and the instance's context will be passed as the first and only argument to the task.
### RunTaskOnIdle()
Executes the registered function. The task will be executed using requestIdleCallback event if the instance's timeout is zero.
The task function will be executed with the the instance's binding as the calling site, and the instance's context will be passed as the first and only argument to the task.
### flush()
Executes the registered function immediately without waiting for an idle frame. It also nullifies the task function. Once this method is used, any additional runTask, runTaskOnIdle, and flush executions will have no effect.
### isTaskFunction(taskFn)
Returns true if the received function is equal to the registered function.

**Arguments:**
* taskFn: Function.

**Returns:**

Boolean.
### setRunOnce(state)
**arguments:**
* state: boolean. If true will set the registered task function to run once. If false will set the registered function to run multiple times.
### (Property) timeout: number
Returns the timeout value.
### (Property) isRunOnce: boolean
Returns the value of isRunOnce.
### (Property) isImmediate: boolean
Returns the value of isImmediate.
### (Property) id: number
Returns the value of id.
## IdleTaskQue
This constructor is the main tool of this library. Most actions will be done with an instance of this constructor.
### new IdleTaskQue([config])
Returns an instance of IdleTaskQue.

**Arguments:**
* config: Object [optional].
  * requestIdleCallback: Function. Should comply with requestIdleCallback API.

**Returns:**

An instance of IdleTaskQue.

### add(taskFn[ ,options])
Adds a task function to the que.

**Arguments:**
* taskFn: Function. This function will be used to create a new Task. The task instance will be registered or executed.
* options: Object [optional].
  * *context*: [optional] anything. defaults to empty literal object. This value is passed as the first (and only) argument to the task function when it is invoked.
  * *binding*: [optional] anything. defaults to empty literal object. This value will be used as the calling site for the task function. If the task function is unbound, and `this` reference will refer to this value.
  * *timeout*: [optional] number. Defaults to 0. This value is passed to requestIdleCallback api. When the value is greater then 0, the api will try and fire the task function before the timeout expires.
  * *isRunOnce*: [optional] boolean. Defaults to true. If this value is true, once the task function is executed, it will be removed from the que. If the value is false, the task function will be executed every time **run** method is executed.
  * *isImmediate*: [optional] boolean. Defaults to true. If this value is true, the task will go directly to execution on idle frame. This is useful for ad hoc tasks that can be deferred to later. A good example for this is tracking.
 If the value is false, the task will be added to a que that will only be executed when the **run** method is called. This is useful for example for listeners callbacks.
  * *requestIdleCallback*: [optional] function. Defaults to native requestIdleCallback or the provided shim. This property should be populated if you want to supply a different shim for requestIdleCallback.

**Returns:**

An in id number. That id can be used later to remove the registered task.

### run()
Executes all the registered tasks using requestIdleCallback.

### remove(taskFn)
Removes all the tasks from the que that have that function.

**Arguments:**
* taskFn: Function.

### removeById(taskId)
Removes a task from the que. The task must have an id that is equal to the received taskId.

**Arguments:**
* taskId: number.

**Returns:**

Boolean. True if the task was successfully removed. False if the task was not found.

### clear()
Removes all tasks from the que without executing them.

### flush()
Executes all the tasks immediately and removes them from the que.

## Module
These are the exports of the module:
### default
This is the IdleTaskQue constructor.
### requestIdleCallback
This exposes as a bound function either the native implementation or the default used shim.
### cancelIdleCallback
This exposes as a bound function either the native implementation or the default used shim.
### createIdleTaskQue
A factory method that is used to create new IdleTaskQue instances. The function signature is the same as the IdleTaskQue constructor, but the `new` keyword is not used.
### create (alias for createIdleTaskQue)
A factory method that is used to create new IdleTaskQue instances. The function signature is the same as the IdleTaskQue constructor, but the `new` keyword is not used.