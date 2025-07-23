# 1cbyc State Management

A sophisticated state management library for complex web applications with advanced features including middleware support, persistence, undo/redo functionality, and event-driven architecture.

## Features

- **Advanced State Management**: Robust state handling with deep cloning and comparison
- **Middleware System**: Extensible middleware architecture for custom logic
- **Event System**: Custom event handling and state change subscriptions
- **Undo/Redo**: Complete state history management with undo/redo capabilities
- **Persistence**: Local storage and file-based state persistence
- **Performance Optimizations**: Debouncing, batch updates, and memory management
- **Error Handling**: Comprehensive error handling with custom error handlers
- **TypeScript Ready**: Full TypeScript support (coming soon)

## Installation

```bash
npm install 1cbyc-state-management
```

## Quick Start

```javascript
import { StateManager, PersistenceMiddleware } from '1cbyc-state-management';

const store = new StateManager({ count: 0, user: null });

store.subscribe((state) => {
  console.log('State updated:', state);
});

store.setState({ count: 1, user: { name: 'John' } });
```

## Core Concepts

### StateManager

The main state management class that handles all state operations.

```javascript
const store = new StateManager(initialState);
```

#### Basic State Operations

```javascript
// Get current state
const state = store.getState();

// Set new state
store.setState({ count: 1, name: 'test' });

// Merge partial state
store.mergeState({ count: 2 });

// Patch state with middleware processing
store.patchState({ name: 'updated' });
```

#### Subscription System

```javascript
// Subscribe to state changes
const unsubscribe = store.subscribe((state) => {
  console.log('State changed:', state);
});

// Unsubscribe when done
unsubscribe();
```

#### Event System

```javascript
// Listen for custom events
const unsubscribe = store.on('userLogin', (userData) => {
  console.log('User logged in:', userData);
});

// Trigger custom events
store.triggerEvent('userLogin', { userId: 123, name: 'John' });

// Unsubscribe from events
unsubscribe();
```

#### Undo/Redo Functionality

```javascript
// Make state changes
store.setState({ count: 1 });
store.setState({ count: 2 });
store.setState({ count: 3 });

// Undo last change
store.undo(); // count: 2

// Redo change
store.redo(); // count: 3

// Check stack sizes
console.log('Undo stack size:', store.getUndoStackSize());
console.log('Redo stack size:', store.getRedoStackSize());

// Clear history
store.clearHistory();
```

#### Middleware System

```javascript
// Create middleware
const loggingMiddleware = (prevState, nextState) => {
  console.log('State transition:', { prevState, nextState });
};

const validationMiddleware = (prevState, nextState) => {
  if (nextState.count < 0) {
    throw new Error('Count cannot be negative');
  }
};

// Apply middleware
store.applyMiddleware(loggingMiddleware);
store.applyMiddleware(validationMiddleware);

// Async middleware
const asyncMiddleware = async (prevState, nextState) => {
  await fetch('/api/log-state', {
    method: 'POST',
    body: JSON.stringify({ prevState, nextState })
  });
};

store.applyMiddleware(asyncMiddleware);
```

#### Performance Features

```javascript
// Debounced state updates
store.setDebounce(300);
store.setState({ count: 1 }, true, true); // Debounced update

// Batch updates
store.startBatchUpdate();
store.queueBatchUpdate({ count: 1 });
store.queueBatchUpdate({ name: 'test' });
store.endBatchUpdate(); // Single notification

// Deep state comparison
store.enableDeepStateComparison();
store.setState({ nested: { value: 1 } });
```

#### Error Handling

```javascript
// Set custom error handler
store.setErrorHandler((error) => {
  console.error('Store error:', error);
  // Send to error reporting service
});

// Handle errors gracefully
try {
  store.setState(invalidState);
} catch (error) {
  // Error is handled by error handler
}
```

#### Utility Methods

```javascript
// Get state snapshot
const snapshot = store.getStateSnapshot();
console.log('Store info:', snapshot);

// Remove all listeners
store.removeAllListeners();

// Remove all event listeners
store.removeAllEventListeners('userLogin');

// Remove all middleware
store.removeAllMiddlewares();

// Enable/disable specific middleware
store.disableMiddleware(0);
store.enableMiddleware(0);
```

