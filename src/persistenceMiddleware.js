import { promises as fs } from 'fs';

class PersistenceMiddleware {
  constructor(
    filePath = 'state.json',
    options = { spaces: 2, fileType: 'json', version: 1 }
  ) {
    this.filePath = filePath;
    this.options = { ...options };
  }

  async saveState(state) {
    try {
      const { spaces, fileType } = this.options;
      const serializedState =
        fileType === 'json'
          ? JSON.stringify(state, null, spaces)
          : state.toString();

      await fs.writeFile(this.filePath, serializedState);
      return true;
    } catch (err) {
      console.error('PersistenceMiddleware: Error saving state:', err.message);
      return false;
    }
  }

  async loadState() {
    try {
      const fileContent = await fs.readFile(this.filePath, 'utf-8');
      return this.parseFileContent(fileContent);
    } catch (err) {
      console.error('PersistenceMiddleware: Error loading state:', err.message);
      return null;
    }
  }

  async persistState(prevState, nextState) {
    return await this.saveState(nextState);
  }

  parseFileContent(content) {
    try {
      const { fileType } = this.options;
      return fileType === 'json' ? JSON.parse(content) : content;
    } catch (err) {
      console.error(
        'PersistenceMiddleware: Error parsing file content:',
        err.message
      );
      return null;
    }
  }

  async renameFile(newFilePath) {
    try {
      await fs.rename(this.filePath, newFilePath);
      this.filePath = newFilePath;
      return true;
    } catch (err) {
      console.error('PersistenceMiddleware: Error renaming file:', err.message);
      return false;
    }
  }

  async deleteFile() {
    try {
      await fs.unlink(this.filePath);
      return true;
    } catch (err) {
      console.error('PersistenceMiddleware: Error deleting file:', err.message);
      return false;
    }
  }

  async getFileInfo() {
    try {
      const stats = await fs.stat(this.filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        path: this.filePath,
        options: this.options,
      };
    } catch (err) {
      console.error(
        'PersistenceMiddleware: Error getting file info:',
        err.message
      );
      return null;
    }
  }

  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  setFileType(fileType) {
    this.options.fileType = fileType;
  }

  setJsonFormatting(spaces) {
    this.options.spaces = spaces;
  }

  incrementVersion() {
    this.options.version += 1;
  }

  getVersion() {
    return this.options.version;
  }

  setFilePath(filePath) {
    this.filePath = filePath;
  }

  getFilePath() {
    return this.filePath;
  }

  async backupState(state) {
    const backupPath = `${this.filePath}.backup`;
    try {
      await this.saveState(state);
      await fs.copyFile(this.filePath, backupPath);
      return true;
    } catch (err) {
      console.error(
        'PersistenceMiddleware: Error creating backup:',
        err.message
      );
      return false;
    }
  }

  async restoreFromBackup() {
    const backupPath = `${this.filePath}.backup`;
    try {
      if (await this.fileExists(backupPath)) {
        await fs.copyFile(backupPath, this.filePath);
        return await this.loadState();
      }
      return null;
    } catch (err) {
      console.error(
        'PersistenceMiddleware: Error restoring from backup:',
        err.message
      );
      return null;
    }
  }

  async fileExists(filePath = this.filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async validateState(state) {
    try {
      const serialized = JSON.stringify(state);
      JSON.parse(serialized);
      return true;
    } catch (err) {
      console.error(
        'PersistenceMiddleware: Invalid state object:',
        err.message
      );
      return false;
    }
  }

  async saveStateWithValidation(state) {
    if (await this.validateState(state)) {
      return await this.saveState(state);
    }
    return false;
  }

  async loadStateWithValidation() {
    const state = await this.loadState();
    if (state && (await this.validateState(state))) {
      return state;
    }
    return null;
  }

  getOptions() {
    return { ...this.options };
  }

  async getFileSize() {
    try {
      const stats = await fs.stat(this.filePath);
      return stats.size;
    } catch (err) {
      console.error(
        'PersistenceMiddleware: Error getting file size:',
        err.message
      );
      return 0;
    }
  }

  async isFileEmpty() {
    const size = await this.getFileSize();
    return size === 0;
  }

  async truncateFile() {
    try {
      await fs.truncate(this.filePath, 0);
      return true;
    } catch (err) {
      console.error(
        'PersistenceMiddleware: Error truncating file:',
        err.message
      );
      return false;
    }
  }

  async appendToFile(content) {
    try {
      await fs.appendFile(this.filePath, content);
      return true;
    } catch (err) {
      console.error(
        'PersistenceMiddleware: Error appending to file:',
        err.message
      );
      return false;
    }
  }

  async readFileChunk(start, end) {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return content.substring(start, end);
    } catch (err) {
      console.error(
        'PersistenceMiddleware: Error reading file chunk:',
        err.message
      );
      return null;
    }
  }

  async writeFileChunk(content, position) {
    try {
      const fileContent = await fs.readFile(this.filePath, 'utf-8');
      const newContent =
        fileContent.substring(0, position) +
        content +
        fileContent.substring(position);
      await fs.writeFile(this.filePath, newContent);
      return true;
    } catch (err) {
      console.error(
        'PersistenceMiddleware: Error writing file chunk:',
        err.message
      );
      return false;
    }
  }
}

export default PersistenceMiddleware;
