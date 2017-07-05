# IdleTaskQue
A task manager that utilizes requestIdleCallback api to run tasks safely on the browser.

From [Using requestIdleCallback](https://developers.google.com/web/updates/2015/08/using-requestidlecallback) by [Paul Lewis](https://developers.google.com/web/resources/contributors#paullewis):

>Many sites and apps have a lot of scripts to execute. Your JavaScript often needs to be run as soon as possible, but at the same time you don’t want it to get in the user’s way. If you send analytics data when the user is scrolling the page, or you append elements to the DOM while they happen to be tapping on the button, your web app can become unresponsive, resulting in a poor user experience.

IdleTaskQue uses requestIdleCallback api to mitigate the issues mentioned above. It also provides a shim fallback for agents that do not have that api. It is a list of tasks, that executes the tasks with ideally minimal impact to the user experience,

## Contents
- [How to include](#how-to-include)

## How to include
You can include in one of two ways:

---
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

---
Use commonjs pattern to include.
```js
import IdleTaskQue from 'idle-task-que';

const que = new IdleTaskQue();
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

### Removing a task from the que
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