### PersistenceMiddleware

A specialized middleware for file-based state persistence.

```javascript
const persistenceMiddleware = new PersistenceMiddleware('state.json', {
  spaces: 2,
  fileType: 'json',
  version: 1
});
```

#### Basic Operations

```javascript
// Save state to file
await persistenceMiddleware.saveState({ count: 1, name: 'test' });

// Load state from file
const state = await persistenceMiddleware.loadState();

// Check if file exists
const exists = await persistenceMiddleware.fileExists();

// Get file information
const fileInfo = await persistenceMiddleware.getFileInfo();
```

#### File Management

```javascript
// Rename file
await persistenceMiddleware.renameFile('new-state.json');

// Delete file
await persistenceMiddleware.deleteFile();

// Get file size
const size = await persistenceMiddleware.getFileSize();

// Check if file is empty
const isEmpty = await persistenceMiddleware.isFileEmpty();
```

#### Backup Operations

```javascript
// Create backup
await persistenceMiddleware.backupState(currentState);

// Restore from backup
const restoredState = await persistenceMiddleware.restoreFromBackup();
```

#### Validation

```javascript
// Validate state before saving
const isValid = await persistenceMiddleware.validateState(state);

// Save with validation
await persistenceMiddleware.saveStateWithValidation(state);

// Load with validation
const validState = await persistenceMiddleware.loadStateWithValidation();
```

#### Configuration

```javascript
// Update options
persistenceMiddleware.setOptions({ spaces: 4 });

// Set file type
persistenceMiddleware.setFileType('json');

// Set JSON formatting
persistenceMiddleware.setJsonFormatting(4);

// Version management
persistenceMiddleware.incrementVersion();
const version = persistenceMiddleware.getVersion();
```

## Advanced Usage

### Integration with React

```javascript
import React, { useEffect, useState } from 'react';
import { StateManager } from '1cbyc-state-management';

const store = new StateManager({ count: 0 });

function Counter() {
  const [state, setState] = useState(store.getState());

  useEffect(() => {
    const unsubscribe = store.subscribe(setState);
    return unsubscribe;
  }, []);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => store.setState({ count: state.count + 1 })}>
        Increment
      </button>
      <button onClick={() => store.undo()}>Undo</button>
      <button onClick={() => store.redo()}>Redo</button>
    </div>
  );
}
```

### Integration with Vue

```javascript
import { reactive } from 'vue';
import { StateManager } from '1cbyc-state-management';

const store = new StateManager({ count: 0 });

export default {
  setup() {
    const state = reactive(store.getState());

    store.subscribe((newState) => {
      Object.assign(state, newState);
    });

    return {
      state,
      increment: () => store.setState({ count: state.count + 1 }),
      undo: () => store.undo(),
      redo: () => store.redo()
    };
  }
};
```

### Complex State Management

```javascript
const store = new StateManager({
  user: null,
  posts: [],
  loading: false,
  errors: []
});

// User actions
const userActions = {
  login: (userData) => store.setState({ user: userData }),
  logout: () => store.setState({ user: null }),
  updateProfile: (updates) => store.mergeState({ user: { ...store.getState().user, ...updates } })
};

// Post actions
const postActions = {
  setPosts: (posts) => store.setState({ posts }),
  addPost: (post) => store.mergeState({ posts: [...store.getState().posts, post] }),
  updatePost: (id, updates) => {
    const posts = store.getState().posts.map(post => 
      post.id === id ? { ...post, ...updates } : post
    );
    store.setState({ posts });
  }
};

// UI actions
const uiActions = {
  setLoading: (loading) => store.setState({ loading }),
  addError: (error) => store.mergeState({ errors: [...store.getState().errors, error] }),
  clearErrors: () => store.setState({ errors: [] })
};
```

### Custom Middleware

