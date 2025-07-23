import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { StateManager, PersistenceMiddleware } from '../src/index.js';
import { promises as fs } from 'fs';

describe('StateManager', () => {
  let store;

  beforeEach(() => {
    store = new StateManager();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('Basic State Management', () => {
    it('should initialize with empty state', () => {
      expect(store.getState()).to.deep.equal({});
    });

    it('should initialize with provided state', () => {
      const initialState = { count: 0, name: 'test' };
      const customStore = new StateManager(initialState);
      expect(customStore.getState()).to.deep.equal(initialState);
    });

    it('should set and get state correctly', async () => {
      const newState = { count: 1, name: 'updated' };
      await store.setState(newState);
      expect(store.getState()).to.deep.equal(newState);
    });

    it('should merge state correctly', async () => {
      await store.setState({ count: 1, name: 'test' });
      await store.mergeState({ count: 2 });
      expect(store.getState()).to.deep.equal({ count: 2, name: 'test' });
    });

    it('should patch state correctly', async () => {
      await store.setState({ count: 1, name: 'test' });
      await store.patchState({ count: 2 });
      expect(store.getState()).to.deep.equal({ count: 2, name: 'test' });
    });
  });

  describe('Subscription System', () => {
    it('should subscribe and notify listeners on state change', async () => {
      let callbackCalled = false;
      let receivedState = null;

      const unsubscribe = store.subscribe((state) => {
        callbackCalled = true;
        receivedState = state;
      });

      await store.setState({ count: 1 });
      expect(callbackCalled).to.be.true;
      expect(receivedState).to.deep.equal({ count: 1 });

      unsubscribe();
    });

    it('should allow multiple subscriptions', async () => {
      let callCount = 0;
      
      store.subscribe(() => callCount++);
      store.subscribe(() => callCount++);
      
      await store.setState({ count: 1 });
      expect(callCount).to.equal(2);
    });

    it('should unsubscribe correctly', async () => {
      let callCount = 0;
      
      const unsubscribe = store.subscribe(() => callCount++);
      await store.setState({ count: 1 });
      expect(callCount).to.equal(1);
      
      unsubscribe();
      await store.setState({ count: 2 });
      expect(callCount).to.equal(1);
    });
  });

  describe('Event System', () => {
    it('should handle custom events', () => {
      let eventData = null;
      
      store.on('userLogin', (data) => {
        eventData = data;
      });

      store.triggerEvent('userLogin', { userId: 123, name: 'John' });
      expect(eventData).to.deep.equal({ userId: 123, name: 'John' });
    });

    it('should handle multiple event listeners', () => {
      let callCount = 0;
      
      store.on('test', () => callCount++);
      store.on('test', () => callCount++);
      
      store.triggerEvent('test', {});
      expect(callCount).to.equal(2);
    });

    it('should unsubscribe from events', () => {
      let callCount = 0;
      
      const unsubscribe = store.on('test', () => callCount++);
      store.triggerEvent('test', {});
      expect(callCount).to.equal(1);
      
      unsubscribe();
      store.triggerEvent('test', {});
      expect(callCount).to.equal(1);
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should support undo operations', async () => {
      await store.setState({ count: 1 });
      await store.setState({ count: 2 });
      
      store.undo();
      expect(store.getState()).to.deep.equal({ count: 1 });
    });

    it('should support redo operations', async () => {
      await store.setState({ count: 1 });
      await store.setState({ count: 2 });
      store.undo();
      store.redo();
      
      expect(store.getState()).to.deep.equal({ count: 2 });
    });

    it('should clear redo stack on new state change', async () => {
      await store.setState({ count: 1 });
      await store.setState({ count: 2 });
      store.undo();
      await store.setState({ count: 3 });
      
      expect(store.getRedoStackSize()).to.equal(0);
    });

    it('should handle undo with no history', () => {
      store.undo();
      expect(store.getState()).to.deep.equal({});
    });

    it('should handle redo with no history', () => {
      store.redo();
      expect(store.getState()).to.deep.equal({});
    });
  });

  describe('Middleware System', () => {
    it('should apply middleware correctly', async () => {
      let middlewareCalled = false;
      let middlewareData = null;
      
      const middleware = (prevState, nextState) => {
        middlewareCalled = true;
        middlewareData = { prevState, nextState };
      };

      store.applyMiddleware(middleware);
      await store.setState({ count: 1 });
      
      expect(middlewareCalled).to.be.true;
      expect(middlewareData.prevState).to.deep.equal({});
      expect(middlewareData.nextState).to.deep.equal({ count: 1 });
    });

    it('should handle multiple middleware', async () => {
      let callCount = 0;
      
      const middleware1 = () => callCount++;
      const middleware2 = () => callCount++;
      
      store.applyMiddleware(middleware1);
      store.applyMiddleware(middleware2);
      await store.setState({ count: 1 });
      
      expect(callCount).to.equal(2);
    });

    it('should handle async middleware', async () => {
      let resolved = false;
      
      const asyncMiddleware = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        resolved = true;
      };

      store.applyMiddleware(asyncMiddleware);
      await store.setState({ count: 1 });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(resolved).to.be.true;
    });
  });

  describe('Debouncing', () => {
    it('should debounce state updates', (done) => {
      let updateCount = 0;
      
      store.subscribe(() => updateCount++);
      store.setDebounce(50);
      
      store.setState({ count: 1 }, true, true);
      store.setState({ count: 2 }, true, true);
      store.setState({ count: 3 }, true, true);
      
      setTimeout(() => {
        expect(updateCount).to.equal(1);
        expect(store.getState()).to.deep.equal({ count: 3 });
        done();
      }, 100);
    });
  });

  describe('Batch Updates', () => {
    it('should handle batch updates', async () => {
      let updateCount = 0;
      
      store.subscribe(() => updateCount++);
      
      store.startBatchUpdate();
      await store.queueBatchUpdate({ count: 1 });
      await store.queueBatchUpdate({ name: 'test' });
      await store.endBatchUpdate();
      
      expect(updateCount).to.equal(1);
      expect(store.getState()).to.deep.equal({ count: 1, name: 'test' });
    });
  });

  describe('Deep State Comparison', () => {
    it('should enable deep state comparison', async () => {
      store.enableDeepStateComparison();
      await store.setState({ nested: { value: 1 } });
      
      const state = store.getState();
      state.nested.value = 2;
      
      expect(store.getState().nested.value).to.equal(1);
    });

    it('should disable deep state comparison', async () => {
      store.disableDeepStateComparison();
      await store.setState({ nested: { value: 1 } });
      
      const state = store.getState();
      state.nested.value = 2;
      
      expect(store.getState().nested.value).to.equal(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      let errorCaught = false;
      
      store.setErrorHandler((_error) => {
        errorCaught = true;
      });

      const middleware = () => {
        throw new Error('Middleware error');
      };
      
      store.applyMiddleware(middleware);
      await store.setState({ count: 1 });
      expect(errorCaught).to.be.true;
    });

    it('should handle listener errors', async () => {
      let errorCaught = false;
      
      store.setErrorHandler((_error) => {
        errorCaught = true;
      });

      store.subscribe(() => {
        throw new Error('Listener error');
      });

      await store.setState({ count: 1 });
      expect(errorCaught).to.be.true;
    });
  });

  describe('Utility Methods', () => {
    it('should provide state snapshot', async () => {
      await store.setState({ count: 1 });
      store.applyMiddleware(() => {
        // Empty middleware for testing
      });
      store.subscribe(() => {});
      
      const snapshot = store.getStateSnapshot();
      expect(snapshot.state).to.deep.equal({ count: 1 });
      expect(snapshot.middlewareCount).to.equal(1);
      expect(snapshot.listenerCount).to.equal(1);
    });

    it('should clear history', async () => {
      await store.setState({ count: 1 });
      await store.setState({ count: 2 });
      store.undo();
      
      store.clearHistory();
      expect(store.getUndoStackSize()).to.equal(0);
      expect(store.getRedoStackSize()).to.equal(0);
    });

    it('should remove all listeners', () => {
      store.subscribe(() => {
        // Empty listener for testing
      });
      store.subscribe(() => {
        // Empty listener for testing
      });
      
      store.removeAllListeners();
      expect(store.getListenerCount()).to.equal(0);
    });

    it('should remove all event listeners', () => {
      store.on('test', () => {
        // Empty event listener for testing
      });
      store.on('test', () => {
        // Empty event listener for testing
      });
      
      store.removeAllEventListeners('test');
      expect(store.getEventListenerCount('test')).to.equal(0);
    });
  });
});

describe('PersistenceMiddleware', () => {
  let middleware;
  const testFilePath = 'test-state.json';

  beforeEach(() => {
    middleware = new PersistenceMiddleware(testFilePath);
  });

  afterEach(async () => {
    try {
      await fs.unlink(testFilePath);
    } catch (_error) {
      // Ignore file not found errors
    }
  });

  describe('Basic Operations', () => {
    it('should save and load state correctly', async () => {
      const testState = { count: 1, name: 'test' };
      
      const saveResult = await middleware.saveState(testState);
      expect(saveResult).to.be.true;
      
      const loadedState = await middleware.loadState();
      expect(loadedState).to.deep.equal(testState);
    });

    it('should handle file operations', async () => {
      const testState = { count: 1 };
      await middleware.saveState(testState);
      
      const fileExists = await middleware.fileExists();
      expect(fileExists).to.be.true;
      
      const fileInfo = await middleware.getFileInfo();
      expect(fileInfo.path).to.equal(testFilePath);
      expect(fileInfo.size).to.be.greaterThan(0);
    });

    it('should handle file renaming', async () => {
      const testState = { count: 1 };
      await middleware.saveState(testState);
      
      const newPath = 'renamed-state.json';
      const renameResult = await middleware.renameFile(newPath);
      expect(renameResult).to.be.true;
      
      const fileExists = await middleware.fileExists();
      expect(fileExists).to.be.true;
      
      try {
        await fs.unlink(newPath);
      } catch (_error) {
        // Ignore file not found errors
      }
    });

    it('should handle file deletion', async () => {
      const testState = { count: 1 };
      await middleware.saveState(testState);
      
      const deleteResult = await middleware.deleteFile();
      expect(deleteResult).to.be.true;
      
      const fileExists = await middleware.fileExists();
      expect(fileExists).to.be.false;
    });
  });

  describe('Configuration', () => {
    it('should handle custom options', () => {
      const customOptions = { spaces: 4, fileType: 'json', version: 2 };
      const customMiddleware = new PersistenceMiddleware('custom.json', customOptions);
      
      expect(customMiddleware.getOptions()).to.deep.equal(customOptions);
    });

    it('should update options', () => {
      middleware.setOptions({ spaces: 4 });
      expect(middleware.getOptions().spaces).to.equal(4);
    });

    it('should handle versioning', () => {
      expect(middleware.getVersion()).to.equal(1);
      middleware.incrementVersion();
      expect(middleware.getVersion()).to.equal(2);
    });
  });

  describe('Validation', () => {
    it('should validate state objects', async () => {
      const validState = { count: 1 };
      const invalidState = { circular: null };
      invalidState.circular = invalidState;
      
      const validResult = await middleware.validateState(validState);
      expect(validResult).to.be.true;
      
      const invalidResult = await middleware.validateState(invalidState);
      expect(invalidResult).to.be.false;
    });

    it('should save with validation', async () => {
      const testState = { count: 1 };
      const result = await middleware.saveStateWithValidation(testState);
      expect(result).to.be.true;
    });
  });

  describe('Backup Operations', () => {
    it('should create and restore backups', async () => {
      const testState = { count: 1 };
      await middleware.saveState(testState);
      
      const backupResult = await middleware.backupState(testState);
      expect(backupResult).to.be.true;
      
      await middleware.deleteFile();
      const restoredState = await middleware.restoreFromBackup();
      expect(restoredState).to.deep.equal(testState);
      
      try {
        await fs.unlink(`${testFilePath}.backup`);
      } catch (_error) {
        // Ignore file not found errors
      }
    });
  });

  describe('File Operations', () => {
    it('should handle file size operations', async () => {
      const testState = { count: 1 };
      await middleware.saveState(testState);
      
      const size = await middleware.getFileSize();
      expect(size).to.be.greaterThan(0);
      
      const isEmpty = await middleware.isFileEmpty();
      expect(isEmpty).to.be.false;
    });

    it('should handle file truncation', async () => {
      const testState = { count: 1 };
      await middleware.saveState(testState);
      
      const truncateResult = await middleware.truncateFile();
      expect(truncateResult).to.be.true;
      
      const isEmpty = await middleware.isFileEmpty();
      expect(isEmpty).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      const invalidPath = '/invalid/path/state.json';
      const invalidMiddleware = new PersistenceMiddleware(invalidPath);
      
      const result = await invalidMiddleware.saveState({ count: 1 });
      expect(result).to.be.false;
    });

    it('should handle load errors gracefully', async () => {
      const result = await middleware.loadState();
      expect(result).to.be.null;
    });
  });
});
