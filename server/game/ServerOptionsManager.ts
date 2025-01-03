import { useLog } from '~/composables/useLog';

const log = useLog('ServerOptionsManager');

let optionsManagerInstance: ServerOptionsManager | null = null;

export function useServerOptions(): ServerOptionsManager {
  if (!optionsManagerInstance) {
    optionsManagerInstance = new ServerOptionsManager();
  }
  return optionsManagerInstance;
}

export class ServerOptionsManager {
  private storage = useStorage('server-options');
  private options: { gameActive: boolean } = { gameActive: true };

  constructor() {
    this.loadOptions();
  }

  private async loadOptions() {
    try {
      const savedOptions = await this.storage.getItem('options.json') as { gameActive: boolean } | null;
      if (savedOptions) {
        this.options = savedOptions;
      }
    } catch (e: any) {
      log.error({ _ctx: { error: e.message } }, 'Error loading server options');
    }
  }

  private async saveOptions() {
    try {
      await this.storage.setItem('options.json', this.options);
    } catch (e: any) {
      log.error({ _ctx: { error: e.message } }, 'Error saving server options');
    }
  }

  public isGameActive(): boolean {
    return this.options.gameActive;
  }

  public async setGameActive(active: boolean): Promise<void> {
    this.options.gameActive = active;
    await this.saveOptions();
  }
}