```javascript
// Authentication middleware
const authMiddleware = (prevState, nextState) => {
  if (nextState.user && !prevState.user) {
    // User logged in
    localStorage.setItem('authToken', nextState.user.token);
  } else if (!nextState.user && prevState.user) {
    // User logged out
    localStorage.removeItem('authToken');
  }
};

// Analytics middleware
const analyticsMiddleware = (prevState, nextState) => {
  if (nextState.page !== prevState.page) {
    // Track page change
    analytics.track('page_view', { page: nextState.page });
  }
};

// Validation middleware
const validationMiddleware = (prevState, nextState) => {
  if (nextState.count < 0) {
    throw new Error('Count cannot be negative');
  }
  
  if (nextState.user && !nextState.user.email) {
    throw new Error('User must have an email');
  }
};

store.applyMiddleware(authMiddleware);
store.applyMiddleware(analyticsMiddleware);
store.applyMiddleware(validationMiddleware);
```

## API Reference

### StateManager

#### Constructor
- `new StateManager(initialState?: object)`

#### State Methods
- `getState(): object`
- `setState(newState: object, addToUndoStack?: boolean, debounce?: boolean): void`
- `mergeState(partialState: object): void`
- `patchState(partialState: object): void`
- `resetState(): void`

#### Subscription Methods
- `subscribe(listener: function): function`
- `on(eventName: string, callback: function): function`
- `triggerEvent(eventName: string, eventData: any): void`

#### History Methods
- `undo(): void`
- `redo(): void`
- `getUndoStackSize(): number`
- `getRedoStackSize(): number`
- `clearHistory(): void`

#### Middleware Methods
- `applyMiddleware(middleware: function, options?: object): void`
- `getMiddlewareCount(): number`
- `enableMiddleware(index: number): void`
- `disableMiddleware(index: number): void`
- `removeAllMiddlewares(): void`

#### Performance Methods
- `setDebounce(delay: number): void`
- `startBatchUpdate(): void`
- `endBatchUpdate(): void`
- `queueBatchUpdate(partialState: object): void`

#### Configuration Methods
- `enableDeepStateComparison(): void`
- `disableDeepStateComparison(): void`
- `setLocalStorageKey(key: string): void`
- `setErrorHandler(handler: function): void`

#### Utility Methods
- `getStateSnapshot(): object`
- `getListenerCount(): number`
- `getEventListenerCount(eventName: string): number`
- `removeAllListeners(): void`
- `removeAllEventListeners(eventName?: string): void`

### PersistenceMiddleware

#### Constructor
- `new PersistenceMiddleware(filePath?: string, options?: object)`

#### File Operations
- `saveState(state: object): Promise<boolean>`
- `loadState(): Promise<object|null>`
- `fileExists(filePath?: string): Promise<boolean>`
- `getFileInfo(): Promise<object|null>`
- `getFileSize(): Promise<number>`
- `isFileEmpty(): Promise<boolean>`

#### File Management
- `renameFile(newFilePath: string): Promise<boolean>`
- `deleteFile(): Promise<boolean>`
- `truncateFile(): Promise<boolean>`
- `appendToFile(content: string): Promise<boolean>`

#### Backup Operations
- `backupState(state: object): Promise<boolean>`
- `restoreFromBackup(): Promise<object|null>`

#### Validation
- `validateState(state: object): Promise<boolean>`
- `saveStateWithValidation(state: object): Promise<boolean>`
- `loadStateWithValidation(): Promise<object|null>`

#### Configuration
- `setOptions(options: object): void`
- `getOptions(): object`
- `setFileType(fileType: string): void`
- `setJsonFormatting(spaces: number): void`
- `incrementVersion(): void`
- `getVersion(): number`
- `setFilePath(filePath: string): void`
- `getFilePath(): string`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/1cbyc/1cbyc-state-management/issues)
- **Documentation**: [GitHub Wiki](https://github.com/1cbyc/1cbyc-state-management/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/1cbyc/1cbyc-state-management/discussions)

## Roadmap

See [docs/whats-next.md](docs/whats-next.md) for detailed roadmap and upcoming features.