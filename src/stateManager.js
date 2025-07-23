class StateManager {
  constructor(initialState = {}) {
    this.state = initialState;
    this.initialState = { ...initialState };
    this.listeners = [];
    this.middlewares = [];
    this.eventListeners = {};
    this.undoStack = [];
    this.redoStack = [];
    this.prevState = { ...initialState };

    this.debounceTimeout = null;
    this.debounceDelay = 200;
    this.batchUpdatePending = false;
    this.batchUpdateQueue = [];

    this.deepStateComparison = false;
    this.localStorageKey = '1cbycStateManagerState';
    this.initializeStateFromLocalStorage();

    this.errorHandler = null;
  }

  getState() {
    return this.deepStateComparison
      ? JSON.parse(JSON.stringify(this.state))
      : { ...this.state };
  }

  async setState(newState, addToUndoStack = true, debounce = false) {
    try {
      const nextState = this.deepStateComparison
        ? JSON.parse(JSON.stringify(newState))
        : { ...newState };

      if (debounce) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(async () => {
          await this.applyStateUpdate(nextState, addToUndoStack);
        }, this.debounceDelay);
      } else {
        await this.applyStateUpdate(nextState, addToUndoStack);
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  async applyStateUpdate(nextState, addToUndoStack) {
    try {
      await this.applyMiddlewares(this.prevState, nextState);

      if (addToUndoStack) {
        this.undoStack.push(
          this.deepStateComparison
            ? JSON.parse(JSON.stringify(this.state))
            : { ...this.state }
        );
        this.redoStack = [];
      }

      this.prevState = this.deepStateComparison
        ? JSON.parse(JSON.stringify(this.state))
        : { ...this.state };

      this.state = nextState;
      this.notifyListeners();
      this.persistStateToLocalStorage();
    } catch (err) {
      this.handleError(err);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  on(eventName, callback) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(callback);

    return () => {
      this.eventListeners[eventName] = this.eventListeners[eventName].filter(
        (cb) => cb !== callback
      );
    };
  }

  applyMiddleware(middleware, options = { selective: false }) {
    this.middlewares.push({ middleware, enabled: true, options });
  }

  async applyMiddlewares(prevState, nextState) {
    const enabledMiddlewares = this.middlewares
      .filter((m) => m.enabled)
      .map((m) => m.middleware);

    for (const middleware of enabledMiddlewares) {
      try {
        await middleware(prevState, nextState);
      } catch (error) {
        this.handleError(error);
      }
    }
  }

  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getState());
      } catch (err) {
        this.handleError(err);
      }
    });

    Object.keys(this.eventListeners).forEach((eventName) => {
      if (this.state[eventName] !== undefined) {
        this.eventListeners[eventName].forEach((callback) => {
          try {
            callback(this.state[eventName]);
          } catch (err) {
            this.handleError(err);
          }
        });
      }
    });
  }

  async resetState() {
    const prevState = this.deepStateComparison
      ? JSON.parse(JSON.stringify(this.state))
      : { ...this.state };
    
    this.state = this.deepStateComparison
      ? JSON.parse(JSON.stringify(this.initialState))
      : { ...this.initialState };

    this.prevState = this.deepStateComparison
      ? JSON.parse(JSON.stringify(this.initialState))
      : { ...this.initialState };
    
    await this.applyMiddlewares(prevState, this.state);
    this.notifyListeners();
    this.persistStateToLocalStorage();
  }

  async setStateAsync(newState, addToUndoStack = true) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      this.setState(newState, addToUndoStack);
    } catch (err) {
      this.handleError(err);
    }
  }

  undo() {
    if (this.undoStack.length > 0) {
      const prevState = this.undoStack.pop();
      this.redoStack.push(
        this.deepStateComparison
          ? JSON.parse(JSON.stringify(this.state))
          : { ...this.state }
      );
      this.state = prevState;
      this.notifyListeners();
      this.persistStateToLocalStorage();
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const nextState = this.redoStack.pop();
      this.undoStack.push(
        this.deepStateComparison
          ? JSON.parse(JSON.stringify(this.state))
          : { ...this.state }
      );
      this.state = nextState;
      this.notifyListeners();
      this.persistStateToLocalStorage();
    }
  }

  async mergeState(partialState) {
    try {
      const nextState = this.deepStateComparison
        ? JSON.parse(JSON.stringify({ ...this.state, ...partialState }))
        : { ...this.state, ...partialState };
      
      await this.applyMiddlewares(this.prevState, nextState);
      this.prevState = this.deepStateComparison
        ? JSON.parse(JSON.stringify(this.state))
        : { ...this.state };

      this.state = nextState;
      this.notifyListeners();
      this.persistStateToLocalStorage();
    } catch (err) {
      this.handleError(err);
    }
  }

  async patchState(partialState) {
    try {
      const nextState = this.deepStateComparison
        ? JSON.parse(JSON.stringify({ ...this.state, ...partialState }))
        : { ...this.state, ...partialState };
      
      await this.applyMiddlewares(this.prevState, nextState);
      this.prevState = this.deepStateComparison
        ? JSON.parse(JSON.stringify(this.state))
        : { ...this.state };
      
      this.state = nextState;
      this.notifyListeners();
      this.persistStateToLocalStorage();
    } catch (err) {
      this.handleError(err);
    }
  }

  triggerEvent(eventName, eventData) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach((callback) => {
        try {
          callback(eventData);
        } catch (err) {
          this.handleError(err);
        }
      });
    }
  }

  setDebounce(delay) {
    this.debounceDelay = delay;
  }

  startBatchUpdate() {
    this.batchUpdatePending = true;
    this.batchUpdateQueue = [];
  }

  async endBatchUpdate() {
    this.batchUpdatePending = false;
    if (this.batchUpdateQueue.length > 0) {
      const nextState = Object.assign({}, ...this.batchUpdateQueue);
      this.batchUpdateQueue = [];
      await this.setState(nextState);
    }
  }

  async queueBatchUpdate(partialState) {
    if (this.batchUpdatePending) {
      this.batchUpdateQueue.push(partialState);
    } else {
      await this.mergeState(partialState);
    }
  }

  enableDeepStateComparison() {
    this.deepStateComparison = true;
  }

  disableDeepStateComparison() {
    this.deepStateComparison = false;
  }

  setLocalStorageKey(key) {
    this.localStorageKey = key;
  }

  persistStateToLocalStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.localStorageKey, JSON.stringify(this.state));
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  initializeStateFromLocalStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const storedState = localStorage.getItem(this.localStorageKey);
        if (storedState) {
          this.state = JSON.parse(storedState);
          this.prevState = JSON.parse(storedState);
        }
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  setErrorHandler(handler) {
    this.errorHandler = handler;
  }

  handleError(err) {
    if (this.errorHandler) {
      this.errorHandler(err);
    } else {
      console.error('1cbyc State Manager Error:', err);
    }
  }

  getUndoStackSize() {
    return this.undoStack.length;
  }

  getRedoStackSize() {
    return this.redoStack.length;
  }

  clearHistory() {
    this.undoStack = [];
    this.redoStack = [];
  }

  getMiddlewareCount() {
    return this.middlewares.length;
  }

  getListenerCount() {
    return this.listeners.length;
  }

  getEventListenerCount(eventName) {
    return this.eventListeners[eventName] ? this.eventListeners[eventName].length : 0;
  }

  removeAllListeners() {
    this.listeners = [];
  }

  removeAllEventListeners(eventName) {
    if (eventName) {
      this.eventListeners[eventName] = [];
    } else {
      this.eventListeners = {};
    }
  }

  removeAllMiddlewares() {
    this.middlewares = [];
  }

  enableMiddleware(index) {
    if (this.middlewares[index]) {
      this.middlewares[index].enabled = true;
    }
  }

  disableMiddleware(index) {
    if (this.middlewares[index]) {
      this.middlewares[index].enabled = false;
    }
  }

  getStateSnapshot() {
    return {
      state: this.getState(),
      undoStackSize: this.getUndoStackSize(),
      redoStackSize: this.getRedoStackSize(),
      middlewareCount: this.getMiddlewareCount(),
      listenerCount: this.getListenerCount(),
      deepStateComparison: this.deepStateComparison,
      localStorageKey: this.localStorageKey
    };
  }
}

export default StateManager; 